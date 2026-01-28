import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDemoMode } from "@/hooks/useDemo";
import { getDemoGuideSummary, type DemoGuideSummary } from "@/lib/api/demoGuide";

// Re-export the interface for consumers
export type { DemoGuideSummary };

const LOCALSTORAGE_KEY_PREFIX = "demoGuideProgress:";

function getLocalStorageFallback(role: string): DemoGuideSummary {
  try {
    const stored = localStorage.getItem(`${LOCALSTORAGE_KEY_PREFIX}${role}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  
  return {
    hasSwiped: false,
    hasMatchThread: false,
    hasSentMessage: false,
    hasBorrowRequest: false,
    hasBorrowOffer: false,
    hasBooking: false,
    hasReleaseOffer: false,
    hasUpdatedProfile: false,
  };
}

function saveToLocalStorage(role: string, summary: DemoGuideSummary) {
  try {
    localStorage.setItem(
      `${LOCALSTORAGE_KEY_PREFIX}${role}`,
      JSON.stringify(summary)
    );
  } catch {
    // Ignore storage errors
  }
}

interface UseDemoGuideSummaryParams {
  orgId?: string | null;
  userId?: string | null;
  role: "employer" | "talent";
}

/**
 * Hook to fetch demo guide progress summary
 * Uses the API layer for all Supabase access
 */
export function useDemoGuideSummary(params: UseDemoGuideSummaryParams) {
  const { orgId, userId, role } = params;
  const { isDemoMode } = useDemoMode();

  // Query via API layer
  const query = useQuery({
    queryKey: ["demoGuideSummary", role, orgId, userId],
    queryFn: async () => {
      const { summary, error } = await getDemoGuideSummary({ orgId, userId, role });
      if (error) throw error;
      return summary;
    },
    enabled: isDemoMode && (!!orgId || !!userId),
    staleTime: 1000 * 120,
  });

  // Derive summary with localStorage fallback
  const summary = useMemo<DemoGuideSummary>(() => {
    const result = query.data ?? getLocalStorageFallback(role);

    // Save to localStorage for fallback
    if (query.data) {
      saveToLocalStorage(role, result);
    }

    return result;
  }, [query.data, role]);

  return {
    summary,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
