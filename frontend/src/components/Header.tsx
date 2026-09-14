import React, { useState } from 'react';
import { Shield, Wallet, Cpu, CheckCircle2, Copy, Sparkles, Scale } from 'lucide-react';
import { shortenAddress } from '../utils/format';

interface HeaderProps {
  account: string;
  walletBalance: string;
  isConnecting: boolean;
  onConnectWallet: () => void;
  contractAddress: string;
  onUpdateContractAddress: (address: string) => void;
  network: string;
}

export const Header: React.FC<HeaderProps> = ({
  account,
  walletBalance,
  isConnecting,
  onConnectWallet,
  contractAddress,
  onUpdateContractAddress,
  network,
}) => {
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [tempAddress, setTempAddress] = useState(contractAddress);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveContract = () => {
    onUpdateContractAddress(tempAddress.trim());
    setIsEditingContract(false);
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

          {/* Mobile Connect */}
          <div className="md:hidden">
            {account ? (
              <div className="flex flex-col items-end text-right">
                <span className="text-[10px] font-mono text-amber-400 font-bold">{walletBalance}</span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg">
                  {shortenAddress(account)}
                </span>
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
                    onClick={handleCopy}
                    title="Copy contract address"
                    className="text-slate-400 hover:text-amber-400 transition"
                  >
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
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

        {/* Right: Wallet Connection & Real Balance */}
        <div className="hidden md:flex items-center gap-3">
          {account ? (
            <div className="flex items-center gap-3 bg-slate-950 border border-amber-500/20 rounded-xl px-4 py-1.5 shadow-md">
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Studionet Balance</span>
                <span className="font-mono text-xs font-bold text-amber-300">{walletBalance}</span>
              </div>
              <div className="h-7 w-[1px] bg-slate-800"></div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Signer</span>
                  <span className="font-mono text-xs text-slate-200">{shortenAddress(account, 4)}</span>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={onConnectWallet}
              disabled={isConnecting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
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
