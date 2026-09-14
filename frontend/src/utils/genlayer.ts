import { createClient } from 'genlayer-js';
import { studionet, localnet, testnetBradbury } from 'genlayer-js/chains';
import type { PolicyProposal } from '../types';

export type GenLayerNetwork = 'studionet' | 'localnet' | 'testnetBradbury';

export function getGenLayerChain(network: GenLayerNetwork = 'studionet') {
  switch (network) {
    case 'localnet':
      return localnet;
    case 'testnetBradbury':
      return testnetBradbury;
    case 'studionet':
    default:
      return studionet;
  }
}

export function getGenLayerClient(
  network: GenLayerNetwork = 'studionet',
  rpcUrl?: string,
  userAccount?: string
) {
  const chain = getGenLayerChain(network);
  return createClient({
    chain,
    endpoint: rpcUrl || undefined,
    provider: typeof window !== 'undefined' ? window.ethereum : undefined,
    // When an address string is passed, genlayer-js instructs MetaMask to sign
    account: userAccount ? (userAccount as `0x${string}`) : undefined,
  });
}

/**
 * Fetch all proposals from AegisGov intelligent contract on-chain
 */
export async function readProposalsFromChain(
  contractAddress: string,
  network: GenLayerNetwork = 'studionet',
  rpcUrl?: string
): Promise<PolicyProposal[]> {
  if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    return [];
  }

  try {
    const client = getGenLayerClient(network, rpcUrl);
    const rawResult = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: 'get_all_proposals',
      args: [],
    });

    if (!rawResult) return [];

    let jsonStr = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult);
    if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
      try {
        jsonStr = JSON.parse(jsonStr);
      } catch (e) {}
    }
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;

    if (Array.isArray(parsed)) {
      // Parallel fetch full proposal details for each proposal ID
      const detailedProposals = await Promise.all(
        parsed.map(async (p: any) => {
          try {
            const detailRaw = await client.readContract({
              address: contractAddress as `0x${string}`,
              functionName: 'get_proposal',
              args: [String(p.id)],
            });
            let detailStr = typeof detailRaw === 'string' ? detailRaw : JSON.stringify(detailRaw);
            if (detailStr.startsWith('"') && detailStr.endsWith('"')) {
              try {
                detailStr = JSON.parse(detailStr);
              } catch (e) {}
            }
            const detail = typeof detailStr === 'string' ? JSON.parse(detailStr) : detailStr;
            return {
              id: String(p.id),
              sponsor: String(detail.sponsor || p.sponsor || ''),
              target_agent_id: String(detail.target_agent_id || p.target_agent_id || ''),
              agent_operator: String(detail.agent_operator || p.agent_operator || ''),
              grant_amount: String(detail.grant_amount || p.grant_amount || '0'),
              status: detail.status || p.status || 'ACTIVE',
              constitutional_spec_url: String(detail.constitutional_spec_url || ''),
              constitutional_spec_hash: String(detail.constitutional_spec_hash || ''),
              telemetry_log_url: String(detail.telemetry_log_url || ''),
              telemetry_log_hash: String(detail.telemetry_log_hash || ''),
              safety_boundary_rules: String(detail.safety_boundary_rules || ''),
              blacklisted_behaviors: String(detail.blacklisted_behaviors || ''),
              verdict: detail.verdict || p.verdict || 'NONE',
              reason: String(detail.reason || p.reason || ''),
              confidence: String(detail.confidence || '0'),
              evaluation_count: String(detail.evaluation_count || '0'),
              created_at: String(detail.created_at || p.created_at || '0'),
              payout_ready_at: String(detail.payout_ready_at || '0'),
              disputed_at: String(detail.disputed_at || '0'),
            } as PolicyProposal;
          } catch (e) {
            return {
              id: String(p.id),
              sponsor: String(p.sponsor || ''),
              target_agent_id: String(p.target_agent_id || ''),
              agent_operator: String(p.agent_operator || ''),
              grant_amount: String(p.grant_amount || '0'),
              status: p.status || 'ACTIVE',
              constitutional_spec_url: '',
              constitutional_spec_hash: '',
              telemetry_log_url: '',
              telemetry_log_hash: '',
              safety_boundary_rules: '',
              blacklisted_behaviors: '',
              verdict: p.verdict || 'NONE',
              reason: String(p.reason || ''),
              created_at: String(p.created_at || '0'),
            } as PolicyProposal;
          }
        })
      );
      return detailedProposals;
    }
    return [];
  } catch (error) {
    console.error('Failed to read proposals from AegisGov contract:', error);
    throw error;
  }
}

/**
 * Fetch withdrawable credits for an account
 */
export async function readWithdrawableCredits(
  contractAddress: string,
  account: string,
  network: GenLayerNetwork = 'studionet',
  rpcUrl?: string
): Promise<string> {
  if (!contractAddress || !account || contractAddress === '0x0000000000000000000000000000000000000000') {
    return '0';
  }

  try {
    const client = getGenLayerClient(network, rpcUrl);
    const rawResult = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: 'get_withdrawable_credits',
      args: [account],
    });
    return String(rawResult || '0');
  } catch (error) {
    console.warn('Failed to read withdrawable credits:', error);
    return '0';
  }
}

/**
 * Execute real transaction on GenLayer Studionet and await validator finality
 */
export async function writeContractOnChain(
  contractAddress: string,
  functionName: string,
  args: any[],
  valueWei: string = '0',
  network: GenLayerNetwork = 'studionet',
  account?: string,
  onStageChange?: (stage: string) => void
): Promise<{ txHash: string; status: string }> {
  if (onStageChange) onStageChange('Requesting MetaMask signature...');
  const client = getGenLayerClient(network, undefined, account);

  try {
    const txHash = await client.writeContract({
      address: contractAddress as `0x${string}`,
      functionName,
      args,
      value: BigInt(valueWei),
      account: account ? ({ address: account as `0x${string}` } as any) : undefined,
    });

    console.log(`[AegisGov On-Chain] Transaction hash: ${txHash}`);
    if (onStageChange) onStageChange('Transaction broadcasted! Awaiting GenLayer validator consensus...');

    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      status: 'ACCEPTED' as any,
    });

    console.log(`[AegisGov On-Chain] Finality reached! Status: ${receipt.statusName || receipt.status}`);
    if (onStageChange) onStageChange('Consensus Finalized on GenLayer Studionet!');

    return {
      txHash: String(txHash),
      status: String(receipt.statusName || receipt.status),
    };
  } catch (error) {
    console.error(`[AegisGov On-Chain] Transaction failed (${functionName}):`, error);
    throw error;
  }
}
