import { useQuery } from "@tanstack/react-query";
import { listDemoInboxItems, type DemoInboxItem, type DemoInboxTab } from "@/lib/api/demoInbox";
import { useDemoMode } from "@/hooks/useDemo";
import { isDemoEffectivelyEnabled } from "@/lib/config/env";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook to fetch demo inbox items for a specific tab.
 * Only fetches when the user is in demo mode.
 */
export function useDemoInbox(tab?: DemoInboxTab) {
  const { isDemoMode } = useDemoMode();
  const demoEnabled = isDemoEffectivelyEnabled(isDemoMode);

  return useQuery({
    queryKey: queryKeys.demo.inbox(tab),
    queryFn: async () => {
      const { items, error } = await listDemoInboxItems(tab);
      if (error) throw error;
      return items;
    },
    enabled: demoEnabled,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to get demo notification items
 */
export function useDemoNotifications() {
  return useDemoInbox("notification");
}

/**
 * Hook to get demo match items
 */
export function useDemoMatchItems() {
  return useDemoInbox("match");
}

/**
 * Hook to get demo offer items
 */
export function useDemoOfferItems() {
  return useDemoInbox("offer");
}

/**
 * Hook to get demo message items
 */
export function useDemoMessageItems() {
  return useDemoInbox("message");
}

/**
 * Hook to get demo request items
 */
export function useDemoRequestItems() {
  return useDemoInbox("request");
}
