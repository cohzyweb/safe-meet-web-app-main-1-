// ============================================================
// packages/shared/src/types.ts
//
// All TypeScript types are derived from Zod schemas via z.infer<>.
// Never write types by hand — update the schema instead.
// ============================================================

import type { z } from "zod";
import type {
  AssetSchema,
  AssetSymbolSchema,
  PactSchema,
  PactTypeSchema,
  PactStatusSchema,
  ProfileSchema,
  SessionSchema,
  DashboardStatsSchema,
  QrResponseSchema,
  ApiErrorSchema,
  CreateTradePactBodySchema,
  CreateGoalPactBodySchema,
  CreatePactBodySchema,
  UpdatePactStatusBodySchema,
  SubmitProofBodySchema,
  VerifyQrBodySchema,
  UpdateProfileBodySchema,
  PactFiltersSchema,
  HistoryFiltersSchema,
  HistoryListSchema,
  PaginatedResponseSchema,
} from "./schemas.js";

// ------------------------------------------------------------
// Domain types
// ------------------------------------------------------------

export type AssetSymbol = z.infer<typeof AssetSymbolSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type PactType = z.infer<typeof PactTypeSchema>;
export type PactStatus = z.infer<typeof PactStatusSchema>;
export type Pact = z.infer<typeof PactSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
export type QrResponse = z.infer<typeof QrResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

// ------------------------------------------------------------
// Request body types (used on both frontend forms and backend handlers)
// ------------------------------------------------------------

export type CreateTradePactBody = z.infer<typeof CreateTradePactBodySchema>;
export type CreateGoalPactBody = z.infer<typeof CreateGoalPactBodySchema>;
export type CreatePactBody = z.infer<typeof CreatePactBodySchema>;
export type UpdatePactStatusBody = z.infer<typeof UpdatePactStatusBodySchema>;
export type SubmitProofBody = z.infer<typeof SubmitProofBodySchema>;
export type VerifyQrBody = z.infer<typeof VerifyQrBodySchema>;
export type UpdateProfileBody = z.infer<typeof UpdateProfileBodySchema>;

// ------------------------------------------------------------
// Filter / query param types
// ------------------------------------------------------------

export type PactFilters = z.infer<typeof PactFiltersSchema>;
export type HistoryFilters = z.infer<typeof HistoryFiltersSchema>;

// ------------------------------------------------------------
// Response wrappers
// ------------------------------------------------------------

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string | undefined;
};

export type HistoryList = z.infer<typeof HistoryListSchema>;

// ------------------------------------------------------------
// Utility: extract the success type from a paginatedResponse
// ------------------------------------------------------------

/** Makes PaginatedResponseSchema generic-friendly for z.infer */
export type InferPaginatedResponse<T extends z.ZodTypeAny> =
  ReturnType<typeof PaginatedResponseSchema<T>> extends z.ZodTypeAny
    ? z.infer<ReturnType<typeof PaginatedResponseSchema<T>>>
    : never;
