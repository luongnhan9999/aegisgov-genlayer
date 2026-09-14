import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Plus, RefreshCw, AlertCircle, CheckCircle2, 
  ExternalLink, Layers, Search, Sparkles, Terminal, ChevronDown, ChevronUp
} from 'lucide-react';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { VaultCard } from './components/VaultCard';
import { ProposalCard } from './components/ProposalCard';
import { DemoScenarioCard } from './components/DemoScenarioCard';
import { RegisterModal } from './components/RegisterModal';
import { TelemetryModal } from './components/TelemetryModal';
import { DisputeModal } from './components/DisputeModal';
import { ConsensusProgressModal } from './components/ConsensusProgressModal';

import type { PolicyProposal, DemoScenario } from './types';
import { DEFAULT_CONTRACT_ADDRESS, DEMO_SCENARIOS } from './types';
import { 
  connectMetaMaskWallet, 
  autoCheckWalletConnection, 
  setupWalletListeners,
  fetchWalletBalance 
} from './utils/web3';
import { 
  readProposalsFromChain, 
  readWithdrawableCredits, 
  writeContractOnChain 
} from './utils/genlayer';
import { parseGenToWei } from './utils/format';

export const App: React.FC = () => {
  const [account, setAccount] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState<string>('0 GEN');
  const [isConnecting, setIsConnecting] = useState(false);
  const [contractAddress, setContractAddress] = useState<string>(() => {
    return localStorage.getItem('aegisgov_contract_address') || DEFAULT_CONTRACT_ADDRESS;
  });

  const [proposals, setProposals] = useState<PolicyProposal[]>([]);
  const [withdrawableCredits, setWithdrawableCredits] = useState<string>('0');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Real-time Consensus & Notification states
  const [consensusState, setConsensusState] = useState<{
    isOpen: boolean;
    stage: string;
    txHash?: string;
    error?: string | null;
  }>({
    isOpen: false,
    stage: '',
  });

  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [activeScenario, setActiveScenario] = useState<DemoScenario | null>(null);
  const [telemetryProposal, setTelemetryProposal] = useState<PolicyProposal | null>(null);
  const [disputeProposal, setDisputeProposal] = useState<PolicyProposal | null>(null);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDiagnosticLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 30)]);
  };

  // Auto-connect wallet on load
  useEffect(() => {
    addLog('Checking MetaMask wallet session on GenLayer Studionet (Chain ID 61999)...');
    autoCheckWalletConnection().then(({ address, balance }) => {
      if (address) {
        setAccount(address);
        setWalletBalance(balance);
        addLog(`MetaMask session restored: ${address} | Balance: ${balance}`);
      } else {
        addLog('No active wallet session. Ready for connection.');
      }
    });

    const cleanup = setupWalletListeners(
      (newAccount) => {
        setAccount(newAccount);
        if (newAccount) {
          fetchWalletBalance(newAccount).then(setWalletBalance);
          addLog(`Active account changed: ${newAccount}`);
        } else {
          setWalletBalance('0 GEN');
          addLog('Wallet disconnected');
        }
      },
      (chainId) => {
        addLog(`MetaMask chain changed: ${chainId}`);
      }
    );
    return cleanup;
  }, []);

  // Save contract address
  const handleUpdateContract = (addr: string) => {
    setContractAddress(addr);
    localStorage.setItem('aegisgov_contract_address', addr);
    addLog(`Target contract address updated: ${addr}`);
  };

  // Fetch contract state strictly from blockchain
  const refreshState = useCallback(async () => {
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      addLog('Contract address not set. Paste your deployed contract address above.');
      return;
    }

    setIsLoadingProposals(true);
    addLog(`Reading on-chain state from Intelligent Contract ${contractAddress}...`);
    try {
      const liveProposals = await readProposalsFromChain(contractAddress);
      setProposals(liveProposals);
      addLog(`Query completed: Loaded ${liveProposals.length} proposals directly from Studionet.`);

      if (account) {
        const credits = await readWithdrawableCredits(contractAddress, account);
        setWithdrawableCredits(credits);
        const bal = await fetchWalletBalance(account);
        setWalletBalance(bal);
      }
    } catch (err: any) {
      addLog(`[Error] Failed to read contract state: ${err.message}`);
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
    addLog('Requesting MetaMask connection on GenLayer Studionet...');
    try {
      const { address, balance } = await connectMetaMaskWallet();
      setAccount(address);
      setWalletBalance(balance);
      addLog(`Wallet connected successfully: ${address} | Balance: ${balance}`);
    } catch (err: any) {
      addLog(`[Wallet Error] ${err.message}`);
      alert(err.message || 'Failed to connect MetaMask');
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
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('Please deploy or configure the AegisGov contract address in the header.');
    }

    const valueWei = parseGenToWei(params.grantAmountGen);
    setIsActionLoading(true);
    setConsensusState({
      isOpen: true,
      stage: 'Requesting MetaMask signature for register_governance_grant()...',
    });
    addLog(`Initiating register_governance_grant (${params.proposalId}, Escrow: ${params.grantAmountGen} GEN)...`);

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
        account,
        (stage) => {
          setConsensusState((prev) => ({ ...prev, stage }));
          addLog(`[Consensus] ${stage}`);
        }
      );

      setConsensusState({
        isOpen: true,
        stage: `Proposal ${params.proposalId} registered on-chain with ${params.grantAmountGen} GEN escrow!`,
        txHash: result.txHash,
      });
      addLog(`[Finality] Transaction accepted! Hash: ${result.txHash}`);
      await refreshState();
    } catch (err: any) {
      setConsensusState({
        isOpen: true,
        stage: 'Transaction failed',
        error: err.message || 'Transaction rejected on Studionet',
      });
      addLog(`[Tx Error] ${err.message}`);
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  // 2. Submit Telemetry (Triggers real GenLayer consensus audit)
  const handleSubmitTelemetry = async (proposalId: string, logUrl: string, logHash: string) => {
    if (!account) throw new Error('Please connect your MetaMask wallet first.');
    if (!contractAddress) throw new Error('Contract address not configured.');

    setIsActionLoading(true);
    setConsensusState({
      isOpen: true,
      stage: 'Submitting telemetry audit to GenLayer Studionet...',
    });
    addLog(`Operator submitting telemetry audit for ${proposalId} (Hash: ${logHash.slice(0, 10)}...)...`);

    try {
      const result = await writeContractOnChain(
        contractAddress,
        'submit_compliance_telemetry',
        [proposalId, logUrl, logHash],
        '0',
        'studionet',
        account,
        (stage) => {
          setConsensusState((prev) => ({ ...prev, stage }));
          addLog(`[Consensus Audit] ${stage}`);
        }
      );

      setConsensusState({
        isOpen: true,
        stage: `Consensus audit completed for ${proposalId}! Verdict recorded on-chain.`,
        txHash: result.txHash,
      });
      addLog(`[Audit Finalized] Hash: ${result.txHash}`);
      await refreshState();
    } catch (err: any) {
      setConsensusState({
        isOpen: true,
        stage: 'Consensus audit failed',
        error: err.message || 'Validator consensus disagreement or execution failure',
      });
      addLog(`[Audit Error] ${err.message}`);
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  // 3. Raise Dispute
  const handleRaiseDispute = async (proposalId: string, reason: string) => {
    if (!account) throw new Error('Please connect your MetaMask wallet first.');

    setIsActionLoading(true);
    setConsensusState({
      isOpen: true,
      stage: 'Submitting dispute challenge to freeze grant disbursement...',
    });
    addLog(`Sponsor raising dispute challenge for ${proposalId}...`);

    try {
      const result = await writeContractOnChain(
        contractAddress,
        'raise_compliance_dispute',
        [proposalId, reason],
        '0',
        'studionet',
        account,
        (stage) => {
          setConsensusState((prev) => ({ ...prev, stage }));
          addLog(`[Dispute] ${stage}`);
        }
      );

      setConsensusState({
        isOpen: true,
        stage: `Dispute accepted on-chain. Proposal ${proposalId} payout frozen.`,
        txHash: result.txHash,
      });
      addLog(`[Dispute Finalized] Hash: ${result.txHash}`);
      await refreshState();
    } catch (err: any) {
      setConsensusState({
        isOpen: true,
        stage: 'Dispute failed',
        error: err.message || 'Transaction rejected',
      });
      addLog(`[Dispute Error] ${err.message}`);
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  // 4. Finalize Disbursement
  const handleFinalizeDisbursement = async (proposalId: string) => {
    if (!account) return alert('Please connect MetaMask first.');

    setIsActionLoading(true);
    setConsensusState({
      isOpen: true,
      stage: 'Settling milestone disbursement into Operator credit vault...',
    });
    addLog(`Calling finalize_grant_disbursement for ${proposalId}...`);

    try {
      const result = await writeContractOnChain(
        contractAddress,
        'finalize_grant_disbursement',
        [proposalId],
        '0',
        'studionet',
        account,
        (stage) => {
          setConsensusState((prev) => ({ ...prev, stage }));
          addLog(`[Finalize] ${stage}`);
        }
      );

      setConsensusState({
        isOpen: true,
        stage: `Grant settled into Operator withdrawable balance!`,
        txHash: result.txHash,
      });
      addLog(`[Settled] Hash: ${result.txHash}`);
      await refreshState();
    } catch (err: any) {
      setConsensusState({
        isOpen: true,
        stage: 'Finalization failed',
        error: err.message || 'Cooling-off duration has not elapsed or unauthorized caller',
      });
      addLog(`[Finalize Error] ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  // 5. Recover Expired Grant
  const handleRecoverExpired = async (proposalId: string) => {
    if (!account) return alert('Please connect MetaMask first.');

    setIsActionLoading(true);
    setConsensusState({
      isOpen: true,
      stage: 'Reclaiming abandoned grant escrow back to Sponsor vault...',
    });
    addLog(`Calling recover_expired_grant for ${proposalId}...`);

    try {
      const result = await writeContractOnChain(
        contractAddress,
        'recover_expired_grant',
        [proposalId],
        '0',
        'studionet',
        account,
        (stage) => {
          setConsensusState((prev) => ({ ...prev, stage }));
          addLog(`[Recover] ${stage}`);
        }
      );

      setConsensusState({
        isOpen: true,
        stage: `Expired grant recovered into Sponsor withdrawable vault!`,
        txHash: result.txHash,
      });
      addLog(`[Recovered] Hash: ${result.txHash}`);
      await refreshState();
    } catch (err: any) {
      setConsensusState({
        isOpen: true,
        stage: 'Recovery failed',
        error: err.message || 'Grant expiry duration has not elapsed yet',
      });
      addLog(`[Recover Error] ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  // 6. Withdraw Credits (Pull settlement)
  const handleWithdrawCredits = async () => {
    if (!account) return alert('Please connect MetaMask first.');

    setIsActionLoading(true);
    setConsensusState({
      isOpen: true,
      stage: 'Pulling native GEN from credit vault directly to your wallet...',
    });
    addLog('Executing withdraw_credits() pull transfer...');

    try {
      const result = await writeContractOnChain(
        contractAddress,
        'withdraw_credits',
        [],
        '0',
        'studionet',
        account,
        (stage) => {
          setConsensusState((prev) => ({ ...prev, stage }));
          addLog(`[Withdraw] ${stage}`);
        }
      );

      setConsensusState({
        isOpen: true,
        stage: 'Native GEN credits withdrawn successfully to MetaMask!',
        txHash: result.txHash,
      });
      addLog(`[Withdrawal Complete] Hash: ${result.txHash}`);
      await refreshState();
    } catch (err: any) {
      setConsensusState({
        isOpen: true,
        stage: 'Withdrawal failed',
        error: err.message || 'No withdrawable balance available',
      });
      addLog(`[Withdraw Error] ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Select Scenario Preset
  const handleSelectScenario = (scenario: DemoScenario) => {
    setActiveScenario(scenario);
    setIsRegisterOpen(true);
    addLog(`Loaded preset '${scenario.title}' into registration modal.`);
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
      {/* Top Header with Real Balance & Contract Selector */}
      <Header
        account={account}
        walletBalance={walletBalance}
        isConnecting={isConnecting}
        onConnectWallet={handleConnectWallet}
        contractAddress={contractAddress}
        onUpdateContractAddress={handleUpdateContract}
        network="studionet"
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Real Network Status Notice */}
        {!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000' ? (
          <div className="mb-6 p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
              <span>
                <strong>Contract Address Not Configured</strong>: Deploy <code>contracts/AegisGov.py</code> via GenLayer Studio, then click <strong>Edit</strong> in the header to paste your contract address.
              </span>
            </div>
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition text-[11px] shrink-0"
            >
              Open GenLayer Studio &rarr;
            </a>
          </div>
        ) : null}

        {/* Hero Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Live On-Chain Protocol (Studionet)
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Real-Time AI Governance & Safe-Harbor Protocol
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Eliminating counterparty trust risk for AI agent grants. All milestone releases are authenticated on-chain by GenLayer validator consensus auditing live execution telemetry against immutable constitutional specifications.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshState}
              disabled={isLoadingProposals}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium"
              title="Query latest block state from Studionet"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingProposals ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh State</span>
            </button>
            <button
              onClick={() => {
                setActiveScenario(null);
                setIsRegisterOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition"
            >
              <Plus className="h-4 w-4" />
              Create Governance Grant
            </button>
          </div>
        </div>

        {/* Global Statistics Bar (Computed strictly from live on-chain proposals) */}
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

        {/* Judge Interactive Test Bench (Loads pre-configured valid data directly into forms) */}
        <DemoScenarioCard onSelectScenario={handleSelectScenario} />

        {/* Proposals Explorer Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-tight">On-Chain Policy Grants</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-mono">
              {filteredProposals.length} live
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
                placeholder="Search by Proposal ID or Agent..."
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

        {/* Proposals Cards List (100% Real on-chain data) */}
        <div className="space-y-4">
          {filteredProposals.length === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6">
              <Shield className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">No On-Chain Grants Recorded Yet</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                The smart contract currently has 0 proposals registered on GenLayer Studionet. Connect your MetaMask wallet and click below to lock your first autonomous grant escrow!
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => handleSelectScenario(DEMO_SCENARIOS[0])}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
                >
                  Load Compliant Yield Bot Preset (1 GEN)
                </button>
                <button
                  onClick={() => {
                    setActiveScenario(null);
                    setIsRegisterOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition"
                >
                  Create Custom Grant Escrow
                </button>
              </div>
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

        {/* Live Web3 Diagnostic Console */}
        <div className="mt-12 rounded-2xl bg-slate-950 border border-slate-800/90 overflow-hidden shadow-xl">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="w-full px-5 py-3 flex items-center justify-between bg-slate-900/60 hover:bg-slate-900 transition text-left text-xs font-semibold text-slate-300"
          >
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-cyan-400" />
              <span>Live Web3 Diagnostic & Consensus Console ({diagnosticLogs.length} events)</span>
            </div>
            {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showLogs && (
            <div className="p-4 bg-black/60 font-mono text-[11px] text-slate-400 max-h-60 overflow-y-auto space-y-1">
              {diagnosticLogs.map((log, index) => (
                <div key={index} className="leading-relaxed hover:text-slate-200">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 mt-16 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-400" />
            <span className="font-bold text-slate-300">AegisGov Protocol</span>
            <span>— Autonomous AI Governance on GenLayer Studionet</span>
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
              Docs
            </a>
            <span className="font-mono text-cyan-400/80">Chain ID: 61999 (0xF1EF)</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegister={handleRegisterGrant}
        isLoading={isActionLoading}
        initialScenario={activeScenario}
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

      <ConsensusProgressModal
        isOpen={consensusState.isOpen}
        stage={consensusState.stage}
        txHash={consensusState.txHash}
        error={consensusState.error}
        onClose={() => setConsensusState({ isOpen: false, stage: '' })}
      />
    </div>
  );
};
