import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export interface NotificationFilters {
  unreadOnly?: boolean;
  limit?: number;
}

/**
 * List notifications for the current user
 */
export async function listNotifications(
  filters: NotificationFilters = {}
): Promise<{
  notifications: Notification[];
  error: Error | null;
}> {
  const { limit = 50, unreadOnly = false } = filters;

  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;

  return {
    notifications: data ?? [],
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Get unread notification count for current user
 */
export async function getUnreadCount(): Promise<{
  count: number;
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc("get_unread_notification_count");

  return {
    count: data ?? 0,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Mark a single notification as read
 */
export async function markRead(notificationId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  });

  return {
    success: !!data,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllRead(): Promise<{
  count: number;
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc("mark_all_notifications_read");

  return {
    count: data ?? 0,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Subscribe to new notifications (realtime)
 */
export function subscribeToNotifications(
  userId: string,
  onInsert: (notification: Notification) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_user_id=eq.${userId}`,
      },
      (payload) => {
        onInsert(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
