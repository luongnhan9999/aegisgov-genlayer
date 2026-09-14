import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Plus, RefreshCw, AlertCircle, CheckCircle2, 
  ExternalLink, Layers, Search, Sparkles, Terminal, ChevronDown, ChevronUp,
  Scale, Landmark, ShieldCheck, Lock, Gavel, AlertTriangle, Zap
} from 'lucide-react';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { VaultCard } from './components/VaultCard';
import { ProposalCard } from './components/ProposalCard';
import { DemoScenarioCard } from './components/DemoScenarioCard';
import { RegisterModal } from './components/RegisterModal';
import { TelemetryModal } from './components/TelemetryModal';
import { DisputeModal } from './components/DisputeModal';
import { AppealModal } from './components/AppealModal';
import { ConsensusProgressModal } from './components/ConsensusProgressModal';

import type { PolicyProposal, DemoScenario } from './types';
import { DEFAULT_CONTRACT_ADDRESS, DEMO_SCENARIOS } from './types';
import { 
  connectMetaMaskWallet, 
  autoCheckWalletConnection, 
  setupWalletListeners,
  fetchWalletBalance,
  disconnectWalletSession,
  getConnectedChainId,
  isStudionetChain,
  ensureStudionetNetwork
} from './utils/web3';
import { 
  readProposalsFromChain, 
  readWithdrawableCredits, 
  writeContractOnChain,
  saveInitialGrantAmount
} from './utils/genlayer';
import { parseGenToWei } from './utils/format';

export const App: React.FC = () => {
  const [account, setAccount] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState<string>('0 GEN');
  const [isConnecting, setIsConnecting] = useState(false);
  const [contractAddress, setContractAddress] = useState<string>(() => {
    const saved = localStorage.getItem('aegisgov_contract_address');
    if (saved && (saved.toLowerCase() === '0x5b1162a178715bb6a11d0bccdf1cb75da8a7ec32' || saved.toLowerCase() === '0x0000000000000000000000000000000000000000')) {
      localStorage.setItem('aegisgov_contract_address', DEFAULT_CONTRACT_ADDRESS);
      return DEFAULT_CONTRACT_ADDRESS;
    }
    return saved || DEFAULT_CONTRACT_ADDRESS;
  });

  const [currentChainId, setCurrentChainId] = useState<string | null>(null);
  const isWrongNetwork = !!(account && currentChainId && !isStudionetChain(currentChainId));

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
  const [appealProposal, setAppealProposal] = useState<PolicyProposal | null>(null);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDiagnosticLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 30)]);
  };

  // Switch MetaMask to GenLayer Studionet (GEN)
  const handleSwitchNetwork = async () => {
    try {
      addLog('Requesting MetaMask switch to GenLayer Studionet (Chain 61999, Currency: GEN)...');
      await ensureStudionetNetwork();
      const chain = await getConnectedChainId();
      setCurrentChainId(chain);
      if (account) {
        const bal = await fetchWalletBalance(account);
        setWalletBalance(bal);
      }
      addLog('MetaMask successfully aligned to GenLayer Studionet (GEN)!');
    } catch (err: any) {
      addLog(`[Network Switch Error]: ${err.message}`);
      alert(err.message || 'Failed to switch network to GenLayer Studionet.');
    }
  };

  // Auto-connect wallet on load & check network
  useEffect(() => {
    addLog('AegisGov Court session initialized. Querying GenLayer Studionet (Chain 61999)...');
    
    getConnectedChainId().then((chain) => {
      setCurrentChainId(chain);
      if (chain && !isStudionetChain(chain)) {
        addLog(`[Network Warning] MetaMask is connected to chain ${chain}. Switch to GenLayer Studionet (61999) to transact with GEN.`);
      }
    });

    autoCheckWalletConnection().then(({ address, balance }) => {
      if (address) {
        setAccount(address);
        setWalletBalance(balance);
        addLog(`Signer verified: ${address} | Balance: ${balance}`);
      } else {
        addLog('Signer unattached. Ready for MetaMask authorization.');
      }
    });

    const cleanup = setupWalletListeners(
      (newAccount) => {
        setAccount(newAccount);
        if (newAccount) {
          fetchWalletBalance(newAccount).then(setWalletBalance);
          addLog(`Signer updated: ${newAccount}`);
        } else {
          setWalletBalance('0 GEN');
          addLog('Signer detached.');
        }
      },
      (chainId) => {
        addLog(`MetaMask active chain changed: ${chainId}`);
        setCurrentChainId(chainId);
        if (account) {
          fetchWalletBalance(account).then(setWalletBalance);
        }
      }
    );
    return cleanup;
  }, []);

  // Save contract address
  const handleUpdateContract = (addr: string) => {
    setContractAddress(addr);
    localStorage.setItem('aegisgov_contract_address', addr);
    addLog(`Target court docket address updated: ${addr}`);
  };

  // Fetch contract state strictly from blockchain
  const refreshState = useCallback(async () => {
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      addLog('Docket contract address not set. Paste deployed contract address in the header.');
      return;
    }

    setIsLoadingProposals(true);
    addLog(`Polling court state from Intelligent Contract ${contractAddress}...`);
    try {
      const liveProposals = await readProposalsFromChain(contractAddress);
      setProposals(liveProposals);
      addLog(`Query synchronized: ${liveProposals.length} active court cases loaded from Studionet.`);

      if (account) {
        const credits = await readWithdrawableCredits(contractAddress, account);
        setWithdrawableCredits(credits);
        const bal = await fetchWalletBalance(account);
        setWalletBalance(bal);
      }
    } catch (err: any) {
      addLog(`[Error] Failed to read on-chain state: ${err.message}`);
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
    addLog('Requesting MetaMask authorization on Studionet (GEN)...');
    try {
      const { address, balance } = await connectMetaMaskWallet();
      setAccount(address);
      setWalletBalance(balance);
      const chain = await getConnectedChainId();
      setCurrentChainId(chain);
      addLog(`Wallet attached: ${address} | Balance: ${balance}`);
    } catch (err: any) {
      addLog(`[Auth Error] ${err.message}`);
      alert(err.message || 'Failed to connect MetaMask');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Wallet
  const handleDisconnectWallet = () => {
    disconnectWalletSession();
    setAccount('');
    setWalletBalance('0 GEN');
    setWithdrawableCredits('0');
    addLog('Signer session detached. Local credentials purged.');
  };

  // Manual Refresh Balance from Studionet RPC
  const handleRefreshBalance = async () => {
    if (!account) return;
    addLog('Synchronizing balance directly from GenLayer Studionet RPC...');
    try {
      const bal = await fetchWalletBalance(account);
      setWalletBalance(bal);
      addLog(`Studionet balance updated: ${bal}`);
    } catch (e: any) {
      addLog(`Failed to refresh balance: ${e.message}`);
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
      stage: 'Awaiting signature to register court grant escrow...',
    });
    addLog(`Signing register_governance_grant (${params.proposalId}, Escrow: ${params.grantAmountGen} GEN)...`);

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
      saveInitialGrantAmount(params.proposalId, valueWei);

      setConsensusState({
        isOpen: true,
        stage: `Case #${params.proposalId} successfully docketed on-chain with ${params.grantAmountGen} GEN escrow!`,
        txHash: result.txHash,
      });
      addLog(`[Finality] Escrow confirmed on Studionet! Hash: ${result.txHash}`);
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

    const targetProp = proposals.find((p) => p.id === proposalId);
    if (targetProp && account.toLowerCase() !== targetProp.agent_operator.toLowerCase()) {
      const msg = `Permission Denied: Only the designated Agent Operator (${targetProp.agent_operator}) can submit telemetry for this docket.\n\nYour connected account is: ${account}.\n\nPlease switch to the Operator account in MetaMask.`;
      alert(msg);
      throw new Error(msg);
    }

    setIsActionLoading(true);
    setConsensusState({
      isOpen: true,
      stage: 'Submitting telemetry audit to GenLayer Studionet...',
    });
    addLog(`Submitting execution telemetry for Case #${proposalId} (SHA-256: ${logHash.slice(0, 10)}...)...`);

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
        stage: `Supreme Validator Consensus completed for #${proposalId}! Decree recorded on-chain.`,
        txHash: result.txHash,
      });
      addLog(`[Decree Finalized] Hash: ${result.txHash}`);
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

    const targetProp = proposals.find((p) => p.id === proposalId);
    if (targetProp && account.toLowerCase() !== targetProp.sponsor.toLowerCase()) {
      const msg = `Permission Denied: Only the DAO Court Sponsor (${targetProp.sponsor}) who funded this escrow can challenge an evaluation decree.\n\nYour connected account is: ${account}.\n\nPlease switch to the Sponsor account in MetaMask.`;
      alert(msg);
      throw new Error(msg);
    }

    setIsActionLoading(true);
    setConsensusState({
      isOpen: true,
      stage: 'Submitting dispute challenge to freeze grant disbursement...',
    });
    addLog(`Sponsor challenging evaluation decree for #${proposalId}...`);

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
        stage: `Challenge recorded on-chain. Case #${proposalId} escrow frozen.`,
        txHash: result.txHash,
      });
      addLog(`[Dispute Frozen] Hash: ${result.txHash}`);
      await refreshState();
    } catch (err: any) {
      setConsensusState({
        isOpen: true,
        stage: 'Dispute submission failed',
        error: err.message || 'Transaction rejected',
      });
      addLog(`[Dispute Error] ${err.message}`);
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  // 3b. Submit Judicial Appeal & Validator Re-audit
  const handleAppealDispute = async (proposalId: string, evidenceUrl: string, evidenceHash: string) => {
    if (!account) throw new Error('Please connect your MetaMask wallet first.');
    if (!contractAddress) throw new Error('Contract address not configured.');

    setIsActionLoading(true);
    setConsensusState({
      isOpen: true,
      stage: 'Submitting judicial appeal to GenLayer supreme validator quorum...',
    });
    addLog(`Filing dispute appeal for Docket #${proposalId} with counter-evidence...`);

    try {
      const result = await writeContractOnChain(
        contractAddress,
        'appeal_and_reaudit',
        [proposalId, evidenceUrl, evidenceHash],
        '0',
        'studionet',
        account,
        (stage) => {
          setConsensusState((prev) => ({ ...prev, stage }));
          addLog(`[Judicial Appeal] ${stage}`);
        }
      );

      setConsensusState({
        isOpen: true,
        stage: `Supreme Validator Consensus finalized for #${proposalId}! Dispute decree recorded.`,
        txHash: result.txHash,
      });
      addLog(`[Appeal Decreed] Hash: ${result.txHash}`);
      await refreshState();
    } catch (err: any) {
      setConsensusState({
        isOpen: true,
        stage: 'Appeal consensus audit failed',
        error: err.message || 'Validator consensus disagreement or execution failure',
      });
      addLog(`[Appeal Error] ${err.message}`);
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  // 3c. Dismiss Dispute Amicably (For Sponsor)
  const handleDismissDispute = async (proposalId: string) => {
    if (!account) return alert('Please connect MetaMask first.');

    const targetProp = proposals.find((p) => p.id === proposalId);
    if (targetProp && account.toLowerCase() !== targetProp.sponsor.toLowerCase()) {
      return alert(`Permission Denied: Only the DAO Court Sponsor (${targetProp.sponsor}) can dismiss a dispute challenge.\n\nYour current account is: ${account}.`);
    }

    setIsActionLoading(true);
    setConsensusState({
      isOpen: true,
      stage: 'Dismissing dispute challenge and releasing milestone escrow to Operator...',
    });
    addLog(`Sponsor withdrawing dispute for #${proposalId}...`);

    try {
      const result = await writeContractOnChain(
        contractAddress,
        'dismiss_dispute_and_release',
        [proposalId],
        '0',
        'studionet',
        account,
        (stage) => {
          setConsensusState((prev) => ({ ...prev, stage }));
          addLog(`[Dismiss Dispute] ${stage}`);
        }
      );

      setConsensusState({
        isOpen: true,
        stage: `Dispute amicably dismissed! Escrow unlocked to Operator credit vault.`,
        txHash: result.txHash,
      });
      addLog(`[Dispute Dismissed] Hash: ${result.txHash}`);
      await refreshState();
    } catch (err: any) {
      setConsensusState({
        isOpen: true,
        stage: 'Dismissal failed',
        error: err.message || 'Transaction rejected',
      });
      addLog(`[Dismissal Error] ${err.message}`);
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
    addLog(`Disbursing milestone grant for Case #${proposalId}...`);

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
          addLog(`[Disburse] ${stage}`);
        }
      );

      setConsensusState({
        isOpen: true,
        stage: `Capital settled into Operator withdrawable credit balance!`,
        txHash: result.txHash,
      });
      addLog(`[Disbursed] Hash: ${result.txHash}`);
      await refreshState();
    } catch (err: any) {
      setConsensusState({
        isOpen: true,
        stage: 'Finalization failed',
        error: err.message || '24-hour cooling-off window has not elapsed yet',
      });
      addLog(`[Finalize Error] ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  // 5. Recover Expired Grant
  const handleRecoverExpired = async (proposalId: string) => {
    if (!account) return alert('Please connect MetaMask first.');

    const targetProp = proposals.find((p) => p.id === proposalId);
    if (targetProp && account.toLowerCase() !== targetProp.sponsor.toLowerCase()) {
      return alert(`Permission Denied: Only the DAO Court Sponsor (${targetProp.sponsor}) can recover expired grant funds.\n\nYour current account is: ${account}.`);
    }

    setIsActionLoading(true);
    setConsensusState({
      isOpen: true,
      stage: 'Reclaiming abandoned grant escrow back to Sponsor vault...',
    });
    addLog(`Calling recover_expired_grant for #${proposalId}...`);

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
        stage: `Expired grant recovered into Sponsor vault!`,
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

  // 6. Withdraw Credits
  const handleWithdrawCredits = async () => {
    if (!account) return alert('Please connect MetaMask first.');

    setIsActionLoading(true);
    setConsensusState({
      isOpen: true,
      stage: 'Pulling native GEN from credit vault to your MetaMask wallet...',
    });
    addLog('Executing withdraw_credits() pull settlement...');

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
        stage: 'Native GEN credits withdrawn directly to MetaMask!',
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
    addLog(`Precedent loaded: '${scenario.title}'. Ready for on-chain docketing.`);
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
    <div className="min-h-screen bg-[#05070c] bg-judicial-grid text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Header */}
      <Header
        account={account}
        walletBalance={walletBalance}
        isConnecting={isConnecting}
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        onRefreshBalance={handleRefreshBalance}
        contractAddress={contractAddress}
        onUpdateContractAddress={handleUpdateContract}
        network="studionet"
        isWrongNetwork={isWrongNetwork}
        onSwitchNetwork={handleSwitchNetwork}
      />

      {/* Wrong Network Warning Banner */}
      {isWrongNetwork && (
        <div className="bg-gradient-to-r from-red-950 via-rose-950 to-amber-950 border-b-2 border-rose-500 px-4 py-3.5 text-white shadow-2xl relative z-30 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <AlertTriangle className="h-5 w-5 text-rose-400 animate-pulse" />
              </span>
              <div className="text-xs leading-relaxed">
                <div className="font-bold text-rose-200 text-sm flex items-center gap-2">
                  Incompatible Network Detected in MetaMask (Showing ETH)!
                </div>
                <p className="text-slate-300 mt-0.5">
                  Your MetaMask is currently set to{' '}
                  <span className="font-mono bg-rose-950 px-1.5 py-0.5 rounded border border-rose-500/30 text-rose-300 font-bold">
                    {currentChainId === '0x2105' ? 'Base (8453)' : currentChainId}
                  </span>
                  , which calculates gas in <strong className="text-rose-400">ETH</strong> and flags contract addresses as untrusted. AegisGov runs strictly on{' '}
                  <strong className="text-amber-400">GenLayer Studionet (Chain 61999)</strong> using native{' '}
                  <strong className="text-amber-400">GEN tokens</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={handleSwitchNetwork}
              className="shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs shadow-xl shadow-amber-500/30 transition cursor-pointer flex items-center gap-2"
            >
              <Zap className="h-4 w-4 fill-current" />
              Switch MetaMask to GenLayer Studionet (GEN)
            </button>
          </div>
        </div>
      )}

      {/* Main Judicial Chamber */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 w-full">
        {/* Unconfigured Alert */}
        {(!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') && (
          <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-transparent border border-amber-500/40 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <strong className="block font-cinzel text-sm text-white">Court Docket Contract Unspecified</strong>
                <span className="text-slate-300">
                  Deploy <code>contracts/AegisGov.py</code> on GenLayer Studio, then click <strong>Edit</strong> in the navbar to connect your live court contract.
                </span>
              </div>
            </div>
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold hover:from-amber-400 hover:to-amber-500 transition text-xs shrink-0 shadow-lg shadow-amber-500/10"
            >
              Open Studio &rarr;
            </a>
          </div>
        )}

        {/* Supreme Judicial Hero Masthead */}
        <div className="mb-10 rounded-3xl bg-gradient-to-br from-[#0c0f1a] via-[#080b12] to-[#05070c] border border-amber-500/30 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Background Atmospheric Glows */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-widest font-mono mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping"></span>
                Supreme AI Governance Safe-Harbor Court
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-cinzel text-white tracking-wide leading-tight">
                Autonomous AI Governance &amp; <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">Safe-Harbor</span> Protocol
              </h2>

              <p className="text-xs sm:text-sm text-slate-300/90 mt-3 leading-relaxed max-w-2xl font-sans">
                A real-time on-chain judicial court protecting capital allocators and autonomous agents. Capital grants are secured in non-custodial escrow and unlocked only when GenLayer validator consensus audits off-chain telemetry against immutable constitutional specifications.
              </p>

              {/* Constitutional Perimeter Badges */}
              <div className="mt-6 flex flex-wrap items-center gap-2.5 text-[11px] font-mono">
                <span className="px-3 py-1 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                  Zero-Normalization Fail-Closed Parsing
                </span>
                <span className="px-3 py-1 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                  Authoritative SHA-256 Pinning
                </span>
                <span className="px-3 py-1 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  24H Cooling-Off Dispute Safe-Harbor
                </span>
              </div>
            </div>

            {/* Emblem Hologram Visual */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-4 shrink-0">
              <div className="relative group">
                <div className="h-40 w-40 sm:h-44 sm:w-44 rounded-3xl overflow-hidden border-2 border-amber-500/40 shadow-2xl shadow-amber-500/20 group-hover:border-amber-400 transition-all duration-300">
                  <img
                    src="/aegisgov_emblem.jpg"
                    alt="AegisGov Holographic Seal"
                    className="h-full w-full object-cover object-center group-hover:scale-105 transition-all duration-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={refreshState}
                  disabled={isLoadingProposals}
                  className="p-2.5 rounded-2xl bg-slate-900/90 border border-amber-500/20 hover:border-amber-500/40 text-slate-300 hover:text-white transition disabled:opacity-50"
                  title="Refresh state from Studionet block"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingProposals ? 'animate-spin text-amber-400' : ''}`} />
                </button>
                <button
                  onClick={() => {
                    setActiveScenario(null);
                    setIsRegisterOpen(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs shadow-xl shadow-amber-500/25 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Docket New Case
                </button>
              </div>
            </div>
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

        {/* Withdrawable Sovereign Vault */}
        <div id="vault-section">
          <VaultCard
            withdrawableCredits={withdrawableCredits}
            onWithdraw={handleWithdrawCredits}
            isWithdrawing={isActionLoading}
            userAddress={account}
          />
        </div>

        {/* Judicial Precedents Test Bench for Judges */}
        <DemoScenarioCard onSelectScenario={handleSelectScenario} />

        {/* Proposals Explorer Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <Scale className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-bold font-cinzel text-white tracking-wider uppercase">
              On-Chain Judicial Dockets
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 border border-amber-500/30 text-amber-300 font-mono">
              {filteredProposals.length} active
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
                placeholder="Search Docket ID or Agent..."
                className="pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 w-52 sm:w-60 font-mono"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono overflow-x-auto">
              {['ALL', 'ACTIVE', 'EVALUATING', 'DISPUTED', 'RELEASED', 'SLASHED', 'EXPIRED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                    filterStatus === st
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Case Dockets Cards List (100% Real On-Chain) */}
        <div className="space-y-5">
          {filteredProposals.length === 0 ? (
            <div className="text-center py-20 rounded-3xl bg-gradient-to-br from-[#0c0f18] to-[#07090e] border border-amber-500/20 p-8">
              <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto mb-4">
                <Gavel className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-bold font-cinzel text-white tracking-wide">
                No Judicial Cases Docketed On-Chain
              </h4>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                The smart contract currently has 0 proposals registered on GenLayer Studionet. Connect your MetaMask wallet and select a verified precedent above to docket your first real on-chain case!
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5">
                <button
                  onClick={() => handleSelectScenario(DEMO_SCENARIOS[0])}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold border border-amber-500/30 transition shadow-lg cursor-pointer"
                >
                  Docket Compliant Yield Bot (1 GEN)
                </button>
                <button
                  onClick={() => {
                    setActiveScenario(null);
                    setIsRegisterOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  Create Custom Case Docket
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
                onAppealDispute={(p) => setAppealProposal(p)}
                onDismissDispute={handleDismissDispute}
                onFinalizeDisbursement={handleFinalizeDisbursement}
                onRecoverExpired={handleRecoverExpired}
                isActionLoading={isActionLoading}
              />
            ))
          )}
        </div>

        {/* Live Web3 Diagnostic Console */}
        <div className="mt-14 rounded-3xl bg-[#07090e] border border-amber-500/20 overflow-hidden shadow-2xl">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="w-full px-6 py-3.5 flex items-center justify-between bg-slate-950/80 hover:bg-slate-900 transition text-left text-xs font-semibold text-slate-300"
          >
            <div className="flex items-center gap-2.5">
              <Terminal className="h-4 w-4 text-amber-400" />
              <span className="font-mono">Live Web3 Telemetry &amp; Quorum Ledger ({diagnosticLogs.length} events)</span>
            </div>
            {showLogs ? <ChevronUp className="h-4 w-4 text-amber-400" /> : <ChevronDown className="h-4 w-4 text-amber-400" />}
          </button>
          {showLogs && (
            <div className="p-5 bg-black/70 font-mono text-[11px] text-slate-400 max-h-60 overflow-y-auto space-y-1.5 border-t border-slate-800">
              {diagnosticLogs.map((log, index) => (
                <div key={index} className="leading-relaxed hover:text-amber-300 transition">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-amber-500/20 bg-[#05070c] py-7 mt-20 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg overflow-hidden border border-amber-500/30">
              <img src="/aegisgov_emblem.jpg" alt="AegisGov" className="h-full w-full object-cover" />
            </div>
            <span className="font-cinzel font-bold text-white tracking-wider">AegisGov Judicial Protocol</span>
            <span className="text-slate-500">— Autonomous AI Safe-Harbor on GenLayer</span>
          </div>
          <div className="flex items-center gap-5 text-slate-400 font-mono text-[11px]">
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-400 transition"
            >
              GenLayer Studio
            </a>
            <a
              href="https://docs.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-400 transition"
            >
              Docs
            </a>
            <span className="text-amber-400 font-bold">Studionet 61999 (0xF1EF)</span>
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
        currentUser={account}
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

      <AppealModal
        isOpen={!!appealProposal}
        proposal={appealProposal}
        onClose={() => setAppealProposal(null)}
        onSubmitAppeal={handleAppealDispute}
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
