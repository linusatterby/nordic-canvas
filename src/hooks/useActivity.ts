import { useQuery } from "@tanstack/react-query";
import { listMyActivity, type ActivityFilters } from "@/lib/api/activity";
import { useMyOrgs } from "@/hooks/useOrgs";
import { useAuth } from "@/contexts/AuthContext";

const ACTIVITY_KEY = "activity";

/**
 * Hook for fetching activity feed
 */
export function useActivity(filters: Omit<ActivityFilters, "orgId"> = {}) {
  const { profile } = useAuth();
  const { data: orgs } = useMyOrgs();
  
  // Determine role and org context
  const isEmployer = profile?.type === "employer" || profile?.type === "both";
  const activeOrgId = orgs?.[0]?.id;
  const role = filters.role ?? (isEmployer ? "employer" : "talent");

  return useQuery({
    queryKey: [ACTIVITY_KEY, role, activeOrgId, filters],
    queryFn: async () => {
      const { activities, error } = await listMyActivity({
        ...filters,
        role,
        orgId: role === "employer" ? activeOrgId : undefined,
      });
      if (error) throw error;
      return activities;
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: role === "talent" || !!activeOrgId,
  });
}

/**
 * Hook for fetching talent activity
 */
export function useTalentActivity(limit = 50) {
  return useActivity({ role: "talent", limit });
}

/**
 * Hook for fetching employer activity
 */
export function useEmployerActivity(limit = 50) {
  return useActivity({ role: "employer", limit });
}
