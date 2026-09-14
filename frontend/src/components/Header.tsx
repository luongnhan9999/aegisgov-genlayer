import React, { useState } from 'react';
import { Shield, Wallet, Cpu, CheckCircle2, Copy } from 'lucide-react';
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
    <header className="border-b border-slate-800/80 bg-[#0c1222]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Protocol Tag */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  Aegis<span className="text-cyan-400">Gov</span>
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-full">
                  Safe-Harbor Protocol
                </span>
              </div>
              <p className="text-xs text-slate-400">Real-Time Autonomous AI Governance on GenLayer</p>
            </div>
          </div>

          <div className="md:hidden">
            {account ? (
              <div className="flex flex-col items-end text-right">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">{walletBalance}</span>
                <span className="px-2 py-0.5 text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                  {shortenAddress(account)}
                </span>
              </div>
            ) : (
              <button
                onClick={onConnectWallet}
                disabled={isConnecting}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 transition shadow-sm"
              >
                Connect
              </button>
            )}
          </div>
        </div>

        {/* Center: Network and Contract Info */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Network Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/60 text-slate-300 shadow-inner">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium text-slate-200">GenLayer Studionet</span>
            <span className="text-slate-500 font-mono">(61999)</span>
          </div>

          {/* Contract Address Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/60 text-slate-300">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-slate-400">Contract:</span>
            {isEditingContract ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempAddress}
                  onChange={(e) => setTempAddress(e.target.value)}
                  placeholder="0x..."
                  className="bg-slate-950 border border-cyan-500/50 rounded px-1.5 py-0.5 text-cyan-300 font-mono text-[11px] focus:outline-none w-44"
                />
                <button
                  onClick={handleSaveContract}
                  className="text-[10px] bg-cyan-600 text-white px-2 py-0.5 rounded hover:bg-cyan-500"
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
                <span className="font-mono text-cyan-300">
                  {contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000'
                    ? shortenAddress(contractAddress, 4)
                    : 'Not Configured (Click Edit)'}
                </span>
                {contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000' && (
                  <button
                    onClick={handleCopy}
                    title="Copy contract address"
                    className="text-slate-400 hover:text-slate-200"
                  >
                    {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                )}
                <button
                  onClick={() => {
                    setTempAddress(contractAddress);
                    setIsEditingContract(true);
                  }}
                  className="text-[10px] text-slate-400 hover:text-cyan-400 underline ml-0.5"
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
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-1.5 shadow-sm">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">Studionet Balance</span>
                <span className="font-mono text-xs font-bold text-cyan-400">{walletBalance}</span>
              </div>
              <div className="h-7 w-[1px] bg-slate-800"></div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-400 font-medium">MetaMask</span>
                  <span className="font-mono text-xs text-slate-200">{shortenAddress(account, 5)}</span>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={onConnectWallet}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-cyan-500/25 transition disabled:opacity-50"
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
