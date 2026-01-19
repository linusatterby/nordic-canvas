import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUnswipedJobs, getJob, listOrgJobs, resetTalentDemoSwipes, listDemoJobsHard, type JobWithOrg, type JobFilters } from "@/lib/api/jobs";
import { useDemoMode } from "@/hooks/useDemo";

/**
 * Hook to fetch unswiped published jobs for talent with filters
 * In demo mode, always shows demo jobs even if all have been swiped
 */
export function useJobsFeed(filters?: JobFilters) {
  const { isDemoMode } = useDemoMode();
  
  return useQuery({
    queryKey: ["jobs", "unswiped", filters, isDemoMode],
    queryFn: async () => {
      const { jobs, error } = await listUnswipedJobs(filters, isDemoMode);
      if (error) throw error;
      return jobs;
    },
    staleTime: 1000 * 120, // 2 minutes - swipe feed
    refetchOnMount: false, // Don't refetch if data exists
  });
}

/**
 * Hook to fetch a single job
 */
export function useJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { job, error } = await getJob(jobId);
      if (error) throw error;
      return job;
    },
    enabled: !!jobId,
  });
}

/**
 * Hook to fetch jobs for an org
 */
export function useOrgJobs(orgId: string | undefined) {
  return useQuery({
    queryKey: ["jobs", "org", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { jobs, error } = await listOrgJobs(orgId);
      if (error) throw error;
      return jobs;
    },
    enabled: !!orgId,
  });
}

/**
 * Hook to reset talent's demo job swipes
 */
export function useResetTalentDemoSwipes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { success, error } = await resetTalentDemoSwipes();
      if (error) throw error;
      if (!success) throw new Error("Failed to reset demo swipes");
      return success;
    },
    onSuccess: () => {
      // Invalidate all job feed queries (partial match on key prefix)
      queryClient.invalidateQueries({ queryKey: ["jobs", "unswiped"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "demo-hard"] });
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ["jobs", "unswiped"] });
    },
  });
}

/**
 * Hook for hard demo job fetch - bypasses all filtering
 * Used as fallback when normal feed returns 0 jobs in demo mode
 */
export function useDemoJobsHard(enabled: boolean = false) {
  return useQuery({
    queryKey: ["jobs", "demo-hard"],
    queryFn: async () => {
      console.log("[useDemoJobsHard] Fetching hard demo jobs...");
      const { jobs, error } = await listDemoJobsHard(6);
      if (error) {
        console.error("[useDemoJobsHard] Error:", error);
        throw error;
      }
      console.log("[useDemoJobsHard] Got jobs:", jobs.length);
      return jobs;
    },
    enabled,
    staleTime: 1000 * 30, // 30 seconds
  });
}
