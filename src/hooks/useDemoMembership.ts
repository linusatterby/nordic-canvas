import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ensureDemoMembership } from "@/lib/api/demoMembership";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook that idempotently ensures the current demo user
 * is a member of the given demo org. Runs once per orgId.
 * Returns `ready` — true when membership is ensured (or not needed).
 */
export function useDemoMembership(orgId: string | undefined, isDemoMode: boolean) {
  const ensuredRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(!isDemoMode);

  useEffect(() => {
    if (!isDemoMode) {
      setReady(true);
      return;
    }

    if (!orgId) return;

    if (ensuredRef.current === orgId) {
      setReady(true);
      return;
    }

    setReady(false);
    ensureDemoMembership(orgId).then(({ ok }) => {
      ensuredRef.current = orgId;
      if (ok) {
        // Invalidate comms queries so they refetch with new membership
        queryClient.invalidateQueries({ queryKey: queryKeys.internalComms.messages(orgId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.internalComms.groups(orgId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.orgs.my() });
      }
      setReady(true);
    });
  }, [isDemoMode, orgId, queryClient]);

  return ready;
}
