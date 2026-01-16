import { useQuery } from "@tanstack/react-query";
import { listUnswipedJobs, getJob, listOrgJobs, type JobWithOrg } from "@/lib/api/jobs";

/**
 * Hook to fetch unswiped published jobs for talent
 */
export function useJobsFeed() {
  return useQuery({
    queryKey: ["jobs", "unswiped"],
    queryFn: async () => {
      const { jobs, error } = await listUnswipedJobs();
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
