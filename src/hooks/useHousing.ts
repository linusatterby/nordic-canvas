import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listHousingListings,
  createHousingInquiry,
  listHostHousingThreads,
  listTalentHousingThreads,
  checkVerifiedTenant,
  listMyHostHousing,
  createHostHousingListing,
  updateHousingListingStatus,
  type HousingFilters,
  type HousingListing,
  type HousingThread,
  type CreateHousingPayload,
} from "@/lib/api/housing";
import { useDemoMode } from "@/hooks/useDemo";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook for fetching housing listings with filters
 */
export function useHousingListings(filters?: HousingFilters) {
  const { isDemoMode } = useDemoMode();

  return useQuery({
    queryKey: queryKeys.housing.listings(filters, isDemoMode),
    queryFn: async () => {
      const { listings, error } = await listHousingListings(filters, isDemoMode);
      if (error) throw error;
      return listings;
    },
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook for checking verified tenant status
 */
export function useVerifiedTenant() {
  return useQuery({
    queryKey: queryKeys.housing.verifiedTenant(),
    queryFn: checkVerifiedTenant,
    staleTime: 1000 * 60 * 5,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Hook for host housing threads
 */
export function useHostHousingThreads() {
  return useQuery({
    queryKey: queryKeys.housing.threads("host"),
    queryFn: async () => {
      const { threads, error } = await listHostHousingThreads();
      if (error) throw error;
      return threads;
    },
    staleTime: 1000 * 30,
  });
}

/**
 * Hook for talent housing threads
 */
export function useTalentHousingThreads() {
  return useQuery({
    queryKey: queryKeys.housing.threads("talent"),
    queryFn: async () => {
      const { threads, error } = await listTalentHousingThreads();
      if (error) throw error;
      return threads;
    },
    staleTime: 1000 * 30,
  });
}

/**
 * Hook for host's own housing listings
 */
export function useMyHostHousing() {
  return useQuery({
    queryKey: queryKeys.housing.myListings(),
    queryFn: async () => {
      const { listings, error } = await listMyHostHousing();
      if (error) throw error;
      return listings;
    },
    staleTime: 1000 * 60,
  });
}

/**
 * Hook for creating a housing listing
 */
export function useCreateHousingListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateHousingPayload) => {
      const { listing, error } = await createHostHousingListing(payload);
      if (error) throw error;
      return listing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.housing.myListings() });
    },
  });
}

/**
 * Hook for updating housing listing status
 */
export function useUpdateHousingListingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "published" | "closed" }) => {
      const { error } = await updateHousingListingStatus(id, status);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.housing.myListings() });
      queryClient.invalidateQueries({ queryKey: ["housing", "listings"] });
    },
  });
}

export type { HousingFilters, HousingListing, HousingThread, CreateHousingPayload };
