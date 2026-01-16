import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertTalentJobSwipe } from "@/lib/api/jobs";
import { upsertEmployerTalentSwipe } from "@/lib/api/talent";

/**
 * Hook for talent to swipe on a job
 */
export function useSwipeTalentJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, direction }: { jobId: string; direction: "yes" | "no" }) => {
      const { error } = await upsertTalentJobSwipe(jobId, direction);
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate jobs feed to refetch unswiped jobs
      queryClient.invalidateQueries({ queryKey: ["jobs", "unswiped"] });
    },
  });
}

/**
 * Hook for employer to swipe on a talent
 */
export function useSwipeEmployerTalent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      orgId: string;
      jobId: string;
      talentUserId: string;
      direction: "yes" | "no";
    }) => {
      const { error } = await upsertEmployerTalentSwipe(params);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      // Invalidate talent feed for this job
      queryClient.invalidateQueries({ 
        queryKey: ["talentFeed", variables.jobId, variables.orgId] 
      });
    },
  });
}
