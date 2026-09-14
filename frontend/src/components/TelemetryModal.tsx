import React, { useState } from 'react';
import { X, Bot, Hash, Sparkles, AlertCircle, ShieldAlert } from 'lucide-react';
import type { PolicyProposal } from '../types';
import { computeSha256 } from '../utils/format';

interface TelemetryModalProps {
  isOpen: boolean;
  proposal: PolicyProposal | null;
  onClose: () => void;
  onSubmit: (proposalId: string, logUrl: string, logHash: string) => Promise<void>;
  isLoading: boolean;
}

export const TelemetryModal: React.FC<TelemetryModalProps> = ({
  isOpen,
  proposal,
  onClose,
  onSubmit,
  isLoading,
}) => {
  if (!isOpen || !proposal) return null;

  const [logUrl, setLogUrl] = useState('https://raw.githubusercontent.com/luongnhan9999/aegisgov-genlayer/main/docs/telemetry/yield_agent_log.txt');
  const [logHash, setLogHash] = useState('86fab43e9f0a2207e9fa26d76f8c018fa65e7b6f6167d5524f83041714020ef1');
  const [rawLogText, setRawLogText] = useState('');
  const [isHashing, setIsHashing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleComputeHash = async () => {
    if (!rawLogText.trim()) return;
    setIsHashing(true);
    try {
      const hash = await computeSha256(rawLogText.trim());
      setLogHash(hash);
    } catch {
      setErrorMsg('Failed to compute hash');
    } finally {
      setIsHashing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (logHash.trim().length !== 64) {
      setErrorMsg('Telemetry Log Hash must be a 64-character hex SHA-256 digest.');
      return;
    }

    try {
      await onSubmit(proposal.id, logUrl.trim(), logHash.trim().toLowerCase());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Telemetry submission failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Submit Execution Telemetry</h2>
              <p className="text-xs text-slate-400">Proposal: <span className="font-mono text-cyan-300">{proposal.id}</span> ({proposal.target_agent_id})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Warning Banner */}
        <div className="mt-4 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            GenLayer validators will fetch this un-truncated telemetry off-chain, recompute SHA-256, and evaluate behavior against constitutional safe-harbor rules via LLM consensus. Any tampering results in immediate slashing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Telemetry Audit Log URL</label>
            <input
              type="url"
              value={logUrl}
              onChange={(e) => setLogUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-indigo-300 font-mono focus:border-indigo-500 focus:outline-none"
              placeholder="https://..."
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
              <Hash className="h-3.5 w-3.5 text-indigo-400" />
              Immutable SHA-256 Hash of Telemetry Log (64 hex characters)
            </label>
            <input
              type="text"
              value={logHash}
              onChange={(e) => setLogHash(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-indigo-400 font-mono text-[11px] focus:border-indigo-500 focus:outline-none"
              placeholder="64-char hex hash"
              required
            />

            <div className="mt-2 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px]">
              <div className="flex items-center justify-between mb-1 text-slate-400">
                <span>Or paste log content to compute SHA-256:</span>
                <button
                  type="button"
                  onClick={handleComputeHash}
                  disabled={!rawLogText.trim() || isHashing}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 disabled:opacity-40"
                >
                  <Sparkles className="h-3 w-3" />
                  Compute Hash
                </button>
              </div>
              <textarea
                rows={2}
                value={rawLogText}
                onChange={(e) => setRawLogText(e.target.value)}
                placeholder="Paste execution log snippets to hash..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-300 font-mono text-[11px] focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold shadow-lg shadow-indigo-500/25 transition disabled:opacity-50"
            >
              {isLoading ? 'Executing Validator Consensus Audit...' : 'Trigger Consensus Audit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
