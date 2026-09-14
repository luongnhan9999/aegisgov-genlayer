import React from 'react';
import { Sparkles, ShieldCheck, Flame, ShieldAlert, ArrowRight } from 'lucide-react';
import type { DemoScenario } from '../types';
import { DEMO_SCENARIOS } from '../types';

interface DemoScenarioCardProps {
  onSelectScenario: (scenario: DemoScenario) => void;
}

export const DemoScenarioCard: React.FC<DemoScenarioCardProps> = ({ onSelectScenario }) => {
  return (
    <div className="mb-8 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800 p-6 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-cyan-400" />
        <h3 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider">
          Judge Interactive Test Bench (Consensus Audit Scenarios)
        </h3>
      </div>
      <p className="text-xs text-slate-400 mb-4 max-w-3xl leading-relaxed">
        Click any benchmark scenario below to populate test data into the Register/Audit flow. Test how GenLayer's intelligent contract enforces zero-normalization JSON parsing, SHA-256 manifest pinning, and real-time safe-harbor evaluation.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DEMO_SCENARIOS.map((scenario, index) => {
          const isCompliant = scenario.expected_verdict === 'COMPLIANT';
          const isSlashed = scenario.expected_status === 'SLASHED';

          return (
            <div
              key={index}
              className="rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 p-4 flex flex-col justify-between transition group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isCompliant
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {scenario.tag}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {scenario.grant_amount_gen} GEN
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition mb-1.5">
                  {scenario.title}
                </h4>

                <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                  {scenario.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between">
                <span className="text-[10px] font-mono text-cyan-400">
                  {scenario.target_agent_id}
                </span>
                <button
                  onClick={() => onSelectScenario(scenario)}
                  className="text-xs font-semibold text-white bg-slate-800 hover:bg-cyan-600 hover:text-white px-2.5 py-1 rounded-lg transition flex items-center gap-1 shadow-sm"
                >
                  Load Scenario
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
