import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getVisibilitySummary,
  updateVisibility,
  type TalentVisibilityScope,
  type VisibilitySummary,
} from "@/lib/api/visibility";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Lightweight hook for visibility summary - optimized for dashboard
 */
export function useVisibilitySummary() {
  const { session, profile } = useAuth();

  return useQuery({
    queryKey: queryKeys.visibility.summary(),
    queryFn: async () => {
      const { summary, error } = await getVisibilitySummary();
      if (error) throw error;
      return summary;
    },
    enabled: !!session && !!profile,
    staleTime: 1000 * 180,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Mutation with optimistic updates for instant toggle feel
 */
export function useUpdateVisibilitySummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scope,
      extraHours,
    }: {
      scope: TalentVisibilityScope;
      extraHours: boolean;
    }) => {
      const { success, error } = await updateVisibility(scope, extraHours);
      if (error) throw error;
      return success;
    },
    onMutate: async ({ scope, extraHours }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.visibility.summary() });
      const previousSummary = queryClient.getQueryData<VisibilitySummary>(queryKeys.visibility.summary());
      queryClient.setQueryData<VisibilitySummary>(queryKeys.visibility.summary(), () => ({
        scope,
        available_for_extra_hours: extraHours,
      }));
      return { previousSummary };
    },
    onError: (err, variables, context) => {
      if (context?.previousSummary) {
        queryClient.setQueryData(queryKeys.visibility.summary(), context.previousSummary);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visibility.summary() });
      queryClient.invalidateQueries({ queryKey: queryKeys.circles.myVisibility() });
    },
  });
}
