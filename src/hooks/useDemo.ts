import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { resetDemo, listMyDemoOrgs } from "@/lib/api/demo";
import { useDefaultOrgId } from "./useOrgs";

/**
 * Hook to check if user is in demo mode (belongs to any demo org)
 */
export function useDemoMode() {
  const { data: demoOrgIds = [], isLoading } = useQuery({
    queryKey: ["demoOrgs"],
    queryFn: async () => {
      const { demoOrgIds, error } = await listMyDemoOrgs();
      if (error) throw error;
      return demoOrgIds;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    isDemoMode: demoOrgIds.length > 0,
    demoOrgIds,
    isLoading,
  };
}

/**
 * Hook to reset demo data
 */
export function useResetDemo() {
  const queryClient = useQueryClient();
  const { data: defaultOrgId } = useDefaultOrgId();
  const { demoOrgIds } = useDemoMode();

  return useMutation({
    mutationFn: async (orgId: string | undefined) => {
      // Priority: passed orgId > first demo org > default org
      const targetOrgId = orgId ?? demoOrgIds[0] ?? defaultOrgId;
      if (!targetOrgId) {
        throw new Error("No org ID provided");
      }
      const { result, error } = await resetDemo(targetOrgId);
      if (error) throw error;
      if (!result?.success) {
        throw new Error(result?.error ?? "Failed to reset demo");
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate all relevant queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["orgMatches"] });
      queryClient.invalidateQueries({ queryKey: ["scheduler"] });
      queryClient.invalidateQueries({ queryKey: ["orgBorrowRequests"] });
      queryClient.invalidateQueries({ queryKey: ["talentBorrowOffers"] });
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      queryClient.invalidateQueries({ queryKey: ["thread"] });
      queryClient.invalidateQueries({ queryKey: ["orgJobs"] });
    },
  });
}
