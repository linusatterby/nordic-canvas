import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  scoreListingsForTalent,
  scoreCandidatesForJob,
  type ScoredListing,
  type ScoredCandidate,
} from "@/lib/api/ranking";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Create a stable hash from an array of IDs for query keys
 */
function hashIds(ids: string[]): string {
  if (ids.length === 0) return "empty";
  const first = ids[0]?.slice(0, 8) ?? "";
  const last = ids[ids.length - 1]?.slice(0, 8) ?? "";
  return `${first}_${last}_${ids.length}`;
}

/**
 * Hook to batch score listings for the current talent
 */
export function useListingScores(
  talentUserId: string | undefined,
  listingIds: string[],
  enabled: boolean = true
) {
  const stableIds = React.useMemo(() => listingIds.slice(0, 12), [listingIds.join("|")]);
  const idsHash = React.useMemo(() => hashIds(stableIds), [stableIds]);

  return useQuery({
    queryKey: queryKeys.ranking.listings(talentUserId, idsHash),
    queryFn: async () => {
      if (!talentUserId || stableIds.length === 0) return new Map<string, ScoredListing>();
      
      const { scores, error } = await scoreListingsForTalent(talentUserId, stableIds);
      if (error) {
        console.warn("[useListingScores] Scoring failed, returning empty:", error);
        return new Map<string, ScoredListing>();
      }

      const scoreMap = new Map<string, ScoredListing>();
      scores.forEach((s) => scoreMap.set(s.listing_id, s));
      return scoreMap;
    },
    enabled: enabled && !!talentUserId && stableIds.length > 0,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to batch score candidates for a job
 */
export function useCandidateScores(
  orgId: string | undefined,
  jobPostId: string | undefined,
  talentUserIds: string[],
  demoCardIds: string[],
  enabled: boolean = true
) {
  const stableTalentIds = React.useMemo(() => talentUserIds.slice(0, 12), [talentUserIds.join("|")]);
  const stableDemoIds = React.useMemo(() => demoCardIds.slice(0, 12), [demoCardIds.join("|")]);
  const idsHash = React.useMemo(
    () => `t:${hashIds(stableTalentIds)}_d:${hashIds(stableDemoIds)}`,
    [stableTalentIds, stableDemoIds]
  );

  return useQuery({
    queryKey: queryKeys.ranking.candidates(orgId, jobPostId, idsHash),
    queryFn: async () => {
      if (!orgId || !jobPostId) return new Map<string, ScoredCandidate>();
      if (stableTalentIds.length === 0 && stableDemoIds.length === 0) return new Map<string, ScoredCandidate>();

      const { scores, error } = await scoreCandidatesForJob(orgId, jobPostId, stableTalentIds, stableDemoIds);
      if (error) {
        console.warn("[useCandidateScores] Scoring failed, returning empty:", error);
        return new Map<string, ScoredCandidate>();
      }

      const scoreMap = new Map<string, ScoredCandidate>();
      scores.forEach((s) => scoreMap.set(s.candidate_id, s));
      return scoreMap;
    },
    enabled: enabled && !!orgId && !!jobPostId && (stableTalentIds.length > 0 || stableDemoIds.length > 0),
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * @deprecated Use useStableRankedStack instead for swipe feeds
 */
export function attachAndSortByScore<T extends { id: string }>(
  items: T[],
  scoreMap: Map<string, { score: number; reasons: any[] }>,
  idExtractor: (item: T) => string = (item) => item.id
): (T & { match_score?: number; match_reasons?: any[] })[] {
  const enriched = items.map((item) => {
    const id = idExtractor(item);
    const scoreData = scoreMap.get(id);
    return { ...item, match_score: scoreData?.score, match_reasons: scoreData?.reasons };
  });

  return enriched.sort((a, b) => {
    const scoreA = a.match_score ?? -1;
    const scoreB = b.match_score ?? -1;
    return scoreB - scoreA;
  });
}
