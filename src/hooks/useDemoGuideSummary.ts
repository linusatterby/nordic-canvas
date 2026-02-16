import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDemoMode } from "@/hooks/useDemo";
import { useMatches } from "@/hooks/useMatches";
import { useScheduler } from "@/hooks/useScheduler";
import { getDemoGuideSummary } from "@/lib/api/demoGuide";
import { queryKeys } from "@/lib/queryKeys";

export interface DemoGuideSummary {
  hasSwiped: boolean;
  hasMatchThread: boolean;
  hasSentMessage: boolean;
  hasBorrowRequest: boolean;
  hasBorrowOffer: boolean;
  hasBooking: boolean;
  hasReleaseOffer: boolean;
  hasUpdatedProfile: boolean;
}

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
 * Hook to fetch demo guide progress summary.
 * All data access goes through src/lib/api/demoGuide.ts (no direct Supabase).
 */
export function useDemoGuideSummary(params: UseDemoGuideSummaryParams) {
  const { orgId, userId, role } = params;
  const { isDemoMode } = useDemoMode();

  const matchesQuery = useMatches(role, orgId);
  
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 13);
  
  const range = {
    start: weekStart.toISOString(),
    end: weekEnd.toISOString(),
  };
  
  const schedulerQuery = useScheduler(
    role === "employer" ? orgId ?? undefined : undefined,
    range,
    []
  );

  const additionalQuery = useQuery({
    queryKey: queryKeys.demo.guideSummary(role, orgId, userId),
    queryFn: async () => {
      const { summary } = await getDemoGuideSummary({ orgId, userId, role });
      return summary;
    },
    enabled: isDemoMode && (!!orgId || !!userId),
    staleTime: 1000 * 120,
  });

  const summary = useMemo<DemoGuideSummary>(() => {
    const additional = additionalQuery.data ?? getLocalStorageFallback(role);
    
    const hasMatchThread = (matchesQuery.data?.length ?? 0) > 0;
    const hasBooking = (schedulerQuery.data?.bookings?.length ?? 0) > 0;
    const hasReleaseOffer = (schedulerQuery.data?.releaseOffers?.length ?? 0) > 0;

    const result: DemoGuideSummary = {
      hasSwiped: additional.hasSwiped,
      hasMatchThread,
      hasSentMessage: additional.hasSentMessage,
      hasBorrowRequest: additional.hasBorrowRequest,
      hasBorrowOffer: additional.hasBorrowOffer,
      hasBooking,
      hasReleaseOffer,
      hasUpdatedProfile: additional.hasUpdatedProfile,
    };

    saveToLocalStorage(role, result);

    return result;
  }, [matchesQuery.data, schedulerQuery.data, additionalQuery.data, role]);

  const isLoading = matchesQuery.isLoading || 
    (role === "employer" && schedulerQuery.isLoading) || 
    additionalQuery.isLoading;

  return {
    summary,
    isLoading,
    error: matchesQuery.error || schedulerQuery.error || additionalQuery.error,
    refetch: () => {
      additionalQuery.refetch();
    },
  };
}
