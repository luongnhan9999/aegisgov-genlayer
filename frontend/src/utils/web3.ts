import { studionet } from 'genlayer-js/chains';

// EIP-1193 Ethereum Provider Interface
export interface EthereumProvider {
  request: (args: { method: string; params?: any[] | object }) => Promise<any>;
  on: (eventName: string, handler: (...args: any[]) => void) => void;
  removeListener: (eventName: string, handler: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

// Derive Studionet Chain ID directly from genlayer-js/chains (61999 = 0xF1EF)
export const STUDIONET_CHAIN_ID_NUM = studionet.id || 61999;
export const STUDIONET_CHAIN_ID_HEX = '0x' + STUDIONET_CHAIN_ID_NUM.toString(16);

export const STUDIONET_CHAIN_CONFIG = {
  chainId: STUDIONET_CHAIN_ID_HEX,
  chainName: 'Genlayer Studio Network',
  nativeCurrency: {
    name: 'GEN Token',
    symbol: 'GEN',
    decimals: 18,
  },
  rpcUrls: ['https://studio.genlayer.com/api'],
  blockExplorerUrls: ['https://studio.genlayer.com'],
};

const STORAGE_ACCOUNT_KEY = 'aegisgov_wallet_account';
const STORAGE_PROVIDER_KEY = 'aegisgov_wallet_provider';

/**
 * Ensure user's MetaMask is connected to GenLayer Studionet
 */
export async function ensureStudionetNetwork(): Promise<void> {
  if (typeof window === 'undefined' || !window.ethereum) return;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
    });
  } catch (switchError: any) {
    // Error code 4902 or -32603 indicates chain has not been added to MetaMask yet
    if (
      switchError.code === 4902 ||
      switchError.code === -32603 ||
      switchError?.data?.originalError?.code === 4902
    ) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [STUDIONET_CHAIN_CONFIG],
        });
      } catch (addError) {
        console.warn('Failed to add GenLayer Studionet to MetaMask:', addError);
        throw new Error('Please authorize adding GenLayer Studionet to MetaMask.');
      }
    } else {
      console.warn('Failed to switch to Studionet:', switchError);
      throw switchError;
    }
  }
}

/**
 * Format balance in Wei to GEN string
 */
export function formatGenWei(balanceWei: bigint): string {
  if (balanceWei === 0n) return '0 GEN';
  const whole = balanceWei / 1000000000000000000n;
  const remainder = balanceWei % 1000000000000000000n;
  const fractionStr = remainder.toString().padStart(18, '0');
  const fourDecimals = fractionStr.substring(0, 4);
  const formatted = `${whole}.${fourDecimals}`.replace(/\.?0+$/, '');
  
  if (whole === 0n && fourDecimals === '0000') {
    return remainder > 0n ? '< 0.0001 GEN' : '0 GEN';
  }
  return `${formatted || '0'} GEN`;
}

/**
 * Fetch real wallet balance on GenLayer Studionet
 * Directly queries Studionet RPC (https://studio.genlayer.com/api) to avoid
 * MetaMask active network mismatch, with graceful fallback to window.ethereum.
 */
export async function fetchWalletBalance(
  address: string,
  rpcUrl: string = 'https://studio.genlayer.com/api'
): Promise<string> {
  if (!address) return '0 GEN';

  // 1. Direct JSON-RPC call to GenLayer Studionet RPC
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: Date.now(),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.result !== undefined) {
        const balanceWei = BigInt(data.result || '0x0');
        return formatGenWei(balanceWei);
      }
    }
  } catch (rpcErr) {
    console.warn('Direct Studionet RPC eth_getBalance call failed, using provider fallback:', rpcErr);
  }

  // 2. Fallback to window.ethereum if direct RPC is unreachable
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      const balanceHex: string = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      const balanceWei = BigInt(balanceHex || '0x0');
      return formatGenWei(balanceWei);
    } catch (err) {
      console.warn('Failed to fetch wallet balance from provider:', err);
    }
  }

  return '0 GEN';
}

/**
 * Disconnect current wallet session and clear storage
 */
export function disconnectWalletSession(): void {
  saveWalletState('', '');
}

/**
 * Connect to MetaMask / GenLayer EIP-1193 Wallet on Studionet
 */
export async function connectMetaMaskWallet(): Promise<{ address: string; providerName: string; balance: string }> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Web3 wallet found. Please install MetaMask to interact with GenLayer Studionet.');
  }

  try {
    // 1. Ensure Studionet network is active
    await ensureStudionetNetwork();

    // 2. Request accounts
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts authorized in MetaMask.');
    }

    const providerName = window.ethereum.isMetaMask ? 'MetaMask' : 'Web3 Wallet';
    const address = accounts[0];
    const balance = await fetchWalletBalance(address);

    saveWalletState(address, providerName);
    return { address, providerName, balance };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the wallet connection request in MetaMask.');
    }
    throw new Error(error.message || 'Failed to connect to MetaMask.');
  }
}

/**
 * Auto-detect existing wallet session on load
 */
export async function autoCheckWalletConnection(): Promise<{ address: string; providerName: string; balance: string }> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return { address: '', providerName: '', balance: '0 GEN' };
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts && accounts.length > 0) {
      const providerName = window.ethereum.isMetaMask ? 'MetaMask' : 'Web3 Wallet';
      const address = accounts[0];
      const balance = await fetchWalletBalance(address);
      saveWalletState(address, providerName);
      return { address, providerName, balance };
    }
  } catch (e) {
    console.warn('Auto check wallet error:', e);
  }

  const savedAddress = localStorage.getItem(STORAGE_ACCOUNT_KEY) || '';
  const savedProvider = localStorage.getItem(STORAGE_PROVIDER_KEY) || '';
  return { address: savedAddress, providerName: savedProvider, balance: '0 GEN' };
}

export function saveWalletState(address: string, providerName: string) {
  if (typeof localStorage === 'undefined') return;
  if (address) {
    localStorage.setItem(STORAGE_ACCOUNT_KEY, address);
    localStorage.setItem(STORAGE_PROVIDER_KEY, providerName);
  } else {
    localStorage.removeItem(STORAGE_ACCOUNT_KEY);
    localStorage.removeItem(STORAGE_PROVIDER_KEY);
  }
}

export function setupWalletListeners(
  onAccountChange: (account: string) => void,
  onChainChange?: (chainId: string) => void
) {
  if (typeof window !== 'undefined' && window.ethereum) {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        saveWalletState(accounts[0], 'MetaMask');
        onAccountChange(accounts[0]);
      } else {
        saveWalletState('', '');
        onAccountChange('');
      }
    };

    const handleChainChanged = (chainId: string) => {
      if (onChainChange) onChainChange(chainId);
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }
  return () => {};
}
