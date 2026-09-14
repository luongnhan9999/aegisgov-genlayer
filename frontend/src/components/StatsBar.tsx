import React from 'react';
import { ShieldCheck, Lock, Scale, Coins, ArrowDownToLine, Landmark } from 'lucide-react';
import { formatGen } from '../utils/format';
import type { PolicyProposal } from '../types';

interface StatsBarProps {
  proposals: PolicyProposal[];
  withdrawableCredits: string;
  onOpenVault: () => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  proposals,
  withdrawableCredits,
  onOpenVault,
}) => {
  const totalLockedWei = proposals.reduce((acc, p) => {
    if (p.status === 'ACTIVE' || p.status === 'EVALUATING' || p.status === 'DISPUTED') {
      try {
        return acc + BigInt(p.grant_amount || '0');
      } catch {
        return acc;
      }
    }
    return acc;
  }, 0n);

  const activeCount = proposals.filter(p => p.status === 'ACTIVE' || p.status === 'EVALUATING').length;
  const evaluatedCount = proposals.filter(p => p.verdict !== 'NONE').length;
  const compliantCount = proposals.filter(p => p.verdict === 'COMPLIANT').length;
  const complianceRate = evaluatedCount > 0 ? Math.round((compliantCount / evaluatedCount) * 100) : 100;

  const hasWithdrawable = BigInt(withdrawableCredits || '0') > 0n;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* 1. Locked Escrow */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c0f17] to-[#07090e] border border-amber-500/20 p-5 shadow-xl transition hover:border-amber-500/40 group">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300/80 font-mono">
            Treasury Grant Escrow
          </span>
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition">
            <Lock className="h-4 w-4 text-amber-400" />
          </div>
        </div>
        <div className="mt-3.5 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold font-mono text-white tracking-tight">
            {formatGen(totalLockedWei.toString())}
          </span>
          <span className="text-xs font-bold text-amber-400 font-cinzel">GEN</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 font-medium">Locked under AI Constitutional Decree</p>
      </div>

      {/* 2. Active Dockets */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c0f17] to-[#07090e] border border-indigo-500/20 p-5 shadow-xl transition hover:border-indigo-500/40 group">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300/80 font-mono">
            Active Court Dockets
          </span>
          <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-105 transition">
            <Scale className="h-4 w-4 text-indigo-400" />
          </div>
        </div>
        <div className="mt-3.5 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold font-mono text-white tracking-tight">
            {activeCount}
          </span>
          <span className="text-xs text-slate-400 font-mono">of {proposals.length} total cases</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 font-medium">Under continuous consensus telemetry</p>
      </div>

      {/* 3. Safe-Harbor Ratio */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c0f17] to-[#07090e] border border-emerald-500/20 p-5 shadow-xl transition hover:border-emerald-500/40 group">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/80 font-mono">
            Safe-Harbor Adherence
          </span>
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
        </div>
        <div className="mt-3.5 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold font-mono text-emerald-400 tracking-tight">
            {complianceRate}%
          </span>
          <span className="text-xs text-slate-400 font-mono">court clearance</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 font-medium">{compliantCount} proven compliant models</p>
      </div>

      {/* 4. Imperial Vault Credits */}
      <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-xl transition ${
        hasWithdrawable
          ? 'bg-gradient-to-br from-amber-950/40 via-[#0d101b] to-[#07090e] border-amber-500/50 ring-1 ring-amber-500/20 gold-glow'
          : 'bg-gradient-to-br from-[#0c0f17] to-[#07090e] border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 font-mono">
            Withdrawable Vault
          </span>
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
            hasWithdrawable ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' : 'bg-slate-900 border border-slate-800 text-slate-400'
          }`}>
            <Landmark className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3.5 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-extrabold font-mono tracking-tight ${hasWithdrawable ? 'text-amber-300' : 'text-slate-300'}`}>
              {formatGen(withdrawableCredits)}
            </span>
            <span className="text-xs font-bold text-amber-400/80 font-cinzel">GEN</span>
          </div>
          {hasWithdrawable && (
            <button
              onClick={onOpenVault}
              className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition flex items-center gap-1 shadow-md"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Claim
            </button>
          )}
        </div>
        <p className="mt-1 text-[11px] text-slate-400 font-medium">
          {hasWithdrawable ? 'Pull-settlement ready to withdraw' : 'Non-custodial pull architecture'}
        </p>
      </div>
    </div>
  );
};
