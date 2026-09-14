import React, { useState } from 'react';
import { 
  ShieldCheck, AlertTriangle, Clock, ExternalLink, Hash, User, 
  Bot, ArrowUpRight, Flame, CheckCircle, ChevronDown, ChevronUp, Copy, Check, Scale, Gavel
} from 'lucide-react';
import type { PolicyProposal } from '../types';
import { formatGen, shortenAddress, formatRemainingTime, formatTimeAgo } from '../utils/format';

interface ProposalCardProps {
  proposal: PolicyProposal;
  currentUser: string;
  onSubmitTelemetry: (proposal: PolicyProposal) => void;
  onRaiseDispute: (proposal: PolicyProposal) => void;
  onAppealDispute?: (proposal: PolicyProposal) => void;
  onDismissDispute?: (proposalId: string) => void;
  onFinalizeDisbursement: (proposalId: string) => void;
  onRecoverExpired: (proposalId: string) => void;
  isActionLoading: boolean;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  currentUser,
  onSubmitTelemetry,
  onRaiseDispute,
  onAppealDispute,
  onDismissDispute,
  onFinalizeDisbursement,
  onRecoverExpired,
  isActionLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(label);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const userLower = currentUser.toLowerCase();
  const isOperator = userLower && userLower === proposal.agent_operator.toLowerCase();
  const isSponsor = userLower && userLower === proposal.sponsor.toLowerCase();

  const coolingOff = proposal.status === 'EVALUATING' && proposal.payout_ready_at
    ? formatRemainingTime(proposal.payout_ready_at)
    : null;

  // Status badge styling
  const getStatusBadge = () => {
    switch (proposal.status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-mono tracking-wider">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
            ACTIVE DOCKET
          </span>
        );
      case 'EVALUATING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono tracking-wider">
            <Clock className="h-3.5 w-3.5 animate-spin text-amber-400" />
            24H COOLING-OFF
          </span>
        );
      case 'RELEASED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono tracking-wider">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            DISBURSED
          </span>
        );
      case 'SLASHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono tracking-wider">
            <Flame className="h-3.5 w-3.5 text-rose-400" />
            SLASHED & REFUNDED
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono tracking-wider">
            <AlertTriangle className="h-3.5 w-3.5 text-purple-400" />
            FROZEN / DISPUTED
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700 font-mono tracking-wider">
            EXPIRED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#0c0f17] via-[#080b12] to-[#05070c] border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Top Dossier Bar */}
      <div className="p-5 sm:p-6 border-b border-amber-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/5">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-cinzel text-base font-bold text-white tracking-wider">
                DOCKET #{proposal.id}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold">
                {proposal.target_agent_id}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Registered {formatTimeAgo(proposal.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-center">
          {getStatusBadge()}
          <div className="text-right">
            <span className="text-2xl font-extrabold font-mono text-white tracking-tight">
              {formatGen(proposal.grant_amount)}
            </span>
            <span className="text-xs font-bold text-amber-400 font-cinzel ml-1.5">GEN</span>
          </div>
        </div>
      </div>

      {/* Consensus Verdict Decree (Rendered when evaluated) */}
      {proposal.verdict !== 'NONE' && (
        <div className={`p-5 border-b ${
          proposal.verdict === 'COMPLIANT'
            ? 'bg-gradient-to-r from-emerald-950/30 via-emerald-950/10 to-transparent border-emerald-500/30'
            : 'bg-gradient-to-r from-rose-950/35 via-rose-950/15 to-transparent border-rose-500/30'
        }`}>
          <div className="flex items-start gap-3.5">
            <div className={`mt-0.5 p-2 rounded-xl shrink-0 ${
              proposal.verdict === 'COMPLIANT'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {proposal.verdict === 'COMPLIANT' ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <AlertTriangle className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-xs font-bold uppercase tracking-widest font-cinzel ${
                  proposal.verdict === 'COMPLIANT' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  GenLayer Supreme Consensus Decree: {proposal.verdict}
                </span>
                {coolingOff && (
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                    coolingOff.isElapsed 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  }`}>
                    {coolingOff.formatted}
                  </span>
                )}
              </div>
              <div className="mt-2.5 p-3.5 rounded-2xl bg-black/50 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-mono">
                  Autonomous Judicial Opinion:
                </span>
                "{proposal.reason}"
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Parties & Evidence Chamber */}
      <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Parties */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/90">
            <span className="text-slate-400 flex items-center gap-2">
              <User className="h-4 w-4 text-amber-400" />
              DAO Court Sponsor:
            </span>
            <span className="font-mono text-slate-200 font-bold">
              {shortenAddress(proposal.sponsor)}
              {isSponsor && <span className="ml-1.5 text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/30">(You)</span>}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/90">
            <span className="text-slate-400 flex items-center gap-2">
              <Bot className="h-4 w-4 text-indigo-400" />
              Agent Custodian (Operator):
            </span>
            <span className="font-mono text-slate-200 font-bold">
              {shortenAddress(proposal.agent_operator)}
              {isOperator && <span className="ml-1.5 text-[10px] text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-500/30">(You)</span>}
            </span>
          </div>
        </div>

        {/* Hashes Pinning */}
        <div className="space-y-2.5">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <Hash className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-slate-400">Spec SHA-256:</span>
              <span className="font-mono text-amber-300 font-bold truncate">
                {proposal.constitutional_spec_hash ? shortenAddress(proposal.constitutional_spec_hash, 6) : 'N/A'}
              </span>
            </div>
            {proposal.constitutional_spec_hash && (
              <button
                onClick={() => handleCopy(proposal.constitutional_spec_hash, 'spec')}
                className="text-slate-400 hover:text-amber-400 p-1 transition"
                title="Copy SHA-256 Digest"
              >
                {copiedHash === 'spec' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <Hash className="h-4 w-4 text-indigo-400 shrink-0" />
              <span className="text-slate-400">Log SHA-256:</span>
              <span className="font-mono text-indigo-300 font-bold truncate">
                {proposal.telemetry_log_hash ? shortenAddress(proposal.telemetry_log_hash, 6) : 'Awaiting Proof'}
              </span>
            </div>
            {proposal.telemetry_log_hash && (
              <button
                onClick={() => handleCopy(proposal.telemetry_log_hash, 'log')}
                className="text-slate-400 hover:text-indigo-400 p-1 transition"
                title="Copy SHA-256 Digest"
              >
                {copiedHash === 'log' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Dossier Sections */}
      {isExpanded && (
        <div className="px-5 sm:px-6 pb-6 pt-1 space-y-4 border-t border-slate-800 text-xs animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div className="bg-black/60 p-4 rounded-2xl border border-slate-800/90">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest block mb-1.5 font-mono">
                Mandatory Safe-Harbor Perimeter
              </span>
              <p className="text-slate-300 whitespace-pre-line font-mono text-[11px] leading-relaxed">
                {proposal.safety_boundary_rules || 'None specified'}
              </p>
            </div>

            <div className="bg-black/60 p-4 rounded-2xl border border-slate-800/90">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest block mb-1.5 font-mono">
                Blacklisted Constitutional Violations
              </span>
              <p className="text-slate-300 whitespace-pre-line font-mono text-[11px] leading-relaxed">
                {proposal.blacklisted_behaviors || 'None specified'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
            {proposal.constitutional_spec_url && (
              <a
                href={proposal.constitutional_spec_url}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline flex items-center gap-1.5 font-medium"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Inspect Constitutional Spec
              </a>
            )}
            {proposal.telemetry_log_url && (
              <a
                href={proposal.telemetry_log_url}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline flex items-center gap-1.5 font-medium"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Inspect Live Telemetry Feed
              </a>
            )}
          </div>
        </div>
      )}

      {/* Judicial Action Footer */}
      <div className="px-5 sm:px-6 py-4 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1 transition font-medium"
        >
          {isExpanded ? (
            <>Collapse Dossier <ChevronUp className="h-4 w-4" /></>
          ) : (
            <>Inspect Full Policy & Hashes <ChevronDown className="h-4 w-4" /></>
          )}
        </button>

        <div className="flex items-center gap-2.5">
          {/* Action 1: Submit Telemetry */}
          {proposal.status === 'ACTIVE' && (
            <button
              onClick={() => onSubmitTelemetry(proposal)}
              disabled={isActionLoading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Bot className="h-3.5 w-3.5" />
              Submit Telemetry Audit
            </button>
          )}

          {/* Action 2: Raise Dispute (When EVALUATING within 24h) */}
          {proposal.status === 'EVALUATING' && coolingOff && !coolingOff.isElapsed && (
            <button
              onClick={() => onRaiseDispute(proposal)}
              disabled={isActionLoading}
              className="px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 font-bold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Challenge Evaluation (Sponsor)
            </button>
          )}

          {/* Action 3: Finalize Disbursement (When cooling-off elapsed) */}
          {proposal.status === 'EVALUATING' && coolingOff && coolingOff.isElapsed && (
            <button
              onClick={() => onFinalizeDisbursement(proposal.id)}
              disabled={isActionLoading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Disburse Milestone Escrow
            </button>
          )}

          {/* Action 4: Appeal Dispute & Re-Audit (Fairness for Operator / Sponsor) */}
          {proposal.status === 'DISPUTED' && onAppealDispute && (
            <button
              onClick={() => onAppealDispute(proposal)}
              disabled={isActionLoading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Scale className="h-3.5 w-3.5" />
              Judicial Appeal &amp; Re-Audit
            </button>
          )}

          {/* Action 5: Dismiss Dispute & Release (For Sponsor) */}
          {proposal.status === 'DISPUTED' && onDismissDispute && isSponsor && (
            <button
              onClick={() => onDismissDispute(proposal.id)}
              disabled={isActionLoading}
              className="px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Dismiss Dispute &amp; Release
            </button>
          )}

          {/* Action 6: Recover Expired (Strictly ACTIVE abandoned proposals only) */}
          {proposal.status === 'ACTIVE' && (
            <button
              onClick={() => onRecoverExpired(proposal.id)}
              disabled={isActionLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
              title="Reclaim escrow if agent abandoned milestone without submitting telemetry"
            >
              Reclaim Expired
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
