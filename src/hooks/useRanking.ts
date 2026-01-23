import { useQuery } from "@tanstack/react-query";
import { 
  scoreListingsForTalent,
  scoreCandidatesForJob,
  type ScoredListing,
  type ScoredCandidate,
} from "@/lib/api/ranking";

/**
 * Hook to batch score listings for the current talent
 * Returns a map of listingId -> score data for efficient lookup
 */
export function useListingScores(
  talentUserId: string | undefined,
  listingIds: string[],
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["listingScores", talentUserId, listingIds.slice(0, 10).join(",")],
    queryFn: async () => {
      if (!talentUserId || listingIds.length === 0) return new Map<string, ScoredListing>();
      
      // Only score top 10 for performance
      const idsToScore = listingIds.slice(0, 10);
      const { scores, error } = await scoreListingsForTalent(talentUserId, idsToScore);
      
      if (error) {
        console.warn("[useListingScores] Scoring failed, returning empty:", error);
        return new Map<string, ScoredListing>();
      }

      const scoreMap = new Map<string, ScoredListing>();
      scores.forEach((s) => scoreMap.set(s.listing_id, s));
      return scoreMap;
    },
    enabled: enabled && !!talentUserId && listingIds.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to batch score candidates for a job
 * Returns a map of candidateId -> score data for efficient lookup
 */
export function useCandidateScores(
  orgId: string | undefined,
  jobPostId: string | undefined,
  talentUserIds: string[],
  demoCardIds: string[],
  enabled: boolean = true
) {
  const queryKey = [
    "candidateScores",
    orgId,
    jobPostId,
    talentUserIds.slice(0, 10).join(","),
    demoCardIds.slice(0, 10).join(","),
  ];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!orgId || !jobPostId) return new Map<string, ScoredCandidate>();
      
      // Only score top 10 for performance
      const talentsToScore = talentUserIds.slice(0, 10);
      const demosToScore = demoCardIds.slice(0, 10);
      
      if (talentsToScore.length === 0 && demosToScore.length === 0) {
        return new Map<string, ScoredCandidate>();
      }

      const { scores, error } = await scoreCandidatesForJob(
        orgId,
        jobPostId,
        talentsToScore,
        demosToScore
      );
      
      if (error) {
        console.warn("[useCandidateScores] Scoring failed, returning empty:", error);
        return new Map<string, ScoredCandidate>();
      }

      const scoreMap = new Map<string, ScoredCandidate>();
      scores.forEach((s) => scoreMap.set(s.candidate_id, s));
      return scoreMap;
    },
    enabled: enabled && !!orgId && !!jobPostId && (talentUserIds.length > 0 || demoCardIds.length > 0),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Attach scores to a list of items and sort by score
 */
export function attachAndSortByScore<T extends { id: string }>(
  items: T[],
  scoreMap: Map<string, { score: number; reasons: any[] }>,
  idExtractor: (item: T) => string = (item) => item.id
): (T & { match_score?: number; match_reasons?: any[] })[] {
  const enriched = items.map((item) => {
    const id = idExtractor(item);
    const scoreData = scoreMap.get(id);
    return {
      ...item,
      match_score: scoreData?.score,
      match_reasons: scoreData?.reasons,
    };
  });

  // Sort by score descending, items without score go to end
  return enriched.sort((a, b) => {
    const scoreA = a.match_score ?? -1;
    const scoreB = b.match_score ?? -1;
    return scoreB - scoreA;
  });
}
