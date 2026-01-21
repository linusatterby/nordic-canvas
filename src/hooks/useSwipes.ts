import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertTalentJobSwipe, type JobWithOrg } from "@/lib/api/jobs";
import { upsertEmployerTalentSwipe } from "@/lib/api/talent";

/**
 * Hook for talent to swipe on a job with optimistic updates
 */
export function useSwipeTalentJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, direction }: { jobId: string; direction: "yes" | "no" }) => {
      console.log("[useSwipeTalentJob] Swiping job:", jobId, direction);
      const { error } = await upsertTalentJobSwipe(jobId, direction);
      if (error) throw error;
      return { jobId, direction };
    },
    onMutate: async ({ jobId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["jobs"] });
      
      // Snapshot previous values for all job queries
      const previousUnswiped = queryClient.getQueriesData({ queryKey: ["jobs", "unswiped"] });
      const previousHard = queryClient.getQueryData(["jobs", "demo-hard"]);
      
      // Optimistically remove the job from all caches
      queryClient.setQueriesData(
        { queryKey: ["jobs", "unswiped"] },
        (old: JobWithOrg[] | undefined) => old?.filter(job => job.id !== jobId) ?? []
      );
      
      queryClient.setQueryData(
        ["jobs", "demo-hard"],
        (old: any[] | undefined) => old?.filter(job => job.id !== jobId) ?? []
      );
      
      return { previousUnswiped, previousHard };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousUnswiped) {
        context.previousUnswiped.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousHard) {
        queryClient.setQueryData(["jobs", "demo-hard"], context.previousHard);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency after mutation
      queryClient.invalidateQueries({ queryKey: ["jobs", "unswiped"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "demo-hard"] });
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
      talentUserId?: string;
      demoCardId?: string;
      type?: "real" | "demo_card";
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
      // Also invalidate hard demo feed
      queryClient.invalidateQueries({ 
        queryKey: ["talentFeed", "hard", "demo"] 
      });
    },
  });
}
