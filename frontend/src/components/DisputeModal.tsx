import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { PolicyProposal } from '../types';

interface DisputeModalProps {
  isOpen: boolean;
  proposal: PolicyProposal | null;
  onClose: () => void;
  onSubmitDispute: (proposalId: string, reason: string) => Promise<void>;
  isLoading: boolean;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  proposal,
  onClose,
  onSubmitDispute,
  isLoading,
}) => {
  if (!isOpen || !proposal) return null;

  const [disputeReason, setDisputeReason] = useState('Agent telemetry log concealed off-chain order cancellation spike on DEX.');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim()) {
      setErrorMsg('Please provide a reason for challenging the evaluation.');
      return;
    }

    try {
      await onSubmitDispute(proposal.id, disputeReason.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Dispute transaction failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl p-6 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Raise Compliance Dispute</h2>
              <p className="text-xs text-slate-400">Freeze payout during 24-hour cooling-off window</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
          <p><span className="text-slate-400 font-semibold">Proposal:</span> <span className="font-mono text-cyan-300">{proposal.id}</span></p>
          <p><span className="text-slate-400 font-semibold">Agent:</span> <span className="font-mono text-slate-200">{proposal.target_agent_id}</span></p>
          <p className="text-[11px] text-amber-400/90 pt-1">
            Note: Only the designated DAO Sponsor can initiate this dispute to prevent automated disbursement.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Dispute Rationale / Evidence of Non-Compliance
            </label>
            <textarea
              rows={3}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-rose-200 font-mono text-xs focus:border-rose-500 focus:outline-none"
              placeholder="State the specific discrepancy or safety violation..."
              required
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-600/25 transition disabled:opacity-50"
            >
              {isLoading ? 'Submitting Dispute...' : 'Freeze Payout & Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
