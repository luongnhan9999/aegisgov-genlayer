export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 2) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

export function formatGen(weiAmount: string | bigint | number, decimals = 2): string {
  try {
    const raw = BigInt(String(weiAmount || '0'));
    // 1 GEN = 1e18
    const integerPart = raw / 1000000000000000000n;
    const remainder = raw % 1000000000000000000n;
    
    if (remainder === 0n) {
      return integerPart.toLocaleString();
    }
    
    const remainderStr = remainder.toString().padStart(18, '0');
    const frac = remainderStr.slice(0, decimals);
    return `${integerPart.toLocaleString()}.${frac}`;
  } catch (e) {
    return '0';
  }
}

export function parseGenToWei(genAmount: string | number): string {
  try {
    const parts = String(genAmount).trim().split('.');
    const integer = BigInt(parts[0] || '0') * 1000000000000000000n;
    let fraction = 0n;
    if (parts[1]) {
      const padded = parts[1].padEnd(18, '0').slice(0, 18);
      fraction = BigInt(padded);
    }
    return (integer + fraction).toString();
  } catch (e) {
    return '0';
  }
}

export function formatTimeAgo(timestampSeconds: string | number): string {
  const ts = Number(timestampSeconds);
  if (!ts || ts <= 0) return 'N/A';
  
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;
  
  if (diff < 60) return `${Math.max(1, diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatRemainingTime(targetTimestampSeconds: string | number): { formatted: string; isElapsed: boolean } {
  const target = Number(targetTimestampSeconds);
  if (!target || target <= 0) return { formatted: 'Elapsed', isElapsed: true };
  
  const now = Math.floor(Date.now() / 1000);
  const diff = target - now;
  
  if (diff <= 0) {
    return { formatted: 'Cooling-off elapsed (Ready)', isElapsed: true };
  }
  
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  
  return {
    formatted: `${hours}h ${minutes}m ${seconds}s remaining`,
    isElapsed: false
  };
}

export async function computeSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
}
