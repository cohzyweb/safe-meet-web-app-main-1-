// ============================================================
// apps/web/src/lib/api/endpoints.ts
// Central route builders — one place for all API URLs
// ============================================================

import type {
  PactFilters,
  HistoryFilters,
  Pact,
  PactStatus,
  DashboardStats,
  Profile,
  Session,
  PaginatedResponse,
  QrResponse,
  CreatePactBody,
} from "@safe-meet/shared";
import {
  DashboardStatsSchema,
  PactSchema,
  PactListSchema,
  ProfileSchema,
  SessionListSchema,
  HistoryListSchema,
  QrResponseSchema,
} from "@safe-meet/shared";
import { apiClient, type QueryParams } from "./client";

// ------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------

export const dashboardApi = {
  /** GET /api/dashboard/stats?wallet=... */
  getStats: async (wallet: string): Promise<DashboardStats> => {
    const raw = await apiClient.get("/api/dashboard/stats", { wallet });
    return DashboardStatsSchema.parse(raw);
  },

  /** GET /api/dashboard/stats — global stats, no wallet required */
  getGlobalStats: async (): Promise<DashboardStats> => {
    const raw = await apiClient.get("/api/dashboard/stats");
    return DashboardStatsSchema.parse(raw);
  },
};

// ------------------------------------------------------------
// Pacts
// ------------------------------------------------------------

/** Convert a filter object to a QueryParams-compatible map */
function toQueryParams(filters: Record<string, string | number | boolean | undefined | null>): QueryParams {
  return filters;
}

export const pactsApi = {
  /** GET /api/pacts?wallet=...&type=...&status=... */
  list: async (filters: PactFilters): Promise<Pact[]> => {
    const raw = await apiClient.get("/api/pacts", toQueryParams(filters));
    return PactListSchema.parse(raw);
  },

  /** GET /api/pacts/:id */
  getById: async (id: string): Promise<Pact> => {
    const raw = await apiClient.get(`/api/pacts/${id}`);
    return PactSchema.parse(raw);
  },

  /** POST /api/pacts */
  create: async (payload: CreatePactBody): Promise<Pact> => {
    const raw = await apiClient.post("/api/pacts", payload);
    return PactSchema.parse(raw);
  },

  /** PATCH /api/pacts/:id/proof */
  submitProof: async (id: string, proofUrl: string): Promise<Pact> => {
    const raw = await apiClient.patch(`/api/pacts/${id}/proof`, { proofUrl });
    return PactSchema.parse(raw);
  },

  /** PATCH /api/pacts/:id/status */
  updateStatus: async (id: string, status: PactStatus): Promise<Pact> => {
    const raw = await apiClient.patch(`/api/pacts/${id}/status`, { status });
    return PactSchema.parse(raw);
  },

  /** POST /api/pacts/:id/qr — generate QR nonce */
  generateQr: async (id: string): Promise<QrResponse> => {
    const raw = await apiClient.post(`/api/pacts/${id}/qr`);
    return QrResponseSchema.parse(raw);
  },

  /** POST /api/pacts/verify-qr */
  verifyQr: async (nonce: string, pactId: string): Promise<Pact> => {
    const raw = await apiClient.post("/api/pacts/verify-qr", { nonce, pactId });
    return PactSchema.parse(raw);
  },

  attachOnchainTx: async (id: string, txHash: string, contractAddress: string): Promise<Pact> => {
    const raw = await apiClient.patch(`/api/pacts/${id}/onchain`, { txHash, contractAddress });
    return PactSchema.parse(raw);
  },

  accept: async (id: string): Promise<Pact> => {
    const raw = await apiClient.post(`/api/pacts/${id}/accept`);
    return PactSchema.parse(raw);
  },
};

export const authApi = {
  logout: async (): Promise<{ success: boolean }> => apiClient.post("/api/auth/logout"),
};

// ------------------------------------------------------------
// History
// ------------------------------------------------------------

export const historyApi = {
  /** GET /api/pacts/history?wallet=...&page=...&limit=... */
  list: async (filters: HistoryFilters): Promise<PaginatedResponse<Pact>> => {
    const raw = await apiClient.get("/api/pacts/history", toQueryParams(filters));
    return HistoryListSchema.parse(raw);
  },
};

// ------------------------------------------------------------
// Profile
// ------------------------------------------------------------

export const profileApi = {
  /** GET /api/profile/:wallet */
  get: async (wallet: string): Promise<Profile> => {
    const raw = await apiClient.get(`/api/profile/${wallet}`);
    return ProfileSchema.parse(raw);
  },

  /** PATCH /api/profile/:wallet */
  update: async (
    wallet: string,
    fields: { displayName?: string; email?: string; avatarUrl?: string }
  ): Promise<Profile> => {
    const raw = await apiClient.patch(`/api/profile/${wallet}`, fields);
    return ProfileSchema.parse(raw);
  },
};

// ------------------------------------------------------------
// Sessions
// ------------------------------------------------------------

export const sessionsApi = {
  /** GET /api/sessions */
  list: async (): Promise<Session[]> => {
    const raw = await apiClient.get("/api/sessions");
    return SessionListSchema.parse(raw);
  },

  /** DELETE /api/sessions/:id */
  revoke: async (id: string): Promise<{ success: boolean }> =>
    apiClient.delete(`/api/sessions/${id}`),
};

// ------------------------------------------------------------
// TOTP 2FA
// ------------------------------------------------------------

export const totpApi = {
  setup: async (): Promise<{ otpauthUrl: string }> =>
    apiClient.post("/api/auth/2fa/setup"),

  confirm: async (token: string): Promise<{ success: boolean }> =>
    apiClient.post("/api/auth/2fa/confirm", { token }),

  disable: async (token: string): Promise<{ success: boolean }> =>
    apiClient.post("/api/auth/2fa/disable", { token }),
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

export const notificationsApi = {
  list: async (cursor?: string): Promise<{ data: AppNotification[]; hasMore: boolean; nextCursor?: string | null; unread: number }> =>
    apiClient.get("/api/notifications", { limit: 20, ...(cursor ? { cursor } : {}) }),

  markRead: async (id: string): Promise<{ success: boolean }> => apiClient.patch(`/api/notifications/${id}/read`),

  markAllRead: async (): Promise<{ success: boolean }> => apiClient.patch("/api/notifications/read-all"),

  subscribePush: async (payload: { endpoint: string; p256dh: string; auth: string }): Promise<{ success: boolean }> =>
    apiClient.post("/api/notifications/subscribe", payload),
};
