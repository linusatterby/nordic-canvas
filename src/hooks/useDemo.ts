import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { resetDemo, resetDemoForUser, listMyDemoOrgs, seedDemoScenario } from "@/lib/api/demo";
import { useDefaultOrgId } from "./useOrgs";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook to check if user is in demo mode
 */
export function useDemoMode() {
  const { isDemoMode, loading, profileLoading } = useAuth();
  
  const { data: demoOrgIds = [], isLoading: orgsLoading } = useQuery({
    queryKey: queryKeys.demo.orgs(),
    queryFn: async () => {
      const { demoOrgIds, error } = await listMyDemoOrgs();
      if (error) throw error;
      return demoOrgIds;
    },
    enabled: isDemoMode,
    staleTime: 1000 * 60 * 5,
  });

  return {
    isDemoMode,
    demoOrgIds,
    isLoading: loading || profileLoading || (isDemoMode && orgsLoading),
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
      const targetOrgId = orgId ?? demoOrgIds[0] ?? defaultOrgId;
      
      if (targetOrgId) {
        const { result, error } = await resetDemo(targetOrgId);
        if (error) throw error;
        if (!result?.success) throw new Error(result?.error ?? "Failed to reset demo");
        return result;
      }
      
      const { result, error } = await resetDemoForUser();
      if (error) throw error;
      if (!result?.success) throw new Error(result?.error ?? "Failed to reset demo");
      return result;
    },
    onSuccess: () => {
      invalidateDemoQueries(queryClient);
    },
  });
}

/**
 * Hook to seed a complete demo scenario
 */
export function useSeedDemoScenario() {
  const queryClient = useQueryClient();
  const { data: defaultOrgId } = useDefaultOrgId();
  const { demoOrgIds } = useDemoMode();

  return useMutation({
    mutationFn: async (orgId?: string) => {
      const targetOrgId = orgId ?? demoOrgIds[0] ?? defaultOrgId;
      if (!targetOrgId) throw new Error("No demo org found");
      
      const { result, error } = await seedDemoScenario(targetOrgId);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      invalidateDemoQueries(queryClient);
    },
  });
}

/**
 * Helper to invalidate all demo-related queries
 */
function invalidateDemoQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.matches.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.matches.orgMatches() });
  queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.borrow.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.chat.all });
  queryClient.invalidateQueries({ queryKey: ["thread"] });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.talentFeed.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.visibility.summary() });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.talentSummary() });
  // Demo-specific queries
  queryClient.invalidateQueries({ queryKey: ["demoMatches"] });
  queryClient.invalidateQueries({ queryKey: ["demoChatThreads"] });
  queryClient.invalidateQueries({ queryKey: ["demoBookings"] });
  queryClient.invalidateQueries({ queryKey: ["demoReleaseOffers"] });
  // Housing queries
  queryClient.invalidateQueries({ queryKey: queryKeys.housing.all });
}
