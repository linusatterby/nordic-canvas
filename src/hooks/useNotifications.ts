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

const NOTIFICATIONS_KEY = "notifications";
const UNREAD_COUNT_KEY = "notifications-unread-count";

/**
 * Hook for fetching notifications with optional filters
 */
export function useNotifications(filters: NotificationFilters = {}) {
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, filters],
    queryFn: async () => {
      const { notifications, error } = await listNotifications(filters);
      if (error) throw error;
      return notifications;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Polling every 60 seconds
  });
}

/**
 * Hook for fetching unread notification count
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: [UNREAD_COUNT_KEY],
    queryFn: async () => {
      const { count, error } = await getUnreadCount();
      if (error) throw error;
      return count;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000, // More frequent polling for count
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
      // Invalidate both queries
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
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
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
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
      // Optimistically update the notifications list
      queryClient.setQueryData<Notification[]>(
        [NOTIFICATIONS_KEY, {}],
        (old) => (old ? [notification, ...old] : [notification])
      );

      // Increment unread count
      queryClient.setQueryData<number>(
        [UNREAD_COUNT_KEY],
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
