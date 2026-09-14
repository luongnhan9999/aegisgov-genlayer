import React from 'react';
import { Landmark, ArrowDownToLine } from 'lucide-react';
import { formatGen } from '../utils/format';

interface VaultCardProps {
  withdrawableCredits: string;
  onWithdraw: () => Promise<void>;
  isWithdrawing: boolean;
  userAddress: string;
}

export const VaultCard: React.FC<VaultCardProps> = ({
  withdrawableCredits,
  onWithdraw,
  isWithdrawing,
  userAddress,
}) => {
  const hasCredits = BigInt(withdrawableCredits || '0') > 0n;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#0e121d] via-[#090c14] to-[#05070c] border border-amber-500/30 p-6 sm:p-7 shadow-2xl mb-8 relative overflow-hidden group">
      {/* Subtle gold decorative gradient sweep */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-amber-500/5 blur-3xl pointer-events-none"></div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-600/20 via-yellow-500/10 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/5">
            <Landmark className="h-7 w-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-lg font-bold text-white font-cinzel tracking-wide">
                Institutional Sovereign Vault
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono uppercase tracking-wider">
                Pull-Over-Push Architecture
              </span>
            </div>
            <p className="text-xs text-slate-300/80 mt-1.5 max-w-2xl leading-relaxed">
              Disbursed milestone grants and slashing refunds are credited into your dedicated non-custodial balance. This pull-settlement model protects escrow from external transfer reverts, eliminates reentrancy vectors, and prevents GenVM execution halts.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 border-t lg:border-t-0 pt-4 lg:pt-0 border-amber-500/15 shrink-0">
          <div className="text-left lg:text-right">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold font-mono">
              Available Vault Balance
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                {formatGen(withdrawableCredits)}
              </span>
              <span className="text-sm font-bold text-amber-400 font-cinzel">GEN</span>
            </div>
          </div>

          <button
            onClick={onWithdraw}
            disabled={!hasCredits || isWithdrawing || !userAddress}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs shadow-xl shadow-amber-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowDownToLine className="h-4 w-4" />
            {isWithdrawing ? 'Withdrawing GEN...' : 'Withdraw to MetaMask'}
          </button>
        </div>
      </div>
    </div>
  );
};
