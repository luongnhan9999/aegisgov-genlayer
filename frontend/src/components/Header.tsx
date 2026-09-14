import React, { useState, useRef, useEffect } from 'react';
import { 
  Shield, Wallet, Cpu, CheckCircle2, Copy, Sparkles, Scale, 
  LogOut, ChevronDown, RefreshCw, ExternalLink, Check
} from 'lucide-react';
import { shortenAddress } from '../utils/format';

interface HeaderProps {
  account: string;
  walletBalance: string;
  isConnecting: boolean;
  onConnectWallet: () => void;
  onDisconnectWallet?: () => void;
  onRefreshBalance?: () => void;
  contractAddress: string;
  onUpdateContractAddress: (address: string) => void;
  network: string;
}

export const Header: React.FC<HeaderProps> = ({
  account,
  walletBalance,
  isConnecting,
  onConnectWallet,
  onDisconnectWallet,
  onRefreshBalance,
  contractAddress,
  onUpdateContractAddress,
  network,
}) => {
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [tempAddress, setTempAddress] = useState(contractAddress);
  const [copiedContract, setCopiedContract] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const walletMenuRef = useRef<HTMLDivElement>(null);

  // Click outside to close wallet menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(event.target as Node)) {
        setIsWalletMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyContract = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  const handleCopyAccount = () => {
    if (!account) return;
    navigator.clipboard.writeText(account);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleSaveContract = () => {
    onUpdateContractAddress(tempAddress.trim());
    setIsEditingContract(false);
  };

  const handleManualRefresh = () => {
    if (onRefreshBalance) {
      setIsRefreshing(true);
      onRefreshBalance();
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  return (
    <header className="border-b border-amber-500/20 bg-[#07090e]/95 backdrop-blur-xl sticky top-0 z-40 shadow-2xl">
      {/* Top subtle gold accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-500/60 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Protocol Identity */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="h-11 w-11 rounded-xl overflow-hidden border border-amber-500/40 shadow-lg shadow-amber-500/10 group-hover:border-amber-400 transition">
                <img
                  src="/aegisgov_emblem.jpg"
                  alt="AegisGov Seal"
                  className="h-full w-full object-cover object-center"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-wider font-cinzel text-white flex items-center gap-1.5">
                  AEGIS<span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">GOV</span>
                </h1>
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-md font-mono">
                  Safe-Harbor Court
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Autonomous AI Constitutional Governance on GenLayer</p>
            </div>
          </div>

          {/* Mobile Connect & Disconnect */}
          <div className="md:hidden flex items-center gap-2">
            {account ? (
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end text-right">
                  <span className="text-[10px] font-mono text-amber-400 font-bold">{walletBalance}</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg">
                    {shortenAddress(account, 4)}
                  </span>
                </div>
                {onDisconnectWallet && (
                  <button
                    onClick={onDisconnectWallet}
                    title="Disconnect Wallet"
                    className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-400 hover:text-white hover:bg-rose-900 transition"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onConnectWallet}
                disabled={isConnecting}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-sans shadow-md"
              >
                Connect
              </button>
            )}
          </div>
        </div>

        {/* Center: Network and Contract Info */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Network Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-amber-500/20 text-slate-300 shadow-inner">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-slate-200">Studionet</span>
            <span className="text-amber-400/80 font-mono text-[11px]">(Chain 61999)</span>
          </div>

          {/* Contract Address Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300">
            <Scale className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-slate-400">Court Docket:</span>
            {isEditingContract ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempAddress}
                  onChange={(e) => setTempAddress(e.target.value)}
                  placeholder="0x..."
                  className="bg-slate-900 border border-amber-500/50 rounded px-1.5 py-0.5 text-amber-300 font-mono text-[11px] focus:outline-none w-44"
                />
                <button
                  onClick={handleSaveContract}
                  className="text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded hover:bg-amber-400"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingContract(false)}
                  className="text-[10px] text-slate-400 px-1 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-amber-300">
                  {contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000'
                    ? shortenAddress(contractAddress, 4)
                    : 'Not Configured (Click Edit)'}
                </span>
                {contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000' && (
                  <button
                    onClick={handleCopyContract}
                    title="Copy contract address"
                    className="text-slate-400 hover:text-amber-400 transition"
                  >
                    {copiedContract ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
                <button
                  onClick={() => {
                    setTempAddress(contractAddress);
                    setIsEditingContract(true);
                  }}
                  className="text-[10px] text-amber-400/80 hover:text-amber-300 underline ml-0.5"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Wallet Connection & Interactive Popover */}
        <div className="hidden md:flex items-center gap-3">
          {account ? (
            <div className="relative" ref={walletMenuRef}>
              <button
                onClick={() => setIsWalletMenuOpen(!isWalletMenuOpen)}
                className="flex items-center gap-3 bg-slate-950 hover:bg-slate-900 border border-amber-500/30 hover:border-amber-500/60 rounded-xl px-4 py-1.5 shadow-lg transition text-left cursor-pointer group"
              >
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Studionet Balance</span>
                  <span className="font-mono text-xs font-bold text-amber-300">{walletBalance}</span>
                </div>
                <div className="h-7 w-[1px] bg-slate-800"></div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Signer</span>
                    <span className="font-mono text-xs text-slate-200">{shortenAddress(account, 4)}</span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 group-hover:text-amber-400 transition-transform ${isWalletMenuOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Wallet Dropdown Menu */}
              {isWalletMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0a0d16] border border-amber-500/30 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-amber-400" />
                      <span className="font-cinzel text-xs font-bold text-white tracking-wider">Connected Signer</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Studionet
                    </span>
                  </div>

                  {/* Address with Copy */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Full Address</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-[11px] text-slate-200 truncate mr-2" title={account}>
                        {account}
                      </span>
                      <button
                        onClick={handleCopyAccount}
                        className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition shrink-0"
                        title="Copy full address"
                      >
                        {copiedAccount ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Real Balance with Refresh */}
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Real-Time Balance</span>
                      <span className="font-mono text-sm font-bold text-amber-300">{walletBalance}</span>
                    </div>
                    {onRefreshBalance && (
                      <button
                        onClick={handleManualRefresh}
                        className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition border border-slate-800"
                        title="Refresh balance from Studionet RPC"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
                      </button>
                    )}
                  </div>

                  {/* Links & Actions */}
                  <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-800">
                    <a
                      href={`https://studio.genlayer.com`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-900 transition font-medium"
                    >
                      <span className="flex items-center gap-2">
                        <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
                        GenLayer Studio Explorer
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Chain 61999</span>
                    </a>

                    {onDisconnectWallet && (
                      <button
                        onClick={() => {
                          setIsWalletMenuOpen(false);
                          onDisconnectWallet();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 transition cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Disconnect Wallet
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onConnectWallet}
              disabled={isConnecting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              <Wallet className="h-4 w-4" />
              {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
