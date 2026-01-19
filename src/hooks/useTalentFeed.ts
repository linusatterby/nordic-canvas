import { useQuery } from "@tanstack/react-query";
import { listTalentsForJob, listDemoTalentsHard, type CandidateCardDTO } from "@/lib/api/talent";

/**
 * Hook to fetch talents who have swiped YES on a job
 * In demo mode, uses hard fallback if normal feed is empty
 */
export function useTalentFeed(
  jobId: string | undefined, 
  orgId: string | undefined,
  isDemoMode: boolean = false
) {
  // Normal feed query
  const normalQuery = useQuery({
    queryKey: ["talentFeed", jobId, orgId],
    queryFn: async () => {
      if (!jobId || !orgId) return [];
      const { talents, error } = await listTalentsForJob(jobId, orgId);
      if (error) throw error;
      return talents;
    },
    enabled: !!jobId && !!orgId,
    staleTime: 1000 * 60, // 1 minute
  });

  // Hard demo fallback query - only enabled in demo mode when normal feed is empty
  const hardQuery = useQuery({
    queryKey: ["talentFeed", "hard", "demo", orgId, jobId],
    queryFn: async () => {
      if (!orgId) return [];
      const { talents, error } = await listDemoTalentsHard(orgId, jobId ?? null, 6);
      if (error) throw error;
      return talents;
    },
    enabled: isDemoMode && !!orgId && !normalQuery.isLoading && (normalQuery.data?.length ?? 0) === 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Determine if we should use hard fetch
  const shouldUseHardFetch = isDemoMode && 
    !normalQuery.isLoading && 
    (normalQuery.data?.length ?? 0) === 0 &&
    (hardQuery.data?.length ?? 0) > 0;

  // Effective talents to display
  const effectiveTalents = shouldUseHardFetch 
    ? hardQuery.data ?? [] 
    : normalQuery.data ?? [];

  return {
    // Main data
    data: effectiveTalents,
    isLoading: normalQuery.isLoading || (isDemoMode && hardQuery.isLoading && (normalQuery.data?.length ?? 0) === 0),
    error: normalQuery.error ?? hardQuery.error,
    
    // Debug info for demo mode
    debug: {
      normalCount: normalQuery.data?.length ?? 0,
      hardCount: hardQuery.data?.length ?? 0,
      shouldUseHardFetch,
      normalError: normalQuery.error?.message ?? null,
      hardError: hardQuery.error?.message ?? null,
      isNormalLoading: normalQuery.isLoading,
      isHardLoading: hardQuery.isLoading,
    },
    
    // Refetch function
    refetch: () => {
      normalQuery.refetch();
      if (isDemoMode) {
        hardQuery.refetch();
      }
    },
  };
}
