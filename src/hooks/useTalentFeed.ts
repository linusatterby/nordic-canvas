import { useQuery } from "@tanstack/react-query";
import { listTalentsForJob, type CandidateCardDTO } from "@/lib/api/talent";

/**
 * Hook to fetch talents who have swiped YES on a job
 */
export function useTalentFeed(jobId: string | undefined, orgId: string | undefined) {
  return useQuery({
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
}
