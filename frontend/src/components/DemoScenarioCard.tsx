import React from 'react';
import { Sparkles, Scale, ShieldCheck, Flame, ShieldAlert, ArrowRight, Gavel } from 'lucide-react';
import type { DemoScenario } from '../types';
import { DEMO_SCENARIOS } from '../types';

interface DemoScenarioCardProps {
  onSelectScenario: (scenario: DemoScenario) => void;
}

export const DemoScenarioCard: React.FC<DemoScenarioCardProps> = ({ onSelectScenario }) => {
  return (
    <div className="mb-8 rounded-3xl bg-gradient-to-br from-[#0c0f18] to-[#07090e] border border-amber-500/25 p-6 sm:p-7 shadow-2xl relative overflow-hidden">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Gavel className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-cinzel text-white tracking-widest uppercase">
              Judicial Precedent Test Bench (Evaluation Scenarios)
            </h3>
            <p className="text-[11px] text-slate-400">
              Select an authoritative case precedent below to populate verified on-chain parameters directly into your MetaMask transaction.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 mt-5">
        {DEMO_SCENARIOS.map((scenario, index) => {
          const isCompliant = scenario.expected_verdict === 'COMPLIANT';

          return (
            <div
              key={index}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 relative group overflow-hidden ${
                isCompliant
                  ? 'bg-gradient-to-b from-[#0e171b]/80 to-[#07090e] border-emerald-500/30 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10'
                  : 'bg-gradient-to-b from-[#180e12]/80 to-[#07090e] border-rose-500/30 hover:border-rose-500/60 hover:shadow-lg hover:shadow-rose-500/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border font-mono uppercase tracking-wider ${
                    isCompliant
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}>
                    {scenario.tag}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {scenario.grant_amount_gen} GEN
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition font-cinzel leading-snug mb-2">
                  {scenario.title}
                </h4>

                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
                  {scenario.description}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[130px]">
                  {scenario.target_agent_id}
                </span>
                <button
                  onClick={() => onSelectScenario(scenario)}
                  className="text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-md font-sans"
                >
                  Docket Case
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
