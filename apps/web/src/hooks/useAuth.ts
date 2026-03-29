// ============================================================
// apps/web/src/hooks/useAuth.ts
// SIWE sign-in flow — runs automatically when a wallet connects.
// Issues JWT stored in localStorage; all apiClient calls pick it up.
// ============================================================

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAccount, useSignMessage } from "wagmi";
import { setAuthToken, clearAuthToken } from "@/lib/api/client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const TOKEN_KEY = "safemeet_jwt";
const TOKEN_WALLET_KEY = "safemeet_jwt_wallet";

export function useAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const pathname = usePathname();
  // Tracks the address authenticated this session (survives re-renders, not page refresh)
  const authenticatedAddressRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      clearAuthToken();
      if (typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_WALLET_KEY);
      }
      authenticatedAddressRef.current = null;
      return;
    }

    // Already authenticated for this address in this session
    if (authenticatedAddressRef.current === address) return;

    // Check if there's already a stored token for this exact wallet address.
    // Avoids re-prompting the wallet on every page refresh within the 24h JWT window.
    if (typeof window !== "undefined") {
      const storedWallet = localStorage.getItem(TOKEN_WALLET_KEY);
      const storedToken = localStorage.getItem(TOKEN_KEY);

      if (storedToken && storedWallet === address.toLowerCase()) {
        // Token matches current wallet — reuse it
        authenticatedAddressRef.current = address;
        return;
      }

      if (storedToken && storedWallet && storedWallet !== address.toLowerCase()) {
        // Wallet changed — clear stale token for the old wallet
        clearAuthToken();
        localStorage.removeItem(TOKEN_WALLET_KEY);
      }
    }

    if (!pathname.startsWith("/connect")) {
      return;
    }

    async function authenticate() {
      try {
        // 1. Get nonce from backend
        const nonceRes = await fetch(`${BASE_URL}/api/auth/nonce`);
        if (!nonceRes.ok) throw new Error("Failed to fetch nonce");
        const { nonce } = (await nonceRes.json()) as { nonce: string };

        // 2. Build SIWE message
        const domain =
          typeof window !== "undefined" ? window.location.host : "safemeet.app";
        const message = [
          `${domain} wants you to sign in with your Ethereum account:`,
          address,
          "",
          "Sign in to SafeMeet",
          "",
          `Nonce: ${nonce}`,
          "Chain ID: 84532",
        ].join("\n");

        // 3. Request wallet signature
        const signature = await signMessageAsync({ message });

        // 4. Verify on backend and receive JWT
        const verifyRes = await fetch(`${BASE_URL}/api/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, signature }),
        });

        if (!verifyRes.ok) throw new Error("Signature verification failed");

        const { token } = (await verifyRes.json()) as { token: string };
        setAuthToken(token);
        if (typeof window !== "undefined" && address) {
          localStorage.setItem(TOKEN_WALLET_KEY, address.toLowerCase());
        }
        authenticatedAddressRef.current = address ?? null;
      } catch (err) {
        // Non-fatal — user may have rejected the signature request
        console.error("[useAuth] SIWE authentication failed:", err);
      }
    }

    void authenticate();
  }, [address, isConnected, signMessageAsync, pathname]);
}
