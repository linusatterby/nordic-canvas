import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getVisibilitySummary,
  updateVisibility,
  type TalentVisibilityScope,
  type VisibilitySummary,
} from "@/lib/api/visibility";

/**
 * Lightweight hook for visibility summary - optimized for dashboard
 */
export function useVisibilitySummary() {
  const { session, profile } = useAuth();

  return useQuery({
    queryKey: ["visibilitySummary"],
    queryFn: async () => {
      const { summary, error } = await getVisibilitySummary();
      if (error) throw error;
      return summary;
    },
    enabled: !!session && !!profile,
    staleTime: 1000 * 180, // 3 minutes - stable dashboard data
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
    // Optimistic update
    onMutate: async ({ scope, extraHours }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["visibilitySummary"] });

      // Snapshot the previous value
      const previousSummary = queryClient.getQueryData<VisibilitySummary>(["visibilitySummary"]);

      // Optimistically update to the new value
      queryClient.setQueryData<VisibilitySummary>(["visibilitySummary"], (old) => ({
        scope,
        available_for_extra_hours: extraHours,
      }));

      // Return context with the previous value
      return { previousSummary };
    },
    // On error, roll back to the previous value
    onError: (err, variables, context) => {
      if (context?.previousSummary) {
        queryClient.setQueryData(["visibilitySummary"], context.previousSummary);
      }
    },
    // Refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["visibilitySummary"] });
      // Also invalidate legacy myVisibility for consistency
      queryClient.invalidateQueries({ queryKey: ["myVisibility"] });
    },
  });
}
