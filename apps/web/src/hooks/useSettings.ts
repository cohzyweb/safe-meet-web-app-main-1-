// ============================================================
// apps/web/src/hooks/useSettings.ts
// Settings page data — profile + active sessions
// Matches settings/page.tsx blocks
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileApi, sessionsApi, totpApi } from "@/lib/api/endpoints";
import { profileKeys } from "@/hooks/useProfile";
import type { Profile, Session } from "@/lib/types";

// ------------------------------------------------------------
// Query keys
// ------------------------------------------------------------

export const sessionKeys = {
  all: ["sessions"] as const,
  list: () => ["sessions", "list"] as const,
};

// ------------------------------------------------------------
// Sessions hook
// ------------------------------------------------------------

export function useSessions() {
  return useQuery<Session[], Error>({
    queryKey: sessionKeys.list(),
    queryFn: () => sessionsApi.list(),
    staleTime: 30_000,
    retry: 2,
  });
}

// ------------------------------------------------------------
// Combined settings hook
// ------------------------------------------------------------

export function useSettings(wallet: string | undefined) {
  const profile = useQuery<Profile, Error>({
    queryKey: profileKeys.detail(wallet ?? ""),
    queryFn: () => profileApi.get(wallet!),
    enabled: !!wallet,
    staleTime: 60_000,
    retry: 2,
  });

  const sessions = useSessions();

  return {
    profile: profile.data,
    sessions: sessions.data ?? [],
    isLoading: profile.isLoading || sessions.isLoading,
    isError: profile.isError || sessions.isError,
    error: profile.error ?? sessions.error,
    refetch: () => {
      profile.refetch();
      sessions.refetch();
    },
  };
}

// ------------------------------------------------------------
// Revoke session mutation
// ------------------------------------------------------------

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (id) => sessionsApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.list() });
    },
  });
}

// ------------------------------------------------------------
// TOTP mutations
// ------------------------------------------------------------

export function useTotpSetup() {
  return useMutation<{ otpauthUrl: string }, Error, void>({
    mutationFn: () => totpApi.setup(),
  });
}

export function useTotpConfirm() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (token) => totpApi.confirm(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useTotpDisable() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (token) => totpApi.disable(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

// ------------------------------------------------------------
// Update profile mutation
// ------------------------------------------------------------

interface UpdateProfilePayload {
  wallet: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<Profile, Error, UpdateProfilePayload>({
    mutationFn: ({ wallet, ...fields }) =>
      profileApi.update(wallet, fields),
    onSuccess: (data) => {
      queryClient.setQueryData(profileKeys.detail(data.wallet), data);
    },
  });
}
