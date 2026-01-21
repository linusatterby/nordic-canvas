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
 * Hook for employer to swipe on a talent with optimistic updates
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
      console.log("[useSwipeEmployerTalent] Swiping:", params);
      const { error } = await upsertEmployerTalentSwipe(params);
      if (error) throw error;
      return params;
    },
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["talentFeed"] });
      
      // Snapshot previous values
      const previousNormal = queryClient.getQueryData(["talentFeed", params.jobId, params.orgId]);
      const previousHard = queryClient.getQueryData(["talentFeed", "hard", "demo", params.orgId, params.jobId]);
      
      // Get the ID to remove
      const targetId = params.type === "demo_card" ? params.demoCardId : params.talentUserId;
      
      // Optimistically remove from normal feed
      queryClient.setQueryData(
        ["talentFeed", params.jobId, params.orgId],
        (old: any[] | undefined) => {
          if (!old) return [];
          return old.filter(talent => {
            const id = talent.type === "demo_card" ? talent.demo_card_id : talent.user_id;
            return id !== targetId;
          });
        }
      );
      
      // Optimistically remove from hard demo feed
      queryClient.setQueryData(
        ["talentFeed", "hard", "demo", params.orgId, params.jobId],
        (old: any[] | undefined) => {
          if (!old) return [];
          return old.filter(talent => {
            const id = talent.type === "demo_card" ? talent.demo_card_id : talent.user_id;
            return id !== targetId;
          });
        }
      );
      
      return { previousNormal, previousHard, params };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousNormal) {
        queryClient.setQueryData(
          ["talentFeed", context.params.jobId, context.params.orgId],
          context.previousNormal
        );
      }
      if (context?.previousHard) {
        queryClient.setQueryData(
          ["talentFeed", "hard", "demo", context.params.orgId, context.params.jobId],
          context.previousHard
        );
      }
    },
    onSettled: (_data, _err, params) => {
      // Invalidate to ensure consistency after mutation
      queryClient.invalidateQueries({ 
        queryKey: ["talentFeed", params.jobId, params.orgId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["talentFeed", "hard", "demo", params.orgId, params.jobId] 
      });
      // If "yes", also invalidate matches
      if (params.direction === "yes") {
        queryClient.invalidateQueries({ queryKey: ["matches"] });
        queryClient.invalidateQueries({ queryKey: ["orgMatches"] });
      }
    },
  });
}
