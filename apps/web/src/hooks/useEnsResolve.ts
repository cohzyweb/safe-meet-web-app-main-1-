// ============================================================
// apps/web/src/hooks/useEnsResolve.ts
// Resolve ENS names to 0x addresses using a public mainnet RPC.
// ============================================================

import { useState, useCallback } from "react";
import { createPublicClient, http, isAddress } from "viem";
import { mainnet } from "viem/chains";

const ensClient = createPublicClient({
  chain: mainnet,
  transport: http("https://cloudflare-eth.com"),
});

export function useEnsResolve() {
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async (input: string): Promise<string | null> => {
    const trimmed = input.trim();

    // Already a valid address — nothing to resolve
    if (isAddress(trimmed)) return trimmed;

    // Only attempt ENS resolution for .eth names
    if (!trimmed.endsWith(".eth")) return null;

    setResolving(true);
    setError(null);

    try {
      const address = await ensClient.getEnsAddress({ name: trimmed });
      if (!address) {
        setError(`Could not resolve ${trimmed}`);
        return null;
      }
      return address;
    } catch {
      setError(`ENS lookup failed for ${trimmed}`);
      return null;
    } finally {
      setResolving(false);
    }
  }, []);

  return { resolve, resolving, ensError: error };
}
