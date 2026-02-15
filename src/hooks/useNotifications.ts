import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  subscribeToNotifications,
  type Notification,
  type NotificationFilters,
} from "@/lib/api/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook for fetching notifications with optional filters
 */
export function useNotifications(filters: NotificationFilters = {}) {
  return useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: async () => {
      const { notifications, error } = await listNotifications(filters);
      if (error) throw error;
      return notifications;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Hook for fetching unread notification count
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async () => {
      const { count, error } = await getUnreadCount();
      if (error) throw error;
      return count;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Hook for marking a notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { success, error } = await markRead(notificationId);
      if (error) throw error;
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Hook for marking all notifications as read
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { count, error } = await markAllRead();
      if (error) throw error;
      return count;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Hook for real-time notification updates
 */
export function useNotificationsRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleNewNotification = useCallback(
    (notification: Notification) => {
      queryClient.setQueryData<Notification[]>(
        queryKeys.notifications.list({}),
        (old) => (old ? [notification, ...old] : [notification])
      );

      queryClient.setQueryData<number>(
        queryKeys.notifications.unreadCount(),
        (old) => (old ?? 0) + 1
      );
    },
    [queryClient]
  );

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToNotifications(user.id, handleNewNotification);

    return () => {
      unsubscribe();
    };
  }, [user?.id, handleNewNotification]);
}
