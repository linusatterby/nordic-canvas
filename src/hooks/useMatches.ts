import { useQuery } from "@tanstack/react-query";
import { listMyMatches, listOrgMatches, getMatch, getMatchByJobAndTalent, type MatchDTO } from "@/lib/api/matches";
import { useDemoMode } from "@/hooks/useDemo";
import { useDemoMatches, type DemoMatchDTO } from "@/hooks/useDemoMatches";

// Union type for effective matches (can be real or demo)
export interface EffectiveMatch {
  id: string;
  org_id: string;
  job_post_id: string;
  talent_user_id: string | null;
  demo_card_id?: string | null;
  status: string | null;
  created_at: string;
  job_title: string;
  job_location: string | null;
  job_start_date: string;
  job_end_date: string;
  org_name: string;
  talent_name: string | null;
  talent_legacy_score: number | null;
  last_message: string | null;
  is_demo: boolean;
}

function toEffectiveMatch(match: MatchDTO): EffectiveMatch {
  return {
    ...match,
    is_demo: false,
  };
}

function demoToEffectiveMatch(match: DemoMatchDTO): EffectiveMatch {
  return {
    id: match.id,
    org_id: match.org_id,
    job_post_id: match.job_post_id,
    talent_user_id: match.talent_user_id,
    demo_card_id: match.demo_card_id,
    status: match.status,
    created_at: match.created_at,
    job_title: match.job_title,
    job_location: match.job_location,
    job_start_date: match.job_start_date,
    job_end_date: match.job_end_date,
    org_name: match.org_name,
    talent_name: match.talent_name,
    talent_legacy_score: match.talent_legacy_score,
    last_message: match.last_message,
    is_demo: true,
  };
}

/**
 * Hook to fetch matches for talent or employer
 * In demo mode: returns demo matches if no real matches exist
 */
export function useMatches(
  role: "talent" | "employer",
  orgId?: string | null
) {
  const { isDemoMode } = useDemoMode();
  
  // Fetch real matches
  const realQuery = useQuery({
    queryKey: ["matches", role, orgId],
    queryFn: async () => {
      if (role === "talent") {
        const { matches, error } = await listMyMatches();
        if (error) throw error;
        return matches;
      } else {
        if (!orgId) return [];
        const { matches, error } = await listOrgMatches(orgId);
        if (error) throw error;
        return matches;
      }
    },
    enabled: role === "talent" || !!orgId,
    staleTime: 1000 * 120, // 2 minutes for dashboard
  });

  // Fetch demo matches (only in demo mode for employer)
  const demoQuery = useDemoMatches(
    role === "employer" ? (orgId ?? undefined) : undefined,
    isDemoMode && role === "employer"
  );

  // Compute effective matches
  const realMatches = realQuery.data ?? [];
  const demoMatches = demoQuery.data ?? [];
  
  // Use real matches if available, otherwise use demo matches in demo mode
  const effectiveMatches: EffectiveMatch[] = realMatches.length > 0
    ? realMatches.map(toEffectiveMatch)
    : isDemoMode
      ? demoMatches.map(demoToEffectiveMatch)
      : [];

  return {
    data: effectiveMatches,
    isLoading: realQuery.isLoading || (isDemoMode && demoQuery.isLoading),
    error: realQuery.error || demoQuery.error,
    // Expose raw data for debugging
    debug: {
      realCount: realMatches.length,
      demoCount: demoMatches.length,
      isDemoMode,
      usingDemo: realMatches.length === 0 && demoMatches.length > 0,
    },
  };
}

/**
 * Hook to fetch a single match
 */
export function useMatch(matchId: string | undefined) {
  return useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const { match, error } = await getMatch(matchId);
      if (error) throw error;
      return match;
    },
    enabled: !!matchId,
  });
}

/**
 * Hook to check if a match exists after swipe
 */
export function useCheckMatch(jobId: string | undefined, talentUserId: string | undefined) {
  return useQuery({
    queryKey: ["checkMatch", jobId, talentUserId],
    queryFn: async () => {
      if (!jobId || !talentUserId) return null;
      const { match, error } = await getMatchByJobAndTalent(jobId, talentUserId);
      if (error) throw error;
      return match;
    },
    enabled: !!jobId && !!talentUserId,
  });
}
