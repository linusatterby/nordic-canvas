import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { resetDemo, resetDemoForUser, listMyDemoOrgs } from "@/lib/api/demo";
import { useDefaultOrgId } from "./useOrgs";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to check if user is in demo mode
 * Now uses AuthContext which checks profile.is_demo, demo orgs, and email
 */
export function useDemoMode() {
  const { isDemoMode, loading, profileLoading } = useAuth();
  
  // Also fetch demo org IDs for reset functionality
  const { data: demoOrgIds = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["demoOrgs"],
    queryFn: async () => {
      const { demoOrgIds, error } = await listMyDemoOrgs();
      if (error) throw error;
      return demoOrgIds;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    isDemoMode,
    demoOrgIds,
    isLoading: loading || profileLoading || orgsLoading,
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
      // Invalidate all relevant queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["orgMatches"] });
      queryClient.invalidateQueries({ queryKey: ["scheduler"] });
      queryClient.invalidateQueries({ queryKey: ["orgBorrowRequests"] });
      queryClient.invalidateQueries({ queryKey: ["talentBorrowOffers"] });
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      queryClient.invalidateQueries({ queryKey: ["thread"] });
      queryClient.invalidateQueries({ queryKey: ["orgJobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "unswiped"] });
      // Also invalidate talent feed for employer swipe view
      queryClient.invalidateQueries({ queryKey: ["talentFeed"] });
    },
  });
}
