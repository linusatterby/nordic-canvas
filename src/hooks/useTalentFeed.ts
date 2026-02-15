import { useQuery } from "@tanstack/react-query";
import { listTalentsForJob, listDemoTalentsHard, type CandidateCardDTO } from "@/lib/api/talent";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook to fetch talents who have swiped YES on a job
 */
export function useTalentFeed(
  jobId: string | undefined, 
  orgId: string | undefined,
  isDemoMode: boolean = false
) {
  // Normal feed query
  const normalQuery = useQuery({
    queryKey: queryKeys.talentFeed.list(jobId, orgId),
    queryFn: async () => {
      if (!jobId || !orgId) return [];
      const { talents, error } = await listTalentsForJob(jobId, orgId);
      if (error) throw error;
      return talents;
    },
    enabled: !!jobId && !!orgId,
    staleTime: 1000 * 120,
    refetchOnMount: false,
  });

  // Hard demo fallback query
  const hardQuery = useQuery({
    queryKey: queryKeys.talentFeed.hardDemo(orgId, jobId),
    queryFn: async () => {
      if (!orgId) return [];
      const { talents, error } = await listDemoTalentsHard(orgId, jobId ?? null, 6);
      if (error) throw error;
      return talents;
    },
    enabled: isDemoMode && !!orgId && !normalQuery.isLoading && (normalQuery.data?.length ?? 0) === 0,
    staleTime: 1000 * 60 * 5,
  });

  const shouldUseHardFetch = isDemoMode && 
    !normalQuery.isLoading && 
    (normalQuery.data?.length ?? 0) === 0 &&
    (hardQuery.data?.length ?? 0) > 0;

  const effectiveTalents = shouldUseHardFetch 
    ? hardQuery.data ?? [] 
    : normalQuery.data ?? [];

  const realCount = effectiveTalents.filter((t) => t.type === "real").length;
  const demoCardCount = effectiveTalents.filter((t) => t.type === "demo_card").length;

  return {
    data: effectiveTalents,
    isLoading: normalQuery.isLoading || (isDemoMode && hardQuery.isLoading && (normalQuery.data?.length ?? 0) === 0),
    error: normalQuery.error ?? hardQuery.error,
    debug: {
      normalCount: normalQuery.data?.length ?? 0,
      hardCount: hardQuery.data?.length ?? 0,
      shouldUseHardFetch,
      normalError: normalQuery.error?.message ?? null,
      hardError: hardQuery.error?.message ?? null,
      isNormalLoading: normalQuery.isLoading,
      isHardLoading: hardQuery.isLoading,
      realCount, demoCardCount,
      tables: {
        demoCards: "demo_talent_cards",
        demoSwipes: "employer_demo_talent_swipes",
        realSwipes: "employer_talent_swipes",
      },
    },
    refetch: () => {
      normalQuery.refetch();
      if (isDemoMode) hardQuery.refetch();
    },
  };
}
