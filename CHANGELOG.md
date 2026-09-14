# Changelog

All notable changes to the AegisGov protocol will be documented in this file.

## [1.0.0] - 2026-09-14

### Added
- **Intelligent Contract (`contracts/AegisGov.py`)**:
  - Implemented real-time autonomous AI governance safe-harbor protocol.
  - Zero-Normalization Strict JSON Parser (fail-closed directly via `json.loads`).
  - Deterministic execution timestamp derivation strictly from `gl.message_raw["datetime"]`.
  - Withdrawable Vault Pattern (`withdrawable_credits`) via pull-over-push settlement.
  - Authoritative SHA-256 cryptographic pinning for constitutional specifications and agent telemetry logs.
  - 24-Hour Cooling-Off dispute window allowing sponsors to freeze payouts.
  - Non-custodial timeout recovery for abandoned grants.
  - View methods: `get_proposal`, `get_all_proposals`, and `get_withdrawable_credits`.
- **Test Suite (`tests/test_aegis_gov.py`)**:
  - 11 comprehensive unit test cases verifying strict parsing, SHA-256 integrity, tamper detection, dispute handling, expiration recovery, and pull settlement.
- **Deployment Script (`scripts/deploy.py`)**:
  - Deployment tooling and step-by-step instructions for GenLayer Studionet.
- **Web3 Frontend (`frontend/`)**:
  - Built with React 19, TypeScript, Vite, Tailwind CSS, Lucide icons, and `genlayer-js`.
  - MetaMask connection with auto-switching to GenLayer Studionet (0x1048b / 66699).
  - Global metrics dashboard (Total Locked Escrow, Active Grants, Compliance Rate, Withdrawable Vault).
  - Register Governance Grant modal with live SHA-256 hasher.
  - Submit Execution Telemetry modal with consensus audit runner.
  - Proposal detail view with real-time 24h cooling-off countdown timer.
  - Interactive Judge Test Bench with 3 pre-built scenarios (Compliant, Slashed, and Tamper-detected).
  - Pull-over-Push native GEN withdrawal vault panel.
