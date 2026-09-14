import React from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, Cpu, X, Check } from 'lucide-react';

interface ConsensusProgressModalProps {
  isOpen: boolean;
  stage: string;
  txHash?: string;
  error?: string | null;
  onClose: () => void;
}

export const ConsensusProgressModal: React.FC<ConsensusProgressModalProps> = ({
  isOpen,
  stage,
  txHash,
  error,
  onClose,
}) => {
  if (!isOpen) return null;

  const isFailed = !!error;
  const isComplete = !isFailed && (
    Boolean(txHash) ||
    stage.toLowerCase().includes('finalized') ||
    stage.toLowerCase().includes('completed') ||
    stage.toLowerCase().includes('successfully') ||
    stage.toLowerCase().includes('docketed') ||
    stage.toLowerCase().includes('withdrawn') ||
    stage.toLowerCase().includes('disbursed') ||
    stage.toLowerCase().includes('reclaimed')
  );

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget && (isComplete || isFailed)) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-[#0c101a] border border-amber-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-200">
        {/* Top-Right Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
          title="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center py-2">
          {/* Status Icon */}
          <div className="mx-auto mb-4 flex items-center justify-center">
            {isFailed ? (
              <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/10">
                <AlertCircle className="h-8 w-8" />
              </div>
            ) : isComplete ? (
              <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20 animate-in zoom-in-90 duration-300">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
                <RefreshCw className="h-8 w-8 animate-spin text-amber-400" />
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-xl font-extrabold font-cinzel text-white tracking-wide">
            {isFailed
              ? 'Transaction Reverted'
              : isComplete
              ? 'Consensus Finalized On-Chain'
              : 'GenLayer Validator Consensus'}
          </h3>

          {/* Stage / Description */}
          <p className="text-xs text-slate-300 mt-2 font-mono px-2 leading-relaxed">
            {error ? error : stage}
          </p>

          {/* Node Consensus Visualization (only while processing) */}
          {!isFailed && !isComplete && (
            <div className="mt-6 p-4 rounded-2xl bg-slate-950/80 border border-amber-500/20 text-xs shadow-inner">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-3">
                <span className="flex items-center gap-1.5 font-bold">
                  <Cpu className="h-3.5 w-3.5 text-amber-400" />
                  Validator Quorum
                </span>
                <span className="font-mono text-amber-400 font-bold">Studionet Consensus</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block mr-1.5 animate-pulse"></span>
                  Leader Node
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/20 text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block mr-1.5 animate-pulse"></span>
                  Validator A
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/20 text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block mr-1.5 animate-pulse"></span>
                  Validator B
                </div>
              </div>
            </div>
          )}

          {/* Transaction Hash & Explorer Link */}
          {txHash && (
            <div className="mt-5 pt-4 border-t border-slate-800/80 text-left bg-slate-950/50 p-3 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-400 font-medium">On-Chain Transaction Hash:</span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <Check className="h-3 w-3" /> Confirmed
                </span>
              </div>
              <a
                href={`https://genlayer-explorer.vercel.app/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1.5 break-all"
              >
                <span>{txHash}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-2">
            {(isComplete || isFailed) ? (
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-extrabold shadow-xl shadow-amber-500/25 transition cursor-pointer"
              >
                Close & View Judicial Cases
              </button>
            ) : (
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono transition cursor-pointer border border-slate-800"
              >
                Run in Background / Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
