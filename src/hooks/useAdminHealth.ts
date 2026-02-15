import { useQuery } from "@tanstack/react-query";
import { runHealthChecks, logAdminAudit, type HealthCheck } from "@/lib/api/adminHealth";
import { queryKeys } from "@/lib/queryKeys";

export type { HealthCheck } from "@/lib/api/adminHealth";
export { logAdminAudit } from "@/lib/api/adminHealth";

/**
 * Hook to run all admin health checks
 */
export function useAdminHealth(auditEnabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.healthchecks(),
    queryFn: async (): Promise<HealthCheck[]> => {
      const checks = await runHealthChecks();

      // Log audit event if enabled
      if (auditEnabled) {
        const summary = {
          pass: checks.filter((c) => c.status === "pass").length,
          warn: checks.filter((c) => c.status === "warn").length,
          fail: checks.filter((c) => c.status === "fail").length,
        };
        await logAdminAudit("health_check_run", { resultsSummary: summary });
      }

      return checks;
    },
    staleTime: 0, // Always refetch
    refetchOnWindowFocus: false,
  });
}
