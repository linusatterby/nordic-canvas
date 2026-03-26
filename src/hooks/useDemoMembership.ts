import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ensureDemoMembership } from "@/lib/api/demoMembership";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook that idempotently ensures the current demo user
 * is a member of the given demo org. Runs once per orgId.
 */
export function useDemoMembership(orgId: string | undefined, isDemoMode: boolean) {
  const ensuredRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isDemoMode || !orgId || ensuredRef.current === orgId) return;

    ensuredRef.current = orgId;

    ensureDemoMembership(orgId).then(({ ok }) => {
      if (ok) {
        // Invalidate comms queries so they refetch with new membership
        queryClient.invalidateQueries({ queryKey: queryKeys.internalComms.messages(orgId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.internalComms.groups(orgId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.orgs.my() });
      }
    });
  }, [isDemoMode, orgId, queryClient]);
}
