import React, { useState, useEffect } from 'react';
import { X, ShieldPlus, Hash, Sparkles, AlertCircle } from 'lucide-react';
import type { DemoScenario } from '../types';
import { computeSha256 } from '../utils/format';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (params: {
    proposalId: string;
    targetAgentId: string;
    agentOperator: string;
    grantAmountGen: string;
    specUrl: string;
    specHash: string;
    safetyRules: string;
    blacklisted: string;
    validityDays: number;
  }) => Promise<void>;
  isLoading: boolean;
  initialScenario?: DemoScenario | null;
  currentUser?: string;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onRegister,
  isLoading,
  initialScenario,
  currentUser,
}) => {
  const [proposalId, setProposalId] = useState(`PROP-${Math.floor(1000 + Math.random() * 9000)}`);
  const [targetAgentId, setTargetAgentId] = useState('AGENT-AUTONOMOUS-TRADER-01');
  const [agentOperator, setAgentOperator] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  const [grantAmountGen, setGrantAmountGen] = useState('1.0');
  const [specUrl, setSpecUrl] = useState('https://raw.githubusercontent.com/ethereum/annotated-spec/master/phase0/beacon-chain.md');
  const [specHash, setSpecHash] = useState('a4f8d39c018274d89a27e69f835b31d87192a54332cefc27301c20172e591244');
  const [safetyRules, setSafetyRules] = useState('Max leverage <= 1.5x. Slippage < 0.5%. Whitelisted liquidity pools only.');
  const [blacklisted, setBlacklisted] = useState('No flashloan exploits, no unauthorized private key export, no mempool sandwich attacks.');
  const [validityDays, setValidityDays] = useState(30);

  const [rawSpecText, setRawSpecText] = useState('');
  const [isHashing, setIsHashing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load preset scenario when passed
  useEffect(() => {
    if (initialScenario) {
      setProposalId(`PROP-${initialScenario.target_agent_id.slice(-8)}-${Math.floor(100 + Math.random() * 900)}`);
      setTargetAgentId(initialScenario.target_agent_id);
      setAgentOperator(initialScenario.agent_operator);
      setGrantAmountGen(initialScenario.grant_amount_gen);
      setSpecUrl(initialScenario.spec_url);
      setSpecHash(initialScenario.spec_hash);
      setSafetyRules(initialScenario.safety_boundaries);
      setBlacklisted(initialScenario.blacklisted_behaviors);
    }
  }, [initialScenario, isOpen]);

  if (!isOpen) return null;

  const handleComputeHashFromText = async () => {
    if (!rawSpecText.trim()) return;
    setIsHashing(true);
    try {
      const hash = await computeSha256(rawSpecText.trim());
      setSpecHash(hash);
    } catch (e: any) {
      setErrorMsg('Failed to compute SHA-256 hash');
    } finally {
      setIsHashing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!proposalId.trim() || !targetAgentId.trim() || !agentOperator.trim()) {
      setErrorMsg('Please provide Proposal ID, Target Agent ID, and Operator Address.');
      return;
    }

    if (specHash.trim().length !== 64) {
      setErrorMsg('Constitutional Spec Hash must be a valid 64-character hex SHA-256 string.');
      return;
    }

    const amountNum = parseFloat(grantAmountGen);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Grant escrow amount must be greater than 0 GEN.');
      return;
    }

    try {
      await onRegister({
        proposalId: proposalId.trim(),
        targetAgentId: targetAgentId.trim(),
        agentOperator: agentOperator.trim(),
        grantAmountGen: grantAmountGen.trim(),
        specUrl: specUrl.trim(),
        specHash: specHash.trim().toLowerCase(),
        safetyRules: safetyRules.trim(),
        blacklisted: blacklisted.trim(),
        validityDays,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit transaction to GenLayer Studionet');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Register Governance Grant</h2>
              <p className="text-xs text-slate-400">Lock real DAO milestone escrow on GenLayer Studionet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {initialScenario && (
          <div className="mt-4 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>Preset loaded: <strong>{initialScenario.title}</strong></span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Row 1: ID and Target Agent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Proposal Identifier</label>
              <input
                type="text"
                value={proposalId}
                onChange={(e) => setProposalId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                placeholder="PROP-XXXX"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Target Agent ID</label>
              <input
                type="text"
                value={targetAgentId}
                onChange={(e) => setTargetAgentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                placeholder="AGENT-ID-01"
                required
              />
            </div>
          </div>

          {/* Row 2: Operator Address & Grant Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-semibold">Agent Operator Address</label>
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => setAgentOperator(currentUser)}
                    className="text-[10px] text-amber-400 hover:text-amber-300 hover:underline font-mono cursor-pointer"
                  >
                    Use My Address
                  </button>
                )}
              </div>
              <input
                type="text"
                value={agentOperator}
                onChange={(e) => setAgentOperator(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                placeholder="0x..."
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Grant Escrow (GEN)</label>
              <input
                type="number"
                step="any"
                min="0.001"
                value={grantAmountGen}
                onChange={(e) => setGrantAmountGen(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                placeholder="1.0"
                required
              />
            </div>
          </div>

          {/* Row 3: Spec URL & Spec SHA-256 Hash */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Constitutional Policy Spec URL</label>
            <input
              type="url"
              value={specUrl}
              onChange={(e) => setSpecUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
              placeholder="https://..."
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1">
                <Hash className="h-3.5 w-3.5 text-cyan-400" />
                Immutable SHA-256 Digest of Spec (64 hex characters)
              </label>
            </div>
            <input
              type="text"
              value={specHash}
              onChange={(e) => setSpecHash(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-cyan-400 font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
              placeholder="64-character hex hash"
              required
            />
            {/* Quick helper to calculate hash from sample text */}
            <div className="mt-2 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px]">
              <div className="flex items-center justify-between mb-1 text-slate-400">
                <span>Or calculate hash from policy text:</span>
                <button
                  type="button"
                  onClick={handleComputeHashFromText}
                  disabled={!rawSpecText.trim() || isHashing}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 disabled:opacity-40"
                >
                  <Sparkles className="h-3 w-3" />
                  Compute SHA-256
                </button>
              </div>
              <textarea
                rows={2}
                value={rawSpecText}
                onChange={(e) => setRawSpecText(e.target.value)}
                placeholder="Paste raw policy text to compute exact SHA-256..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-300 font-mono text-[11px] focus:outline-none"
              />
            </div>
          </div>

          {/* Row 4: Safety Boundaries */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Mandatory Safety Boundaries (Rules)</label>
            <textarea
              rows={2}
              value={safetyRules}
              onChange={(e) => setSafetyRules(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. Max leverage <= 1.5x. Slippage < 0.5%."
              required
            />
          </div>

          {/* Row 5: Blacklisted Behaviors */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Blacklisted / Prohibited Behaviors</label>
            <textarea
              rows={2}
              value={blacklisted}
              onChange={(e) => setBlacklisted(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. Unauthorized shell execution, sandwich attacks, credentials leakage."
              required
            />
          </div>

          {/* Row 6: Validity Days */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Escrow Expiry Duration (Days)</label>
            <input
              type="number"
              min="1"
              max="365"
              value={validityDays}
              onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? 'Signing & Locking Escrow...' : 'Lock Grant Escrow (Sign with MetaMask)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
