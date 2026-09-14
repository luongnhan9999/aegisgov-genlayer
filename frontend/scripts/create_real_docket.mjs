import { createClient } from 'genlayer-js';
import { privateKeyToAccount } from 'viem/accounts';
import { studionet } from 'genlayer-js/chains';

const PRIVATE_KEY = '0x0909fe6b9b671281b871e56215874fc39897e155bbf8858207528c4cea883707';
const CONTRACT_ADDRESS = '0xbfF6d305d2F806d4CD0208Cd6B5FaE5cFbDa4B35';

const account = privateKeyToAccount(PRIVATE_KEY);
const client = createClient({
  chain: studionet,
  account,
});

async function main() {
  console.log(`[AegisGov Auto-Docket] Signer Address: ${account.address}`);
  const balance = await client.getBalance({ address: account.address });
  const balanceGen = Number(balance) / 1e18;
  console.log(`[AegisGov Auto-Docket] Studionet Balance: ${balance.toString()} wei (${balanceGen.toFixed(4)} GEN)`);

  if (balance < 1000000000000000000n) {
    console.log(`[-] Balance is currently ${balanceGen.toFixed(4)} GEN (< 1.0 GEN). Waiting for incoming funds...`);
    console.log(`[!] Target Wallet Address to send GEN: ${account.address}`);
    return;
  }

  const proposalId = `AEGIS-PRECEDENT-${Math.floor(1000 + Math.random() * 9000)}`;
  const targetAgentId = 'AGENT-TREASURY-01';
  const agentOperator = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const specUrl = 'https://raw.githubusercontent.com/luongnhan9999/aegisgov-genlayer/main/docs/spec/yield_agent_spec.txt';
  const specHash = '102634c9b31ed6dca2d569d3051ff3aa7739221480c955b6646a073d124cd269';
  const safetyRules = '1. Maximum leverage <= 1.5x.\n2. Slippage tolerance < 0.5%.\n3. Collateral rebalancing on whitelisted protocols only.';
  const blacklisted = '1. No flashloan liquidation attacks.\n2. No unverified third-party token swaps.\n3. No export or transmission of private signing credentials.';
  const validityDays = 30n;

  console.log(`[+] Broadcasting register_governance_grant for ${proposalId} with 1.0 GEN escrow...`);

  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'register_governance_grant',
    args: [
      proposalId,
      targetAgentId,
      agentOperator,
      specUrl,
      specHash,
      safetyRules,
      blacklisted,
      validityDays,
    ],
    value: 1000000000000000000n, // 1.0 GEN
  });

  console.log(`[+] Transaction broadcasted! Hash: ${txHash}`);
  console.log(`[*] Waiting for GenLayer validator consensus finality...`);

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: 'ACCEPTED',
  });

  console.log(`[SUCCESS] Docket Finalized on GenLayer Studionet!`);
  console.log(`[SUCCESS] Status: ${receipt.statusName || receipt.status}`);
  console.log(`[SUCCESS] Docket ID: ${proposalId}`);
  console.log(`[SUCCESS] Explorer Link: https://genlayer-explorer.vercel.app/tx/${txHash}`);
}

main().catch(console.error);
