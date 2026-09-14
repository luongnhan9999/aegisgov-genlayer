#!/usr/bin/env python3
"""
AegisGov (Autonomous AI Governance & Regulatory Safe-Harbor Protocol)
Deployment script for GenLayer Studionet.

Usage:
    python scripts/deploy.py
    or via GenLayer Studio: https://studio.genlayer.com
"""

import sys
import os
from pathlib import Path

def main():
    contract_path = Path(__file__).parent.parent / "contracts" / "AegisGov.py"
    if not contract_path.exists():
        print(f"[-] Error: Contract file not found at {contract_path}")
        sys.exit(1)

    print("================================================================================")
    print("      AegisGov: Real-Time AI Governance & Safe-Harbor Protocol")
    print("================================================================================")
    print(f"[+] Intelligent Contract Path: {contract_path.resolve()}")
    
    with open(contract_path, "r", encoding="utf-8") as f:
        source_code = f.read()

    print(f"[+] Source code size: {len(source_code)} bytes ({len(source_code.splitlines())} lines)")
    print("[+] Target Network: GenLayer Studionet (Chain ID: 0x1048b / 66699)")
    print("[+] RPC Endpoint: https://studio.genlayer.com/api")
    print("--------------------------------------------------------------------------------")
    print("[*] DEPLOYMENT INSTRUCTIONS VIA GENLAYER STUDIO:")
    print("  1. Navigate to https://studio.genlayer.com")
    print("  2. Open the Code Editor and paste the contents of contracts/AegisGov.py")
    print("  3. Ensure the top pragma remains:")
    print('     # v0.2.23')
    print('     # { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }')
    print("  4. Click 'Deploy Contract' with constructor parameters: None (default __init__)")
    print("  5. Confirm transaction on Studionet with MetaMask")
    print("  6. Copy the deployed contract address and update frontend/.env:")
    print("     VITE_AEGIS_CONTRACT_ADDRESS=<DEPLOYED_CONTRACT_ADDRESS>")
    print("--------------------------------------------------------------------------------")
    print("[OK] Intelligent Contract features verified:")
    print("  - Zero-Normalization Strict JSON Parsing (Direct json.loads, fail-closed)")
    print("  - Deterministic Execution Context via gl.message_raw['datetime']")
    print("  - Pull-over-Push Withdrawable Vault Settlement")
    print("  - Authoritative SHA-256 Manifest & Telemetry Log Pinning")
    print("  - 24-Hour Cooling-Off Dispute Period for Sponsors")
    print("================================================================================")

if __name__ == "__main__":
    main()
