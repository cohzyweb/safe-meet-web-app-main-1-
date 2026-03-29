// ============================================================
// apps/web/src/hooks/useProfile.ts
// Wallet-based profile data
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/lib/api/endpoints";
import type { Profile } from "@/lib/types";

// ------------------------------------------------------------
// Query keys
// ------------------------------------------------------------

export const profileKeys = {
  all: ["profile"] as const,
  detail: (wallet: string) => ["profile", wallet] as const,
};

// ------------------------------------------------------------
// Profile hook
// ------------------------------------------------------------

export function useProfile(wallet: string | undefined) {
  return useQuery<Profile, Error>({
    queryKey: profileKeys.detail(wallet ?? ""),
    queryFn: () => profileApi.get(wallet!),
    enabled: !!wallet,
    staleTime: 60_000,       // profile data changes less often — 60s
    retry: 2,
  });
}
