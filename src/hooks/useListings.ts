import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  listListings, 
  updateListingStatus,
  type ListingFilters, 
  type ListingWithOrg,
  type ListingStatus,
} from "@/lib/api/jobs";
import { useDemoMode } from "@/hooks/useDemo";

/**
 * Stable hash for filter object to use as query key
 */
function hashFilters(filters: ListingFilters | undefined): string {
  if (!filters) return "default";
  return JSON.stringify(filters, Object.keys(filters).sort());
}

/**
 * Unified hook for fetching listings with filters
 * Supports all listing types (job, shift_cover, housing) and status pipeline
 */
export function useListings(filters?: ListingFilters & { enabled?: boolean }) {
  const { isDemoMode } = useDemoMode();
  const { enabled = true, ...filterParams } = filters ?? {};
  
  return useQuery({
    queryKey: ["listings", hashFilters(filterParams), isDemoMode],
    queryFn: async () => {
      const { listings, error } = await listListings(filterParams, isDemoMode);
      if (error) throw error;
      return listings;
    },
    enabled,
    staleTime: 1000 * 120, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for updating listing status (pipeline transitions)
 */
export function useUpdateListingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, status }: { listingId: string; status: ListingStatus }) => {
      const { success, error } = await updateListingStatus(listingId, status);
      if (error) throw error;
      if (!success) throw new Error("Failed to update status");
      return { listingId, status };
    },
    onSuccess: () => {
      // Invalidate all listing queries
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

/**
 * Hook for employer org listings with status filter
 */
export function useOrgListings(orgId: string | undefined, statusFilter?: ListingStatus) {
  const filters: ListingFilters = {
    orgId,
    status: statusFilter ? [statusFilter] : undefined,
  };

  return useListings({
    ...filters,
    enabled: !!orgId,
  });
}

export type { ListingFilters, ListingWithOrg, ListingStatus };
