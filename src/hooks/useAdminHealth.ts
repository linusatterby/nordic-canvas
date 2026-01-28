import { useQuery } from "@tanstack/react-query";
import { runHealthChecks, type HealthCheck } from "@/lib/api/adminHealth";

/**
 * Hook to run all admin health checks
 */
export function useAdminHealth(auditEnabled: boolean) {
  return useQuery<HealthCheck[]>({
    queryKey: ["admin", "healthchecks"],
    queryFn: () => runHealthChecks(auditEnabled),
    staleTime: 0, // Always refetch
    refetchOnWindowFocus: false,
  });
}

export type { HealthCheck };
