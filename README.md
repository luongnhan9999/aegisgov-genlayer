# AegisGov (Autonomous AI Governance & Regulatory Safe-Harbor Protocol)

> **Real-Time Autonomous AI Compliance Court & Smart Grant Escrow on GenLayer Studionet**  
> *Track: AI Governance / Autonomous Safe-Harbor | Builder Program Submission*

---

## 📌 Executive Summary & The Problem Solved

In the burgeoning agentic economy, DAOs, decentralized funds, and algorithmic treasuries are deploying autonomous off-chain AI agents to manage portfolios, curate content, and execute cross-chain operations. 

**The Counterparty Trust Dilemma**:
How can a decentralized fund disburse grant milestones or capital tranches to an autonomous agent **without trusting the agent's operator**?
- Traditional smart contracts (Solidity/EVM) are completely blind to off-chain behavioral logs, model ethics, safety boundaries, and prompt-injection telemetry.
- Off-chain AI oracles introduce a single point of failure and centralized trust.
- Manual human DAOs are too slow, expensive, and subjective to evaluate high-frequency algorithmic actions.

**The AegisGov Solution**:
AegisGov is an **Intelligent Contract** operating as a real-time, decentralized "AI Compliance Court". Capital sponsors lock grant escrow governed by an immutable **Constitutional Specification**. To unlock milestone funding, the Agent Operator must submit execution telemetry logs. GenLayer's decentralized validator consensus renders the untruncated evidence off-chain, verifies cryptographic SHA-256 integrity, and conducts an adversarial LLM consensus audit to determine whether the agent operated strictly within safe-harbor boundaries.

---

## ⚡ Why This Project DIES Without GenLayer (GenLayer Fit: 5/5)

| Requirement | Traditional EVM (Solidity) | Centralized AI Oracles | GenLayer Intelligent Contract |
|---|---|---|---|
| **Reading Off-Chain Telemetry On-Chain** | ❌ Impossible (EVM has no web access) | ⚠️ Centralized server fetches data | ✅ Native non-deterministic web rendering (`gl.nondet.web.render`) |
| **Evaluating Semantic Safety Boundaries** | ❌ Impossible (No LLM reasoning) | ⚠️ Single model API key / opaque | ✅ Decentralized validator LLM consensus (`gl.vm.run_nondet`) |
| **Cryptographic Evidence Pinning** | ⚠️ Can store hashes, but cannot verify content | ❌ Blind trust in oracle signature | ✅ Validators independently re-hash live off-chain payloads |
| **Tamper-Proof Milestone Settlement** | ❌ Cannot verify subjective compliance | ❌ Centralized key can steal escrow | ✅ Autonomous on-chain safe-harbor & pull settlement vault |

If you remove GenLayer's subjective consensus and native web-reading capabilities, **AegisGov fundamentally ceases to exist**.

---

## 🏛️ Core Architectural Innovations (Judge Mandates)

AegisGov integrates the strictest engineering standards required by GenLayer lead stewards and judges:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 DAO / Capital Sponsor                   │
                  └────────────────────────────┬────────────────────────────┘
                                               │ register_governance_grant()
                                               │ (Locks Escrow in GEN)
                                               ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 AegisGov Intelligent Contract                          │
│                                                                                        │
│  [1] Authoritative Artifact Pinning:                                                   │
│      SHA-256(Spec Manifest)  +  SHA-256(Telemetry Log)                                 │
│                                                                                        │
│  [2] GenLayer Validator Consensus Audit (gl.vm.run_nondet):                            │
│      - Leader fetches untruncated evidence via gl.nondet.web.render                    │
│      - Cryptographic hash verification: SHA-256(computed) == SHA-256(expected)         │
│      - Consensus Prompt: Evaluates Safety Boundaries & Blacklisted Actions              │
│      - Validator compares verdict: leader_data['is_compliant'] == mine['is_compliant']  │
│                                                                                        │
│  [3] Zero-Normalization Fail-Closed JSON Parser:                                       │
│      - Direct json.loads (Rejects markdown fences, malformed strings, coercion)        │
│                                                                                        │
│  [4] Pull-Over-Push Withdrawable Vault:                                                │
│      - Credits internal balances: withdrawable_credits[beneficiary] += amount          │
│      - Eliminates transfer reverts and GenVM VM-panic states                            │
└──────────────────────────────────────────────┬─────────────────────────────────────────┘
                       │                       │
         COMPLIANT?    │                       │   VIOLATION / TAMPERING?
                       ▼                       ▼
      ┌─────────────────────────────────┐    ┌─────────────────────────────────┐
      │  Status: EVALUATING             │    │  Status: SLASHED                │
      │  24-Hour Dispute Cooling-Off   │    │  Immediate Escrow Refund        │
      │  payout_ready_at = now + 86400  │    │  to Sponsor Credit Vault        │
      └────────────────┬────────────────┘    └─────────────────────────────────┘
                       │
          After 24h cooling-off
          (No dispute raised)
                       ▼
      ┌─────────────────────────────────┐
      │  finalize_grant_disbursement()  │
      │  Credits Operator Vault Balance │
      └─────────────────────────────────┘
```

### 1. Zero-Normalization Strict JSON Parsing
Eliminates heuristic normalization that can mask adversarial prompt injections. Uses direct `json.loads`:
- Rejects markdown code blocks (```` ```json ````)
- Requires explicit boolean `is_compliant` (`True`/`False`, not `"true"`)
- Requires non-empty string `reason`
- **Fails-closed** immediately upon any malformed response.

### 2. Authoritative Immutable Artifact Pinning
- Both the Constitutional Spec and the Agent Execution Telemetry must provide mandatory 64-character SHA-256 digests upon submission.
- Validators independently compute SHA-256 on the fetched web data.
- Any hash discrepancy triggers an immediate `CRITICAL TAMPERING` violation and instant slashing.

### 3. Deterministic Runtime Execution Context
- All block timestamps are derived strictly from runtime context `gl.message_raw["datetime"]`.
- Guarantees 100% deterministic agreement across validator clocks.

### 4. Pull-over-Push Safe Settlement Vault
- Grants and refunded escrows settle into internal credit balances (`withdrawable_credits`).
- Beneficiaries withdraw their funds via `withdraw_credits()`, eliminating external transfer reverts and reentrancy vectors.

### 5. 24-Hour Cooling-Off Dispute Period
- When an agent is evaluated `COMPLIANT`, the protocol enters a mandatory 24-hour dispute window.
- The Sponsor can call `raise_compliance_dispute()` to freeze payouts if off-chain discrepancies are discovered.
- After 24 hours, `finalize_grant_disbursement()` credits the Operator.

### 6. Non-Custodial Abandonment Recovery
- If an agent operator abandons a milestone, the Sponsor can call `recover_expired_grant()` after the validity window expires to reclaim 100% of escrow.

---

## 📂 Repository Structure

```
AegisGov/
├── contracts/
│   └── AegisGov.py           # Intelligent Contract (GenLayer v0.2.23)
├── tests/
│   └── test_aegis_gov.py     # 11 Unit Tests (Hashing, Parsing, Disputes, Settlement)
├── scripts/
│   └── deploy.py             # Deployment script and Studionet verification
├── frontend/                 # Web3 Dashboard (React 19, TypeScript, Tailwind, genlayer-js)
│   ├── src/
│   │   ├── components/       # Header, StatsBar, ProposalCard, VaultCard, Modals, TestBench
│   │   ├── utils/            # genlayer-js client, EIP-1193 web3, formatting
│   │   ├── types.ts          # State definitions & demo benchmark scenarios
│   │   ├── App.tsx           # Primary application logic
│   │   └── main.tsx          # React DOM entrypoint
│   ├── package.json
│   ├── vite.config.ts
│   └── .env
├── SECURITY.md               # Security architecture & threat analysis
├── CHANGELOG.md              # Project version history
├── vercel.json               # One-click deployment configuration
└── README.md
```

---

## 🚀 Deployment Guide (GenLayer Studionet)

### Deploying the Intelligent Contract via GenLayer Studio

1. Open **[GenLayer Studio](https://studio.genlayer.com)**.
2. Navigate to the **Run / Debug** editor.
3. Paste the contents of `contracts/AegisGov.py`.
4. Ensure the pragma header is present on Line 1:
   ```python
   # v0.2.23
   # { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
   ```
5. Click **Deploy Contract**.
   - Constructor parameters: None (uses default `__init__`).
6. Sign the deployment transaction using MetaMask on **GenLayer Studionet** (Chain ID: `0x1048b` / `66699`).
7. Copy the deployed contract address and set it in `frontend/.env`:
   ```bash
   VITE_AEGIS_CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>
   ```

---

## 🧪 Automated Unit Testing

Run the comprehensive unit test suite:

```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

### Verified Test Cases:
1. `test_01_strict_zero_normalization_json`: Proves parser rejects markdown fences and non-canonical booleans.
2. `test_02_evidence_hash_integrity`: Verifies SHA-256 cryptographic detection of tampered off-chain data.
3. `test_03_deterministic_execution_context`: Proves deterministic timestamp extraction from `gl.message_raw["datetime"]`.
4. `test_04_register_governance_grant_validation`: Validates escrow value > 0, 64-char SHA-256 hashes, and valid URLs.
5. `test_05_submit_compliance_audit_compliant`: Tests compliant audit entering `EVALUATING` and opening 24h cooling-off.
6. `test_06_tampering_spec_hash_detected`: Proves immediate slashing and sponsor refund when off-chain spec is tampered.
7. `test_07_cooling_off_and_finalize_disbursement`: Proves premature finalization fails, but succeeds after 24h.
8. `test_08_raise_compliance_dispute`: Proves Sponsor dispute freezes payout.
9. `test_09_recover_expired_grant`: Proves non-custodial timeout reclamation for abandoned proposals.
10. `test_10_parse_llm_json_fail_closed_adversarial`: Verifies fail-closed resilience against hostile/corrupted LLM outputs.
11. `test_11_views_and_zero_credit_withdrawal`: Tests view methods and zero-balance withdrawal prevention.

---

## 💻 Running the Web3 Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Key Frontend Features:
- **MetaMask Web3 Connect**: Automatically switches your wallet to GenLayer Studionet (Chain ID `0x1048b`).
- **Interactive Judge Test Bench**: 1-click loading of 3 realistic benchmark scenarios:
  1. *Scenario 1*: Compliant Autonomous Yield Rebalancer (Passed audit, 24h cooling-off window).
  2. *Scenario 2*: Malicious Extraction Attack (Blacklist trigger, instant slashing & sponsor refund).
  3. *Scenario 3*: Off-Chain Document Tampering (SHA-256 mismatch detected prior to LLM execution).
- **Live AI Reason Display**: Visualizes the un-truncated consensus justification on-chain.
- **Cooling-Off Live Countdown**: Displays real-time dispute countdown timers.
- **Pull-over-Push Vault Panel**: Inspect and withdraw available GEN credits in 1 click.

---

## 📝 Submission Registration Information

- **Project Name**: `AegisGov`
- **Primary Tag**: `AI Governance / Autonomous Safe-Harbor`
- **Tag 1**: `Constitutional-AI`
- **Tag 2**: `Smart-Escrow`
- **Target Network**: `GenLayer Studionet` (Studio hosted)
- **Submission Track**: `Builders` on `portal.genlayer.foundation`

### Submission Pitch:
> "AegisGov solves the fundamental counterparty trust problem of the agentic economy: enabling DAOs and capital allocators to lock milestone grants that are autonomously settled or slashed based on real-time GenLayer validator consensus auditing live execution telemetry against immutable constitutional safety specifications."
