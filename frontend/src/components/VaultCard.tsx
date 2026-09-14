import React from 'react';
import { Coins, ArrowDownToLine, ShieldCheck, Info } from 'lucide-react';
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
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-slate-950 border border-slate-800 p-6 shadow-xl mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">Withdrawable Credit Vault</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase tracking-wider">
                Pull-Over-Push Pattern
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              To eliminate GenVM reentrancy vulnerabilities and execution reverts, milestone payouts and slashed refund escrows settle directly into your internal credit balance. Withdraw your native GEN funds at any time with zero slippage or fee locks.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-800">
          <div className="text-left md:text-right">
            <span className="text-xs text-slate-400 block font-medium">Available Balance</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {formatGen(withdrawableCredits)}
              </span>
              <span className="text-xs font-bold text-amber-400">GEN</span>
            </div>
          </div>

          <button
            onClick={onWithdraw}
            disabled={!hasCredits || isWithdrawing || !userAddress}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ArrowDownToLine className="h-4 w-4" />
            {isWithdrawing ? 'Withdrawing GEN...' : 'Withdraw to Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
};
