import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Plus, RefreshCw, AlertCircle, CheckCircle2, 
  ExternalLink, Layers, Search, Sparkles
} from 'lucide-react';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { VaultCard } from './components/VaultCard';
import { ProposalCard } from './components/ProposalCard';
import { DemoScenarioCard } from './components/DemoScenarioCard';
import { RegisterModal } from './components/RegisterModal';
import { TelemetryModal } from './components/TelemetryModal';
import { DisputeModal } from './components/DisputeModal';

import type { PolicyProposal, DemoScenario, ProposalStatus } from './types';
import { INITIAL_PROPOSALS, DEFAULT_CONTRACT_ADDRESS } from './types';
import { 
  connectMetaMaskWallet, 
  autoCheckWalletConnection, 
  setupWalletListeners 
} from './utils/web3';
import { 
  readProposalsFromChain, 
  readWithdrawableCredits, 
  writeContractOnChain 
} from './utils/genlayer';
import { parseGenToWei } from './utils/format';

export const App: React.FC = () => {
  const [account, setAccount] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [contractAddress, setContractAddress] = useState<string>(() => {
    return localStorage.getItem('aegisgov_contract_address') || DEFAULT_CONTRACT_ADDRESS;
  });

  const [proposals, setProposals] = useState<PolicyProposal[]>(INITIAL_PROPOSALS);
  const [withdrawableCredits, setWithdrawableCredits] = useState<string>('0');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    txHash?: string;
  } | null>(null);

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [telemetryProposal, setTelemetryProposal] = useState<PolicyProposal | null>(null);
  const [disputeProposal, setDisputeProposal] = useState<PolicyProposal | null>(null);

  // Notify helper
  const notify = (type: 'success' | 'error' | 'info', message: string, txHash?: string) => {
    setStatusNotification({ type, message, txHash });
    if (type !== 'info') {
      setTimeout(() => setStatusNotification(null), 8000);
    }
  };

  // Auto-connect wallet
  useEffect(() => {
    autoCheckWalletConnection().then(({ address }) => {
      if (address) setAccount(address);
    });

    const cleanup = setupWalletListeners((newAccount) => {
      setAccount(newAccount);
    });
    return cleanup;
  }, []);

  // Save contract address
  const handleUpdateContract = (addr: string) => {
    setContractAddress(addr);
    localStorage.setItem('aegisgov_contract_address', addr);
    notify('info', `Updated contract address to ${addr}`);
  };

  // Fetch contract state
  const refreshState = useCallback(async () => {
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      return;
    }

    setIsLoadingProposals(true);
    try {
      const liveProposals = await readProposalsFromChain(contractAddress);
      if (liveProposals && liveProposals.length > 0) {
        setProposals(liveProposals);
      }

      if (account) {
        const credits = await readWithdrawableCredits(contractAddress, account);
        setWithdrawableCredits(credits);
      }
    } catch (err: any) {
      console.warn('Failed to load contract state:', err);
    } finally {
      setIsLoadingProposals(false);
    }
  }, [contractAddress, account]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // Connect Wallet
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      const { address } = await connectMetaMaskWallet();
      setAccount(address);
      notify('success', `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
    } catch (err: any) {
      notify('error', err.message || 'Failed to connect MetaMask');
    } finally {
      setIsConnecting(false);
    }
  };

  // 1. Register Grant
  const handleRegisterGrant = async (params: {
    proposalId: string;
    targetAgentId: string;
    agentOperator: string;
    grantAmountGen: string;
    specUrl: string;
    specHash: string;
    safetyRules: string;
    blacklisted: string;
    validityDays: number;
  }) => {
    if (!account) throw new Error('Please connect your MetaMask wallet first.');
    const valueWei = parseGenToWei(params.grantAmountGen);

    setIsActionLoading(true);
    notify('info', 'Registering governance grant escrow on GenLayer Studionet...');
    try {
      const result = await writeContractOnChain(
        contractAddress,
        'register_governance_grant',
        [
          params.proposalId,
          params.targetAgentId,
          params.agentOperator,
          params.specUrl,
          params.specHash,
          params.safetyRules,
          params.blacklisted,
          BigInt(params.validityDays),
        ],
        valueWei,
        'studionet',
        account
      );

      notify('success', `Governance grant ${params.proposalId} registered!`, result.txHash);
      await refreshState();
    } catch (err: any) {
      notify('error', err.message || 'Transaction failed');
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  // 2. Submit Telemetry
  const handleSubmitTelemetry = async (proposalId: string, logUrl: string, logHash: string) => {
    if (!account) throw new Error('Please connect your MetaMask wallet first.');

    setIsActionLoading(true);
    notify('info', 'Executing GenLayer validator consensus audit across nodes...');
    try {
      const result = await writeContractOnChain(
        contractAddress,
        'submit_compliance_telemetry',
        [proposalId, logUrl, logHash],
        '0',
        'studionet',
        account
      );

      notify('success', `Validator consensus audit completed for ${proposalId}!`, result.txHash);
      await refreshState();
    } catch (err: any) {
      notify('error', err.message || 'Telemetry submission failed');
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  // 3. Raise Dispute
  const handleRaiseDispute = async (proposalId: string, reason: string) => {
    if (!account) throw new Error('Please connect your MetaMask wallet first.');

    setIsActionLoading(true);
    notify('info', 'Submitting dispute challenge to freeze grant disbursement...');
    try {
      const result = await writeContractOnChain(
        contractAddress,
        'raise_compliance_dispute',
        [proposalId, reason],
        '0',
        'studionet',
        account
      );

      notify('success', `Dispute recorded for proposal ${proposalId}. Escrow frozen.`, result.txHash);
      await refreshState();
    } catch (err: any) {
      notify('error', err.message || 'Dispute transaction failed');
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  // 4. Finalize Disbursement
  const handleFinalizeDisbursement = async (proposalId: string) => {
    if (!account) {
      notify('error', 'Please connect your MetaMask wallet first.');
      return;
    }

    setIsActionLoading(true);
    notify('info', 'Settling grant disbursement into Operator credit vault...');
    try {
      const result = await writeContractOnChain(
        contractAddress,
        'finalize_grant_disbursement',
        [proposalId],
        '0',
        'studionet',
        account
      );

      notify('success', `Grant disbursement settled into withdrawable credits!`, result.txHash);
      await refreshState();
    } catch (err: any) {
      notify('error', err.message || 'Finalization failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 5. Recover Expired
  const handleRecoverExpired = async (proposalId: string) => {
    if (!account) {
      notify('error', 'Please connect your MetaMask wallet first.');
      return;
    }

    setIsActionLoading(true);
    notify('info', 'Reclaiming expired escrow back to Sponsor vault...');
    try {
      const result = await writeContractOnChain(
        contractAddress,
        'recover_expired_grant',
        [proposalId],
        '0',
        'studionet',
        account
      );

      notify('success', `Expired grant recovered into Sponsor withdrawable vault!`, result.txHash);
      await refreshState();
    } catch (err: any) {
      notify('error', err.message || 'Recovery failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 6. Withdraw Credits
  const handleWithdrawCredits = async () => {
    if (!account) {
      notify('error', 'Please connect your MetaMask wallet first.');
      return;
    }

    setIsActionLoading(true);
    notify('info', 'Pulling native GEN from credit vault to wallet...');
    try {
      const result = await writeContractOnChain(
        contractAddress,
        'withdraw_credits',
        [],
        '0',
        'studionet',
        account
      );

      notify('success', 'Native GEN credits withdrawn successfully!', result.txHash);
      await refreshState();
    } catch (err: any) {
      notify('error', err.message || 'Withdrawal failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Load Scenario into Modal
  const handleSelectScenario = (scenario: DemoScenario) => {
    setIsRegisterOpen(true);
  };

  // Filter proposals
  const filteredProposals = proposals.filter((p) => {
    const matchesFilter = filterStatus === 'ALL' || p.status === filterStatus;
    const matchesSearch = 
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.target_agent_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sponsor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.agent_operator.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        account={account}
        isConnecting={isConnecting}
        onConnectWallet={handleConnectWallet}
        contractAddress={contractAddress}
        onUpdateContractAddress={handleUpdateContract}
        network="studionet"
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Status Toast Banner */}
        {statusNotification && (
          <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-4 duration-200 ${
            statusNotification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : statusNotification.type === 'error'
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200'
          }`}>
            <div className="flex items-center gap-2.5">
              {statusNotification.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : statusNotification.type === 'error' ? (
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              ) : (
                <RefreshCw className="h-5 w-5 text-cyan-400 animate-spin shrink-0" />
              )}
              <span className="text-xs font-medium">{statusNotification.message}</span>
            </div>
            {statusNotification.txHash && (
              <a
                href={`https://studio.genlayer.com/tx/${statusNotification.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono underline hover:text-white flex items-center gap-1 shrink-0"
              >
                View Explorer <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {/* Hero Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Autonomous AI Safe-Harbor
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Real-Time AI Governance & Regulatory Protocol
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Eliminating counterparty trust risk for AI agent grants. Escrow milestone disbursements are strictly unlocked by GenLayer validator consensus auditing live execution telemetry against immutable constitutional specifications.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshState}
              disabled={isLoadingProposals}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
              title="Refresh contract state"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingProposals ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition"
            >
              <Plus className="h-4 w-4" />
              Create Governance Grant
            </button>
          </div>
        </div>

        {/* Global Statistics Bar */}
        <StatsBar
          proposals={proposals}
          withdrawableCredits={withdrawableCredits}
          onOpenVault={() => {
            const el = document.getElementById('vault-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Withdrawable Vault Panel */}
        <div id="vault-section">
          <VaultCard
            withdrawableCredits={withdrawableCredits}
            onWithdraw={handleWithdrawCredits}
            isWithdrawing={isActionLoading}
            userAddress={account}
          />
        </div>

        {/* Judge Interactive Test Bench */}
        <DemoScenarioCard onSelectScenario={handleSelectScenario} />

        {/* Proposals Explorer Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-tight">Active Policy Grants</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {filteredProposals.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID or Agent..."
                className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-48 sm:w-56"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              {['ALL', 'ACTIVE', 'EVALUATING', 'RELEASED', 'SLASHED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    filterStatus === st
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Proposal Cards List */}
        <div className="space-y-4">
          {filteredProposals.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <Shield className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">No governance grants found</p>
              <p className="text-xs text-slate-500 mt-1">Create a new grant or select one of the benchmark scenarios above.</p>
            </div>
          ) : (
            filteredProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                currentUser={account}
                onSubmitTelemetry={(p) => setTelemetryProposal(p)}
                onRaiseDispute={(p) => setDisputeProposal(p)}
                onFinalizeDisbursement={handleFinalizeDisbursement}
                onRecoverExpired={handleRecoverExpired}
                isActionLoading={isActionLoading}
              />
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 mt-16 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-400" />
            <span className="font-bold text-slate-300">AegisGov Protocol</span>
            <span>— GenLayer Autonomous AI Governance Safe-Harbor</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition"
            >
              GenLayer Studio
            </a>
            <a
              href="https://docs.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition"
            >
              Documentation
            </a>
            <span className="font-mono text-cyan-400/80">v0.2.23 (Studionet)</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegister={handleRegisterGrant}
        isLoading={isActionLoading}
      />

      <TelemetryModal
        isOpen={!!telemetryProposal}
        proposal={telemetryProposal}
        onClose={() => setTelemetryProposal(null)}
        onSubmit={handleSubmitTelemetry}
        isLoading={isActionLoading}
      />

      <DisputeModal
        isOpen={!!disputeProposal}
        proposal={disputeProposal}
        onClose={() => setDisputeProposal(null)}
        onSubmitDispute={handleRaiseDispute}
        isLoading={isActionLoading}
      />
    </div>
  );
};
