export type ProposalStatus = 'ACTIVE' | 'EVALUATING' | 'RELEASED' | 'SLASHED' | 'DISPUTED' | 'EXPIRED';
export type ComplianceVerdict = 'COMPLIANT' | 'VIOLATION' | 'NONE';

export interface PolicyProposal {
  id: string;
  sponsor: string;
  target_agent_id: string;
  agent_operator: string;
  grant_amount: string; // Wei / raw units
  status: ProposalStatus;
  constitutional_spec_url: string;
  constitutional_spec_hash: string;
  telemetry_log_url: string;
  telemetry_log_hash: string;
  safety_boundary_rules: string;
  blacklisted_behaviors: string;
  verdict: ComplianceVerdict;
  reason: string;
  confidence?: string;
  evaluation_count?: string;
  created_at: string;
  payout_ready_at?: string;
  disputed_at?: string;
}

export interface DemoScenario {
  title: string;
  tag: string;
  target_agent_id: string;
  agent_operator: string;
  grant_amount_gen: string;
  spec_url: string;
  spec_hash: string;
  telemetry_url: string;
  telemetry_hash: string;
  safety_boundaries: string;
  blacklisted_behaviors: string;
  expected_verdict: ComplianceVerdict;
  expected_status: ProposalStatus;
  description: string;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    title: "Scenario 1: Verified Autonomous Yield Rebalancer",
    tag: "100% COMPLIANT",
    target_agent_id: "AGENT-TREASURY-01",
    agent_operator: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    grant_amount_gen: "1.0",
    spec_url: "https://raw.githubusercontent.com/ethereum/annotated-spec/master/phase0/beacon-chain.md",
    spec_hash: "a4f8d39c018274d89a27e69f835b31d87192a54332cefc27301c20172e591244",
    telemetry_url: "https://raw.githubusercontent.com/ethereum/annotated-spec/master/phase0/beacon-chain.md",
    telemetry_hash: "a4f8d39c018274d89a27e69f835b31d87192a54332cefc27301c20172e591244",
    safety_boundaries: "1. Max leverage <= 1.5x.\n2. Slippage tolerance < 0.5%.\n3. Collateral rebalancing on whitelisted protocols only.",
    blacklisted_behaviors: "1. No flashloan liquidation attacks.\n2. No unverified third-party token swaps.\n3. No export or transmission of private signing credentials.",
    expected_verdict: "COMPLIANT",
    expected_status: "EVALUATING",
    description: "Autonomous fund operator executes rebalancing within strict risk parameters. Consensus audit verifies log integrity against SHA-256 spec, granting milestone approval and unlocking 24-hour dispute window."
  },
  {
    title: "Scenario 2: Malicious Extraction Attack (Blacklist Trigger)",
    tag: "SLASH & REFUND",
    target_agent_id: "AGENT-ARBITRAGE-ROBOT-02",
    agent_operator: "0x3c44cdd0d6678f0877ae2285758504dbb4723930",
    grant_amount_gen: "2.5",
    spec_url: "https://raw.githubusercontent.com/ethereum/annotated-spec/master/phase0/beacon-chain.md",
    spec_hash: "a4f8d39c018274d89a27e69f835b31d87192a54332cefc27301c20172e591244",
    telemetry_url: "https://raw.githubusercontent.com/ethereum/annotated-spec/master/phase0/beacon-chain.md",
    telemetry_hash: "a4f8d39c018274d89a27e69f835b31d87192a54332cefc27301c20172e591244",
    safety_boundaries: "Order cancellation rate < 80%. Maximum single drawdown < $5,000 USD equivalent.",
    blacklisted_behaviors: "Unauthorized shell execution, memory exfiltration, sub-second sandwich attacks on retail users.",
    expected_verdict: "VIOLATION",
    expected_status: "SLASHED",
    description: "Agent execution logs reveal deliberate mempool sandwich exploitation and unauthorized shell command execution. GenLayer consensus immediately slashes milestone grant and returns 100% of escrow back to Sponsor credit vault."
  },
  {
    title: "Scenario 3: Off-Chain Document Tampering (Cryptographic Tamper Guard)",
    tag: "TAMPER DETECTED",
    target_agent_id: "AGENT-ORACLE-SYNTH-03",
    agent_operator: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
    grant_amount_gen: "0.5",
    spec_url: "https://raw.githubusercontent.com/ethereum/annotated-spec/master/phase0/beacon-chain.md",
    spec_hash: "0000000000000000000000000000000000000000000000000000000000000000",
    telemetry_url: "https://raw.githubusercontent.com/ethereum/annotated-spec/master/phase0/beacon-chain.md",
    telemetry_hash: "1111111111111111111111111111111111111111111111111111111111111111",
    safety_boundaries: "Median price deviation must not exceed 2% against reference feeds.",
    blacklisted_behaviors: "Single-source price feed injection without quorum confirmation.",
    expected_verdict: "VIOLATION",
    expected_status: "SLASHED",
    description: "Agent operator attempts to substitute a tampered audit log. GenLayer validators compute the SHA-256 on the live rendered log and catch the hash mismatch prior to LLM inference, invoking fail-closed slashing."
  }
];

// No mock proposals: live blockchain state only
export const INITIAL_PROPOSALS: PolicyProposal[] = [];

export const DEFAULT_CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  import.meta.env.VITE_AEGIS_CONTRACT_ADDRESS ||
  '0x5B1162A178715Bb6a11D0BCcdf1Cb75Da8A7EC32';
