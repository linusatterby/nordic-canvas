import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertTalentJobSwipe, type JobWithOrg } from "@/lib/api/jobs";
import { upsertEmployerTalentSwipe } from "@/lib/api/talent";
import { logListingInteraction, logCandidateInteraction } from "@/lib/api/ranking";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook for talent to swipe on a job with optimistic updates
 */
export function useSwipeTalentJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, direction }: { jobId: string; direction: "yes" | "no" }) => {
      console.log("[useSwipeTalentJob] Swiping job:", jobId, direction);
      logListingInteraction(jobId, direction === "yes" ? "swipe_yes" : "swipe_no");
      const { error } = await upsertTalentJobSwipe(jobId, direction);
      if (error) throw error;
      return { jobId, direction };
    },
    onMutate: async ({ jobId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.jobs.all });
      
      const previousUnswiped = queryClient.getQueriesData({ queryKey: queryKeys.jobs.unswiped() });
      const previousHard = queryClient.getQueryData(queryKeys.jobs.demoHard());
      
      queryClient.setQueriesData(
        { queryKey: queryKeys.jobs.unswiped() },
        (old: JobWithOrg[] | undefined) => old?.filter(job => job.id !== jobId) ?? []
      );
      
      queryClient.setQueryData(
        queryKeys.jobs.demoHard(),
        (old: any[] | undefined) => old?.filter(job => job.id !== jobId) ?? []
      );
      
      return { previousUnswiped, previousHard };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousUnswiped) {
        context.previousUnswiped.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousHard) {
        queryClient.setQueryData(queryKeys.jobs.demoHard(), context.previousHard);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.unswiped() });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.demoHard() });
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
      logCandidateInteraction(
        params.orgId, params.jobId, params.talentUserId, params.demoCardId,
        params.direction === "yes" ? "swipe_yes" : "swipe_no"
      );
      const { error } = await upsertEmployerTalentSwipe(params);
      if (error) throw error;
      return params;
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.talentFeed.all });
      
      const previousNormal = queryClient.getQueryData(queryKeys.talentFeed.list(params.jobId, params.orgId));
      const previousHard = queryClient.getQueryData(queryKeys.talentFeed.hardDemo(params.orgId, params.jobId));
      
      const targetId = params.type === "demo_card" ? params.demoCardId : params.talentUserId;
      
      queryClient.setQueryData(
        queryKeys.talentFeed.list(params.jobId, params.orgId),
        (old: any[] | undefined) => {
          if (!old) return [];
          return old.filter(talent => {
            const id = talent.type === "demo_card" ? talent.demo_card_id : talent.user_id;
            return id !== targetId;
          });
        }
      );
      
      queryClient.setQueryData(
        queryKeys.talentFeed.hardDemo(params.orgId, params.jobId),
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
      if (context?.previousNormal) {
        queryClient.setQueryData(
          queryKeys.talentFeed.list(context.params.jobId, context.params.orgId),
          context.previousNormal
        );
      }
      if (context?.previousHard) {
        queryClient.setQueryData(
          queryKeys.talentFeed.hardDemo(context.params.orgId, context.params.jobId),
          context.previousHard
        );
      }
    },
    onSettled: (_data, _err, params) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talentFeed.list(params.jobId, params.orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.talentFeed.hardDemo(params.orgId, params.jobId) });
      if (params.direction === "yes") {
        queryClient.invalidateQueries({ queryKey: queryKeys.matches.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.matches.orgMatches() });
      }
    },
  });
}
