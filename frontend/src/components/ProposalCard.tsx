import React, { useState } from 'react';
import { 
  ShieldCheck, AlertTriangle, Clock, ExternalLink, Hash, User, 
  Bot, ArrowUpRight, Flame, CheckCircle, ChevronDown, ChevronUp, Copy, Check
} from 'lucide-react';
import type { PolicyProposal } from '../types';
import { formatGen, shortenAddress, formatRemainingTime, formatTimeAgo } from '../utils/format';

interface ProposalCardProps {
  proposal: PolicyProposal;
  currentUser: string;
  onSubmitTelemetry: (proposal: PolicyProposal) => void;
  onRaiseDispute: (proposal: PolicyProposal) => void;
  onFinalizeDisbursement: (proposalId: string) => void;
  onRecoverExpired: (proposalId: string) => void;
  isActionLoading: boolean;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  currentUser,
  onSubmitTelemetry,
  onRaiseDispute,
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

  // Status styling
  const getStatusBadge = () => {
    switch (proposal.status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            ACTIVE ESCROW
          </span>
        );
      case 'EVALUATING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="h-3.5 w-3.5 animate-spin" />
            24H COOLING-OFF
          </span>
        );
      case 'RELEASED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="h-3.5 w-3.5" />
            DISBURSED
          </span>
        );
      case 'SLASHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Flame className="h-3.5 w-3.5" />
            SLASHED & REFUNDED
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <AlertTriangle className="h-3.5 w-3.5" />
            FROZEN / DISPUTED
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-400 border border-slate-600">
            EXPIRED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 transition shadow-lg overflow-hidden backdrop-blur-sm">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-cyan-400">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-white tracking-wide">{proposal.id}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono border border-slate-700">
                {proposal.target_agent_id}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Created {formatTimeAgo(proposal.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <div className="text-right">
            <span className="text-lg font-bold font-mono text-white tracking-tight">
              {formatGen(proposal.grant_amount)}
            </span>
            <span className="text-xs font-bold text-cyan-400 ml-1">GEN</span>
          </div>
        </div>
      </div>

      {/* AI Consensus Audit Verdict (If evaluated) */}
      {proposal.verdict !== 'NONE' && (
        <div className={`px-5 py-4 border-b ${
          proposal.verdict === 'COMPLIANT'
            ? 'bg-emerald-950/20 border-emerald-500/30'
            : 'bg-rose-950/25 border-rose-500/30'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
              proposal.verdict === 'COMPLIANT'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}>
              {proposal.verdict === 'COMPLIANT' ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  proposal.verdict === 'COMPLIANT' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  GenLayer Validator Consensus Verdict: {proposal.verdict}
                </span>
                {coolingOff && (
                  <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded border ${
                    coolingOff.isElapsed 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                  }`}>
                    {coolingOff.formatted}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-200 mt-1.5 leading-relaxed font-sans bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">
                  Autonomous Justification (Reason):
                </span>
                {proposal.reason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Details Grid */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Parties */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-blue-400" />
              DAO Sponsor:
            </span>
            <span className="font-mono text-slate-200 font-medium">
              {shortenAddress(proposal.sponsor)}
              {isSponsor && <span className="ml-1.5 text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded">(You)</span>}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-emerald-400" />
              Agent Operator:
            </span>
            <span className="font-mono text-slate-200 font-medium">
              {shortenAddress(proposal.agent_operator)}
              {isOperator && <span className="ml-1.5 text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">(You)</span>}
            </span>
          </div>
        </div>

        {/* Cryptographic Manifest Hashes */}
        <div className="space-y-2.5">
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <Hash className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="text-slate-400">Spec SHA-256:</span>
              <span className="font-mono text-[11px] text-cyan-300 truncate">
                {proposal.constitutional_spec_hash ? shortenAddress(proposal.constitutional_spec_hash, 6) : 'N/A'}
              </span>
            </div>
            {proposal.constitutional_spec_hash && (
              <button
                onClick={() => handleCopy(proposal.constitutional_spec_hash, 'spec')}
                className="text-slate-400 hover:text-slate-200 p-1"
                title="Copy SHA-256 Hash"
              >
                {copiedHash === 'spec' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <Hash className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span className="text-slate-400">Log SHA-256:</span>
              <span className="font-mono text-[11px] text-indigo-300 truncate">
                {proposal.telemetry_log_hash ? shortenAddress(proposal.telemetry_log_hash, 6) : 'Awaiting Proof'}
              </span>
            </div>
            {proposal.telemetry_log_hash && (
              <button
                onClick={() => handleCopy(proposal.telemetry_log_hash, 'log')}
                className="text-slate-400 hover:text-slate-200 p-1"
                title="Copy SHA-256 Hash"
              >
                {copiedHash === 'log' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Rules & Evidence Section */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-1 space-y-3 border-t border-slate-800/60 text-xs animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                Mandatory Safety Boundaries
              </span>
              <p className="text-slate-300 whitespace-pre-line font-mono text-[11px] leading-relaxed">
                {proposal.safety_boundary_rules || 'None configured'}
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block mb-1">
                Blacklisted / Prohibited Behaviors
              </span>
              <p className="text-slate-300 whitespace-pre-line font-mono text-[11px] leading-relaxed">
                {proposal.blacklisted_behaviors || 'None configured'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px]">
            {proposal.constitutional_spec_url && (
              <a
                href={proposal.constitutional_spec_url}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> View Constitutional Spec
              </a>
            )}
            {proposal.telemetry_log_url && (
              <a
                href={proposal.telemetry_log_url}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> View Execution Telemetry
              </a>
            )}
          </div>
        </div>
      )}

      {/* Actions Footer */}
      <div className="px-5 py-3.5 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
        >
          {isExpanded ? (
            <>Less Details <ChevronUp className="h-3.5 w-3.5" /></>
          ) : (
            <>View Policies & Hashes <ChevronDown className="h-3.5 w-3.5" /></>
          )}
        </button>

        <div className="flex items-center gap-2">
          {/* Action 1: Submit Telemetry (When ACTIVE) */}
          {proposal.status === 'ACTIVE' && (
            <button
              onClick={() => onSubmitTelemetry(proposal)}
              disabled={isActionLoading}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
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
              className="px-3.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-medium text-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Raise Dispute (Sponsor)
            </button>
          )}

          {/* Action 3: Finalize Disbursement (When EVALUATING and cooling-off elapsed) */}
          {proposal.status === 'EVALUATING' && coolingOff && coolingOff.isElapsed && (
            <button
              onClick={() => onFinalizeDisbursement(proposal.id)}
              disabled={isActionLoading}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Finalize Disbursement
            </button>
          )}

          {/* Action 4: Recover Expired Grant (When ACTIVE/DISPUTED past duration) */}
          {(proposal.status === 'ACTIVE' || proposal.status === 'DISPUTED') && (
            <button
              onClick={() => onRecoverExpired(proposal.id)}
              disabled={isActionLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
              title="Recover abandoned escrow after expiration period"
            >
              Recover Expired
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
