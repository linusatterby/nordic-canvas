import { useQuery } from "@tanstack/react-query";
import { listMyMatches, listOrgMatches, getMatch, getMatchByJobAndTalent } from "@/lib/api/matches";

/**
 * Hook to fetch matches for talent or employer
 */
export function useMatches(
  role: "talent" | "employer",
  orgId?: string | null
) {
  return useQuery({
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
