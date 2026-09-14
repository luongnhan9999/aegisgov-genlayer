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

export const STUDIONET_CHAIN_ID_HEX = '0x1048b'; // 66699 in decimal
export const STUDIONET_CHAIN_CONFIG = {
  chainId: STUDIONET_CHAIN_ID_HEX,
  chainName: 'GenLayer Studionet',
  nativeCurrency: {
    name: 'GEN',
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
    // Error code 4902 indicates chain has not been added to MetaMask
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [STUDIONET_CHAIN_CONFIG],
        });
      } catch (addError) {
        console.warn('Failed to add GenLayer Studionet to MetaMask:', addError);
      }
    } else {
      console.warn('Failed to switch to Studionet:', switchError);
    }
  }
}

/**
 * Connect to MetaMask / GenLayer Wallet
 */
export async function connectMetaMaskWallet(): Promise<{ address: string; providerName: string }> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Web3 wallet extension found. Please install MetaMask to interact on GenLayer Studionet.');
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

    saveWalletState(address, providerName);
    return { address, providerName };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the wallet connection request.');
    }
    throw new Error(error.message || 'Failed to connect to MetaMask.');
  }
}

/**
 * Auto-detect existing wallet session on load
 */
export async function autoCheckWalletConnection(): Promise<{ address: string; providerName: string }> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return { address: '', providerName: '' };
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts && accounts.length > 0) {
      const providerName = window.ethereum.isMetaMask ? 'MetaMask' : 'Web3 Wallet';
      saveWalletState(accounts[0], providerName);
      return { address: accounts[0], providerName };
    }
  } catch (e) {
    console.warn('Auto check wallet error:', e);
  }

  const savedAddress = localStorage.getItem(STORAGE_ACCOUNT_KEY) || '';
  const savedProvider = localStorage.getItem(STORAGE_PROVIDER_KEY) || '';
  return { address: savedAddress, providerName: savedProvider };
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
