import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { resetDemo, resetDemoForUser, listMyDemoOrgs, seedDemoScenario } from "@/lib/api/demo";
import { useDefaultOrgId } from "./useOrgs";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to check if user is in demo mode
 * Now uses AuthContext which checks profile.is_demo, demo orgs, and email
 */
export function useDemoMode() {
  const { isDemoMode, loading, profileLoading } = useAuth();
  
  // Lazy-load demo org IDs only when actually in demo mode
  // This prevents unnecessary DB calls during initial load
  const { data: demoOrgIds = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["demoOrgs"],
    queryFn: async () => {
      const { demoOrgIds, error } = await listMyDemoOrgs();
      if (error) throw error;
      return demoOrgIds;
    },
    enabled: isDemoMode, // Only fetch when in demo mode
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    isDemoMode,
    demoOrgIds,
    isLoading: loading || profileLoading || (isDemoMode && orgsLoading),
  };
}

/**
 * Hook to reset demo data
 * Chooses strategy based on whether user has an org (employer) or not (talent)
 */
export function useResetDemo() {
  const queryClient = useQueryClient();
  const { data: defaultOrgId } = useDefaultOrgId();
  const { demoOrgIds } = useDemoMode();

  return useMutation({
    mutationFn: async (orgId: string | undefined) => {
      // Priority: passed orgId > first demo org > default org
      const targetOrgId = orgId ?? demoOrgIds[0] ?? defaultOrgId;
      
      // If we have an org ID, use org-based reset (employer)
      if (targetOrgId) {
        const { result, error } = await resetDemo(targetOrgId);
        if (error) throw error;
        if (!result?.success) {
          throw new Error(result?.error ?? "Failed to reset demo");
        }
        return result;
      }
      
      // No org ID - use user-based reset (talent)
      const { result, error } = await resetDemoForUser();
      if (error) throw error;
      if (!result?.success) {
        throw new Error(result?.error ?? "Failed to reset demo");
      }
      return result;
    },
    onSuccess: () => {
      invalidateDemoQueries(queryClient);
    },
  });
}

/**
 * Hook to seed a complete demo scenario
 * Creates jobs, borrow request/offer, match, chat, booking, and release offer
 */
export function useSeedDemoScenario() {
  const queryClient = useQueryClient();
  const { data: defaultOrgId } = useDefaultOrgId();
  const { demoOrgIds } = useDemoMode();

  return useMutation({
    mutationFn: async (orgId?: string) => {
      // Priority: passed orgId > first demo org > default org
      const targetOrgId = orgId ?? demoOrgIds[0] ?? defaultOrgId;
      
      if (!targetOrgId) {
        throw new Error("No demo org found");
      }
      
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
  queryClient.invalidateQueries({ queryKey: ["matches"] });
  queryClient.invalidateQueries({ queryKey: ["orgMatches"] });
  queryClient.invalidateQueries({ queryKey: ["scheduler"] });
  queryClient.invalidateQueries({ queryKey: ["orgBorrowRequests"] });
  queryClient.invalidateQueries({ queryKey: ["talentBorrowOffers"] });
  queryClient.invalidateQueries({ queryKey: ["chat"] });
  queryClient.invalidateQueries({ queryKey: ["thread"] });
  queryClient.invalidateQueries({ queryKey: ["orgJobs"] });
  queryClient.invalidateQueries({ queryKey: ["jobs", "unswiped"] });
  queryClient.invalidateQueries({ queryKey: ["talentFeed"] });
  queryClient.invalidateQueries({ queryKey: ["visibilitySummary"] });
  queryClient.invalidateQueries({ queryKey: ["talentDashboardSummary"] });
  // Demo-specific queries
  queryClient.invalidateQueries({ queryKey: ["demoMatches"] });
  queryClient.invalidateQueries({ queryKey: ["demoChatThreads"] });
  queryClient.invalidateQueries({ queryKey: ["demoBookings"] });
  queryClient.invalidateQueries({ queryKey: ["demoReleaseOffers"] });
}
