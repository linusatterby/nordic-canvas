import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listHousingListings,
  createHousingInquiry,
  listHostHousingThreads,
  listTalentHousingThreads,
  checkVerifiedTenant,
  type HousingFilters,
  type HousingListing,
  type HousingThread,
} from "@/lib/api/housing";
import { useDemoMode } from "@/hooks/useDemo";

/**
 * Hook for fetching housing listings with filters
 */
export function useHousingListings(filters?: HousingFilters) {
  const { isDemoMode } = useDemoMode();

  return useQuery({
    queryKey: ["housing", "listings", filters, isDemoMode],
    queryFn: async () => {
      const { listings, error } = await listHousingListings(filters, isDemoMode);
      if (error) throw error;
      return listings;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook for checking verified tenant status
 */
export function useVerifiedTenant() {
  return useQuery({
    queryKey: ["verified-tenant"],
    queryFn: checkVerifiedTenant,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for creating housing inquiry
 */
export function useCreateHousingInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listingId: string) => {
      const result = await createHousingInquiry(listingId);
      if (!result.success) {
        throw new Error(result.reason || "Failed to create inquiry");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housing", "threads"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/**
 * Hook for host housing threads
 */
export function useHostHousingThreads() {
  return useQuery({
    queryKey: ["housing", "threads", "host"],
    queryFn: async () => {
      const { threads, error } = await listHostHousingThreads();
      if (error) throw error;
      return threads;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook for talent housing threads
 */
export function useTalentHousingThreads() {
  return useQuery({
    queryKey: ["housing", "threads", "talent"],
    queryFn: async () => {
      const { threads, error } = await listTalentHousingThreads();
      if (error) throw error;
      return threads;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

export type { HousingFilters, HousingListing, HousingThread };
