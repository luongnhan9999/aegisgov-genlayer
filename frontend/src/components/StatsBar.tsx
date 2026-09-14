import React from 'react';
import { ShieldCheck, Lock, Activity, Coins, ArrowDownToLine } from 'lucide-react';
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
  // Compute metrics
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
      {/* 1. Total Locked Escrow */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 p-4.5 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Locked Grant Escrow</span>
          <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Lock className="h-4 w-4 text-cyan-400" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {formatGen(totalLockedWei.toString())}
          </span>
          <span className="text-xs font-semibold text-cyan-400">GEN</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Protected by Constitutional Safe-Harbor</p>
      </div>

      {/* 2. Active Proposals */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 p-4.5 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Grants</span>
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {activeCount}
          </span>
          <span className="text-xs text-slate-400">of {proposals.length} total</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Under continuous telemetry consensus</p>
      </div>

      {/* 3. Safe-Harbor Pass Rate */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 p-4.5 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Compliance Rate</span>
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
            {complianceRate}%
          </span>
          <span className="text-xs text-slate-400">audit approval</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">{compliantCount} verified safe agents</p>
      </div>

      {/* 4. Withdrawable Vault Credits */}
      <div className={`relative overflow-hidden rounded-2xl border p-4.5 shadow-md transition ${
        hasWithdrawable
          ? 'bg-gradient-to-br from-amber-950/30 to-slate-900/80 border-amber-500/40 ring-1 ring-amber-500/20'
          : 'bg-gradient-to-br from-slate-900/90 to-slate-900/40 border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">My Credit Vault</span>
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
            hasWithdrawable ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300' : 'bg-slate-800 text-slate-400'
          }`}>
            <Coins className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono tracking-tight ${hasWithdrawable ? 'text-amber-300' : 'text-slate-300'}`}>
              {formatGen(withdrawableCredits)}
            </span>
            <span className="text-xs font-semibold text-slate-400">GEN</span>
          </div>
          {hasWithdrawable && (
            <button
              onClick={onOpenVault}
              className="text-xs font-medium px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition flex items-center gap-1 shadow-sm font-semibold"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Withdraw
            </button>
          )}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          {hasWithdrawable ? 'Non-custodial Pull settlement ready' : 'Pull-over-Push Safe Settlement'}
        </p>
      </div>
    </div>
  );
};
