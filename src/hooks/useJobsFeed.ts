import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  listUnswipedJobs, 
  getJob, 
  listOrgJobs, 
  resetTalentDemoSwipes, 
  listDemoJobsHard, 
  listListings,
  listOrgListings,
  type JobWithOrg, 
  type JobFilters, 
  type JobFetchResult,
  type ListingFilters,
  type ListingStatus,
} from "@/lib/api/jobs";
import { useDemoMode } from "@/hooks/useDemo";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook to fetch unswiped published jobs for talent with filters
 */
export function useJobsFeed(filters?: JobFilters) {
  const { isDemoMode } = useDemoMode();
  
  return useQuery({
    queryKey: queryKeys.jobs.unswiped(filters, isDemoMode),
    queryFn: async () => {
      const { jobs, error } = await listUnswipedJobs(filters, isDemoMode);
      if (error) throw error;
      return jobs;
    },
    staleTime: 1000 * 120,
    refetchOnMount: false,
  });
}

/**
 * Hook to fetch a single job with detailed error info
 */
export function useJob(jobId: string | undefined) {
  return useQuery<JobFetchResult | null>({
    queryKey: queryKeys.jobs.detail(jobId),
    queryFn: async () => {
      if (!jobId) return null;
      return await getJob(jobId);
    },
    enabled: !!jobId,
  });
}

/**
 * Hook to fetch jobs for an org
 */
export function useOrgJobs(orgId: string | undefined, statusFilter?: ListingStatus) {
  return useQuery({
    queryKey: queryKeys.jobs.org(orgId, statusFilter),
    queryFn: async () => {
      if (!orgId) return [];
      const { listings, error } = await listOrgListings(orgId, { status: statusFilter });
      if (error) throw error;
      return listings;
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
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.unswiped() });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.demoHard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.all });
      queryClient.refetchQueries({ queryKey: queryKeys.jobs.unswiped() });
    },
  });
}

/**
 * Hook for hard demo job fetch - bypasses all filtering
 */
export function useDemoJobsHard(enabled: boolean = false) {
  return useQuery({
    queryKey: queryKeys.jobs.demoHard(),
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
    staleTime: 1000 * 30,
  });
}

// Re-export types for convenience
export type { ListingFilters, ListingStatus };
