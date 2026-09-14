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
 * Fetch real wallet balance on Studionet via eth_getBalance
 */
export async function fetchWalletBalance(address: string): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum || !address) return '0 GEN';
  try {
    const balanceHex: string = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });
    const balanceWei = BigInt(balanceHex || '0x0');
    const balanceGen = Number(balanceWei) / 1e18;
    if (balanceGen === 0) return '0 GEN';
    if (balanceGen < 0.0001) return '< 0.0001 GEN';
    return `${balanceGen.toFixed(4).replace(/\.?0+$/, '')} GEN`;
  } catch (err) {
    console.warn('Failed to fetch wallet balance:', err);
    return 'Connected';
  }
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
