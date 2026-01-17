import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUnswipedJobs, getJob, listOrgJobs, resetTalentDemoSwipes, type JobWithOrg, type JobFilters } from "@/lib/api/jobs";
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
    staleTime: 1000 * 60, // 1 minute
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
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ["jobs", "unswiped"] });
    },
  });
}
