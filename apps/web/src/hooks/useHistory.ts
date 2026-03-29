// ============================================================
// apps/web/src/hooks/useHistory.ts
// Paginated transaction history with filters
// Matches history/page.tsx — search, type filter, date range
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { historyApi } from "@/lib/api/endpoints";
import type { HistoryFilters, PaginatedResponse, Pact } from "@/lib/types";

// ------------------------------------------------------------
// Query keys
// ------------------------------------------------------------

export const historyKeys = {
  all: ["history"] as const,
  list: (filters: HistoryFilters) => ["history", filters] as const,
};

// ------------------------------------------------------------
// History hook
// ------------------------------------------------------------

export function useHistory(filters: HistoryFilters) {
  return useQuery<PaginatedResponse<Pact>, Error>({
    queryKey: historyKeys.list(filters),
    queryFn: () => historyApi.list(filters),
    enabled: !!filters.wallet,
    staleTime: 30_000,
    refetchInterval: 12_000,
    refetchIntervalInBackground: true,
    retry: 2,
    placeholderData: (prev) => prev,   // keep previous page visible while loading next
  });
}
