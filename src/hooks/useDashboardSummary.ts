import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getTalentDashboardSummary, type TalentDashboardSummary } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Lightweight hook for talent dashboard summary - single aggregated query
 */
export function useTalentDashboardSummary() {
  const { session, profile } = useAuth();

  return useQuery({
    queryKey: queryKeys.dashboard.talentSummary(),
    queryFn: async () => {
      const { summary, error } = await getTalentDashboardSummary();
      if (error) throw error;
      return summary;
    },
    enabled: !!session && !!profile,
    staleTime: 1000 * 300, // 5 minutes - stable summary data
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export type { TalentDashboardSummary };
