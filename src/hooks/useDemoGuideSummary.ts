import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDemoMode } from "@/hooks/useDemo";
import { useMatches } from "@/hooks/useMatches";
import { useScheduler } from "@/hooks/useScheduler";
import { supabase } from "@/integrations/supabase/client";
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
 * Hook to fetch demo guide progress summary
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
      const result = {
        hasSwiped: false,
        hasSentMessage: false,
        hasBorrowRequest: false,
        hasBorrowOffer: false,
        hasUpdatedProfile: false,
      };

      if (role === "employer" && orgId) {
        const [realSwipes, demoSwipes] = await Promise.all([
          supabase
            .from("employer_talent_swipes")
            .select("org_id", { count: "exact", head: true })
            .eq("org_id", orgId)
            .limit(1),
          supabase
            .from("employer_demo_talent_swipes")
            .select("org_id", { count: "exact", head: true })
            .eq("org_id", orgId)
            .limit(1),
        ]);
        result.hasSwiped = (realSwipes.count ?? 0) > 0 || (demoSwipes.count ?? 0) > 0;

        const { data: demoThreads } = await supabase
          .from("demo_chat_threads")
          .select("id")
          .eq("org_id", orgId)
          .limit(10);
        
        if (demoThreads && demoThreads.length > 0) {
          const threadIds = demoThreads.map((t) => t.id);
          const { count: demoMsgCount } = await supabase
            .from("demo_chat_messages")
            .select("id", { count: "exact", head: true })
            .in("thread_id", threadIds)
            .eq("sender_type", "org")
            .limit(1);
          
          if ((demoMsgCount ?? 0) > 0) {
            result.hasSentMessage = true;
          }
        }

        if (!result.hasSentMessage && userId) {
          const { count: realMsgCount } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("sender_user_id", userId)
            .limit(1);
          result.hasSentMessage = (realMsgCount ?? 0) > 0;
        }

        const { count: borrowReqCount } = await supabase
          .from("borrow_requests")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .limit(1);
        result.hasBorrowRequest = (borrowReqCount ?? 0) > 0;
      }

      if (role === "talent" && userId) {
        const { count: swipeCount } = await supabase
          .from("talent_job_swipes")
          .select("job_post_id", { count: "exact", head: true })
          .eq("talent_user_id", userId)
          .limit(1);
        result.hasSwiped = (swipeCount ?? 0) > 0;

        const { count: msgCount } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("sender_user_id", userId)
          .limit(1);
        result.hasSentMessage = (msgCount ?? 0) > 0;

        const { count: offerCount } = await supabase
          .from("borrow_offers")
          .select("id", { count: "exact", head: true })
          .eq("talent_user_id", userId)
          .limit(1);
        result.hasBorrowOffer = (offerCount ?? 0) > 0;

        const { data: profile } = await supabase
          .from("talent_profiles")
          .select("bio, desired_roles")
          .eq("user_id", userId)
          .maybeSingle();
        
        result.hasUpdatedProfile = !!(
          profile?.bio || 
          (profile?.desired_roles && profile.desired_roles.length > 0)
        );
      }

      return result;
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
