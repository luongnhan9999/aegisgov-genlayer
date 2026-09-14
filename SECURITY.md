# AegisGov Security & Trust Architecture

AegisGov is designed as an institutional-grade, real-time autonomous AI governance protocol operating on GenLayer Studionet. Because intelligent contracts directly evaluate off-chain telemetry and authorize high-value disbursements, the protocol implements a **zero-trust, fail-closed security architecture** adhering to the strictest judge standards.

---

## 🛡️ Core Security Hallmarks

### 1. Zero-Normalization Fail-Closed JSON Parser
Traditional smart contracts and LLM wrappers often attempt heuristic normalization (stripping markdown fences like ```` ```json ````, trimming quotes, coercing strings to booleans). In a financial governance court, **normalization creates attack surface**.
- AegisGov feeds LLM outputs directly into canonical `json.loads`.
- If the model returns markdown code fences, non-JSON text, missing keys (`is_compliant`, `reason`), or malformed types (`"true"` string instead of `True` boolean), the parser **fails-closed immediately**:
  ```python
  return {
      "is_compliant": False,
      "reason": f"FAIL-CLOSED: Non-JSON output rejected without normalization: {str(e)}"
  }
  ```

### 2. Authoritative Cryptographic Artifact Pinning (SHA-256)
Off-chain web documents can be altered, removed, or manipulated after contract creation. AegisGov eliminates this vulnerability:
- Both the Constitutional Specification URL and the Agent Telemetry Log URL require mandatory 64-character SHA-256 hex digests at submission.
- During nondeterministic consensus execution, GenLayer validators render the live web contents and independently compute the SHA-256 hash.
- Any mismatch immediately halts evaluation, triggers a `CRITICAL TAMPERING` violation verdict, and slashes the milestone grant.

### 3. Deterministic Execution Timestamp Context
To avoid validator divergence and non-deterministic clock drift:
- AegisGov derives trusted timestamps strictly from runtime execution context `gl.message_raw["datetime"]`.
- If execution context datetime is missing or non-positive, execution raises `UserError`.

### 4. Pull-over-Push Safe Settlement Vault
Direct external transfers (`emit_transfer` in a push loop) are notoriously vulnerable to recipient reverts, gas depletion, and GenVM panic states.
- All settlements—whether successful milestone releases to the Operator or slashing refunds to the Sponsor—credit internal balances in `withdrawable_credits`.
- Beneficiaries withdraw their native GEN funds independently via `withdraw_credits()`, guaranteeing that no party can lock or grief the contract escrow.

### 5. 24-Hour Cooling-Off Dispute Window
When an agent passes the AI consensus audit:
- The proposal status enters `EVALUATING` and locks funds for a mandatory 24-hour cooling-off dispute window (`payout_ready_at = now + 86400`).
- During this window, the DAO Sponsor can inspect the justification and raise a challenge (`raise_compliance_dispute`), freezing disbursements if discrepancies or off-chain omissions are discovered.

### 6. Non-Custodial Abandonment Recovery
If an Agent Operator fails to deliver telemetry logs within the agreed contract duration:
- The Sponsor can call `recover_expired_grant()` after `created_at + expiry_duration` has elapsed.
- 100% of the locked escrow is safely returned to the Sponsor's withdrawable vault.

---

## 🔍 Verification & Audit Surface

- **Unit Test Suite**: `tests/test_aegis_gov.py` runs 11 rigorous test cases verifying zero-normalization parsing, SHA-256 integrity, tamper detection, dispute freezing, and pull-over-push settlement.
- **Contract Source**: `contracts/AegisGov.py` (v0.2.23 with `py-genlayer:1jb45aa8...`).
