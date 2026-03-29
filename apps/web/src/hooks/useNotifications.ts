import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type AppNotification } from "@/lib/api/endpoints";
import { hasAuthToken } from "@/lib/api/client";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => ["notifications", "list"] as const,
};

export function useNotifications() {
  return useQuery<{ data: AppNotification[]; hasMore: boolean; nextCursor?: string | null; unread: number }, Error>({
    queryKey: notificationKeys.list(),
    queryFn: () => notificationsApi.list(),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    staleTime: 5_000,
    enabled: typeof window !== "undefined" && hasAuthToken(),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, void>({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });
}
