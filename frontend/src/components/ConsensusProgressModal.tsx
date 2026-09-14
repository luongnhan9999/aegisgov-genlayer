import React from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, Cpu } from 'lucide-react';

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

  const isComplete = stage.includes('Finalized') || stage.includes('completed');
  const isFailed = !!error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-200">
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex items-center justify-center">
            {isFailed ? (
              <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertCircle className="h-7 w-7" />
              </div>
            ) : isComplete ? (
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <RefreshCw className="h-7 w-7 animate-spin" />
              </div>
            )}
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight">
            {isFailed
              ? 'Transaction Reverted'
              : isComplete
              ? 'Consensus Finalized On-Chain'
              : 'GenLayer Validator Consensus'}
          </h3>

          <p className="text-xs text-slate-400 mt-2 font-mono px-4">
            {error ? error : stage}
          </p>

          {/* Node Consensus Visualization */}
          {!isFailed && !isComplete && (
            <div className="mt-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-3">
                <span className="flex items-center gap-1">
                  <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                  Validator Quorum
                </span>
                <span className="font-mono text-cyan-400">Studionet Consensus</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="p-2 rounded-lg bg-slate-900 border border-cyan-500/30 text-cyan-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 inline-block mr-1 animate-pulse"></span>
                  Leader Node
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-indigo-500/30 text-indigo-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 inline-block mr-1 animate-pulse"></span>
                  Validator A
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-blue-500/30 text-blue-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block mr-1 animate-pulse"></span>
                  Validator B
                </div>
              </div>
            </div>
          )}

          {/* Transaction Link */}
          {txHash && (
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-1">Transaction Hash:</span>
              <a
                href={`https://studio.genlayer.com/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-cyan-400 hover:underline flex items-center justify-center gap-1 break-all px-2"
              >
                {txHash} <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          )}

          {(isComplete || isFailed) && (
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
