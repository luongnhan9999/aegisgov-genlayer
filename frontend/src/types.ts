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
    grant_amount_gen: "2500",
    spec_url: "https://gist.githubusercontent.com/genlayer-dao/specs/main/treasury_guardrails.txt",
    spec_hash: "a4f8d39c018274d89a27e69f835b31d87192a54332cefc27301c20172e591244",
    telemetry_url: "https://gist.githubusercontent.com/ai-agent/logs/main/epoch_14_telemetry.log",
    telemetry_hash: "82a991b19cefb659b86088902beec02bc5959c83693e53612502787cbe80164c",
    safety_boundaries: "1. Max leverage <= 1.5x.\n2. Slippage tolerance < 0.5%.\n3. Collateral rebalancing only on whitelisted Aave/Compound pools.",
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
    grant_amount_gen: "5000",
    spec_url: "https://gist.githubusercontent.com/genlayer-dao/specs/main/hft_safety_bounds.txt",
    spec_hash: "3182a472911b6f00192e109dcb487f8271a0047bca8817293a17e0081273909a",
    telemetry_url: "https://gist.githubusercontent.com/rogue-agent/logs/main/exploit_attempt.log",
    telemetry_hash: "45f9a008197cbef8818c2193740e7a12b9182374661839210982348571029384",
    safety_boundaries: "Order cancellation rate < 80%. Maximum single drawdown < $5,000 USD equivalent.",
    blacklisted_behaviors: "Unauthorized shell execution, memory exfiltration, sub-second sandwich attacks on retail users.",
    expected_verdict: "VIOLATION",
    expected_status: "SLASHED",
    description: "Agent execution logs reveal deliberate mempool sandwich exploitation and unauthorized shell command execution. GenLayer consensus immediately slashes milestone grant and returns 100% of escrow back to Sponsor credit vault."
  },
  {
    title: "Scenario 3: Off-Chain Document Tampering (Zero-Trust Cryptographic Guard)",
    tag: "TAMPER DETECTED",
    target_agent_id: "AGENT-ORACLE-SYNTH-03",
    agent_operator: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
    grant_amount_gen: "1500",
    spec_url: "https://gist.githubusercontent.com/genlayer-dao/specs/main/oracle_rules.txt",
    spec_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    telemetry_url: "https://gist.githubusercontent.com/tampered/logs/main/fake_log.log",
    telemetry_hash: "1111111111111111111111111111111111111111111111111111111111111111",
    safety_boundaries: "Median price deviation must not exceed 2% against reference feeds.",
    blacklisted_behaviors: "Single-source price feed injection without quorum confirmation.",
    expected_verdict: "VIOLATION",
    expected_status: "SLASHED",
    description: "Agent operator attempts to substitute a tampered audit log. GenLayer validators compute the SHA-256 on the live rendered log and catch the hash mismatch prior to LLM inference, invoking fail-closed slashing."
  }
];

export const INITIAL_PROPOSALS: PolicyProposal[] = [
  {
    id: "PROP-AEGIS-01",
    sponsor: "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65",
    target_agent_id: "AGENT-TREASURY-01",
    agent_operator: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    grant_amount: "2500000000000000000000",
    status: "EVALUATING",
    constitutional_spec_url: "https://gist.githubusercontent.com/genlayer-dao/specs/main/treasury_guardrails.txt",
    constitutional_spec_hash: "a4f8d39c018274d89a27e69f835b31d87192a54332cefc27301c20172e591244",
    telemetry_log_url: "https://gist.githubusercontent.com/ai-agent/logs/main/epoch_14_telemetry.log",
    telemetry_log_hash: "82a991b19cefb659b86088902beec02bc5959c83693e53612502787cbe80164c",
    safety_boundary_rules: "Max leverage <= 1.5x. Slippage < 0.5%. Whitelisted protocols only.",
    blacklisted_behaviors: "No unverified swaps, no flashloan exploits, no credential exfiltration.",
    verdict: "COMPLIANT",
    reason: "Consensus Audit passed: All 14 trades conformed to safety boundaries. Max leverage reached was 1.22x with 0.14% avg slippage. Zero blacklisted behaviors observed.",
    created_at: String(Math.floor(Date.now() / 1000) - 36000),
    payout_ready_at: String(Math.floor(Date.now() / 1000) + 50400),
  },
  {
    id: "PROP-AEGIS-02",
    sponsor: "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7",
    target_agent_id: "AGENT-ARBITRAGE-02",
    agent_operator: "0x3c44cdd0d6678f0877ae2285758504dbb4723930",
    grant_amount: "5000000000000000000000",
    status: "SLASHED",
    constitutional_spec_url: "https://gist.githubusercontent.com/genlayer-dao/specs/main/hft_safety_bounds.txt",
    constitutional_spec_hash: "3182a472911b6f00192e109dcb487f8271a0047bca8817293a17e0081273909a",
    telemetry_log_url: "https://gist.githubusercontent.com/rogue-agent/logs/main/exploit_attempt.log",
    telemetry_log_hash: "45f9a008197cbef8818c2193740e7a12b9182374661839210982348571029384",
    safety_boundary_rules: "Cancellation rate < 80%. Single loss < $5,000.",
    blacklisted_behaviors: "Unauthorized shell commands, private key export, sandwich attacks.",
    verdict: "VIOLATION",
    reason: "CRITICAL BREACH: Execution telemetry indicates agent attempted to call '/v1/debug/dump_keys' and performed 4 multi-block sandwich extractions against pool 0x88e6.",
    created_at: String(Math.floor(Date.now() / 1000) - 86400 * 2),
    payout_ready_at: "0",
  }
];

export const DEFAULT_CONTRACT_ADDRESS =
  import.meta.env.VITE_AEGIS_CONTRACT_ADDRESS ||
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  '0x0000000000000000000000000000000000000000';
