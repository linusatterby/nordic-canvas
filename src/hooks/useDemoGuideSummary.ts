import { useQuery } from "@tanstack/react-query";
import { getDemoGuideSummary, type DemoGuideSummary } from "@/lib/api/demoGuide";
import { useDemoMode } from "@/hooks/useDemo";

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
 * Uses data from database with localStorage fallback
 */
export function useDemoGuideSummary(params: UseDemoGuideSummaryParams) {
  const { orgId, userId, role } = params;
  const { isDemoMode } = useDemoMode();

  const query = useQuery({
    queryKey: ["demoGuideSummary", role, orgId, userId],
    queryFn: async () => {
      const { summary, error } = await getDemoGuideSummary({ orgId, userId, role });
      
      if (error) {
        // Fall back to localStorage
        console.warn("[useDemoGuideSummary] API error, using localStorage fallback");
        return getLocalStorageFallback(role);
      }
      
      // Save to localStorage for offline fallback
      saveToLocalStorage(role, summary);
      
      return summary;
    },
    enabled: isDemoMode && (!!orgId || !!userId),
    staleTime: 1000 * 120, // 2 minutes
    refetchOnMount: true,
    initialData: () => getLocalStorageFallback(role),
  });

  return {
    summary: query.data ?? getLocalStorageFallback(role),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export type { DemoGuideSummary };
