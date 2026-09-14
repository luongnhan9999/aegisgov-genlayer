import React, { useState } from 'react';
import { X, Scale, Sparkles } from 'lucide-react';
import type { PolicyProposal } from '../types';

interface AppealModalProps {
  isOpen: boolean;
  proposal: PolicyProposal | null;
  onClose: () => void;
  onSubmitAppeal: (proposalId: string, evidenceUrl: string, evidenceHash: string) => Promise<void>;
  isLoading: boolean;
}

async function computeSha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const AppealModal: React.FC<AppealModalProps> = ({
  isOpen,
  proposal,
  onClose,
  onSubmitAppeal,
  isLoading,
}) => {
  if (!isOpen || !proposal) return null;

  const [evidenceUrl, setEvidenceUrl] = useState('https://raw.githubusercontent.com/luongnhan9999/AegisGov/master/specs/appeal_proof_telemetry.txt');
  const [evidenceText, setEvidenceText] = useState(
    JSON.stringify({
      appeal_statement: 'Refutation of alleged violation: DEX transaction records demonstrate order cancellation was executed within permitted risk parameters.',
      order_audit_trail: 'Tx 0x981273.. verified with zero slippage impact. Re-verified by secondary off-chain oracle.',
      agent_id: proposal.target_agent_id,
      timestamp: new Date().toISOString()
    }, null, 2)
  );
  const [evidenceHash, setEvidenceHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isHashing, setIsHashing] = useState(false);

  const handleComputeHash = async () => {
    setIsHashing(true);
    try {
      const hash = await computeSha256Hex(evidenceText);
      setEvidenceHash(hash);
    } catch (e: any) {
      setErrorMsg('Failed to compute SHA-256 hash: ' + e.message);
    } finally {
      setIsHashing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!evidenceUrl.trim().startsWith('http://') && !evidenceUrl.trim().startsWith('https://') && !evidenceUrl.trim().startsWith('ipfs://')) {
      setErrorMsg('Valid HTTP/HTTPS/IPFS URL is required for the counter-evidence dossier.');
      return;
    }

    let hashToSubmit = evidenceHash.trim().toLowerCase();
    if (!hashToSubmit) {
      hashToSubmit = await computeSha256Hex(evidenceText);
      setEvidenceHash(hashToSubmit);
    }

    if (hashToSubmit.length !== 64) {
      setErrorMsg('Evidence hash must be a 64-character SHA-256 hex string.');
      return;
    }

    try {
      await onSubmitAppeal(proposal.id, evidenceUrl.trim(), hashToSubmit);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Appeal transaction failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0a0d16] border border-amber-500/40 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-cinzel text-white tracking-wide">
                Supreme Judicial Appeal &amp; Re-Audit
              </h2>
              <p className="text-xs text-slate-400">Decentralized Validator Consensus Dispute Arbitration</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="mt-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
          <div className="flex justify-between items-center font-mono">
            <span className="text-slate-400">Docket: #{proposal.id}</span>
            <span className="text-amber-400 font-bold">{proposal.target_agent_id}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200">
            <span className="font-semibold block text-[10px] uppercase tracking-wider text-purple-300 mb-1">
              Active Dispute Allegation:
            </span>
            <p className="text-[11px] font-mono leading-relaxed">{proposal.reason}</p>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Submitting this appeal summons GenLayer validators to re-audit the evidence. If the agent is exonerated, the full escrow is disbursed to the Operator. If the dispute is upheld, funds are refunded to the Sponsor.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Counter-Evidence Dossier URL (HTTPS / IPFS)
            </label>
            <input
              type="text"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-amber-300 font-mono text-xs focus:border-amber-500 focus:outline-none"
              placeholder="https://... or ipfs://..."
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold">
                Counter-Evidence Payload / Proof Body
              </label>
              <button
                type="button"
                onClick={handleComputeHash}
                disabled={isHashing}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline font-mono flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="h-3 w-3" />
                Compute SHA-256 Digest
              </button>
            </div>
            <textarea
              rows={4}
              value={evidenceText}
              onChange={(e) => {
                setEvidenceText(e.target.value);
                setEvidenceHash('');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 font-mono text-[11px] focus:border-amber-500 focus:outline-none"
              placeholder="Detailed counter-telemetry or JSON audit trail..."
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              SHA-256 Evidence Checksum (Mandatory Cryptographic Anchor)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={evidenceHash}
                onChange={(e) => setEvidenceHash(e.target.value.toLowerCase())}
                placeholder="64-character hex hash..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-emerald-400 font-mono text-[11px] focus:border-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleComputeHash}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Hash
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs shadow-xl shadow-amber-500/20 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Scale className="h-4 w-4" />
              {isLoading ? 'Submitting Appeal...' : 'Submit Appeal to Validators'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
