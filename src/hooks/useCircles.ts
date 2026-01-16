import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCircleRequests,
  createCircleRequest,
  acceptCircleRequest,
  declineCircleRequest,
  listTrustedCircle,
  listCirclePartners,
  getMyVisibility,
  updateMyVisibility,
  createReleaseOffer,
  listCircleReleaseOffers,
  takeReleaseOffer,
  cancelReleaseOffer,
  findAvailableTalentsScoped,
  getAvailableTalentCounts,
  type TalentVisibilityScope,
  type BorrowScope,
  type CirclePartner,
} from "@/lib/api/circles";

// ============================================
// Circle Requests
// ============================================

export function useCircleRequests(orgId: string | undefined) {
  return useQuery({
    queryKey: ["circleRequests", orgId],
    queryFn: async () => {
      if (!orgId) return { incoming: [], outgoing: [] };
      const { incoming, outgoing, error } = await listCircleRequests(orgId);
      if (error) throw error;
      return { incoming, outgoing };
    },
    enabled: !!orgId,
  });
}

export function useCreateCircleRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fromOrgId, toOrgId }: { fromOrgId: string; toOrgId: string }) => {
      const { request, error } = await createCircleRequest(fromOrgId, toOrgId);
      if (error) throw error;
      return request;
    },
    onSuccess: (_, { fromOrgId }) => {
      queryClient.invalidateQueries({ queryKey: ["circleRequests", fromOrgId] });
    },
  });
}

export function useAcceptCircleRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { success, error } = await acceptCircleRequest(requestId);
      if (error) throw error;
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circleRequests"] });
      queryClient.invalidateQueries({ queryKey: ["trustedCircle"] });
    },
  });
}

export function useDeclineCircleRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { success, error } = await declineCircleRequest(requestId);
      if (error) throw error;
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circleRequests"] });
    },
  });
}

// ============================================
// Trusted Circle
// ============================================

/**
 * Hook to get circle partners with proper names (uses SECURITY DEFINER RPC)
 */
export function useCirclePartners(orgId: string | undefined) {
  return useQuery({
    queryKey: ["circlePartners", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { partners, error } = await listCirclePartners(orgId);
      if (error) throw error;
      return partners;
    },
    enabled: !!orgId,
  });
}

/**
 * @deprecated Use useCirclePartners instead - kept for backward compatibility
 */
export function useTrustedCircle(orgId: string | undefined) {
  return useQuery({
    queryKey: ["trustedCircle", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { partners, error } = await listTrustedCircle(orgId);
      if (error) throw error;
      return partners;
    },
    enabled: !!orgId,
  });
}

// ============================================
// Talent Visibility
// ============================================

export function useMyVisibility() {
  return useQuery({
    queryKey: ["myVisibility"],
    queryFn: async () => {
      const { visibility, error } = await getMyVisibility();
      if (error) throw error;
      return visibility;
    },
  });
}

export function useUpdateVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scope, extraHours }: { scope: TalentVisibilityScope; extraHours: boolean }) => {
      const { success, error } = await updateMyVisibility(scope, extraHours);
      if (error) throw error;
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myVisibility"] });
    },
  });
}

// ============================================
// Release Offers
// ============================================

export function useCreateReleaseOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, fromOrgId }: { bookingId: string; fromOrgId: string }) => {
      const { offer, error } = await createReleaseOffer(bookingId, fromOrgId);
      if (error) throw error;
      return offer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["releaseOffers"] });
      queryClient.invalidateQueries({ queryKey: ["scheduler"] });
    },
  });
}

export function useCircleReleaseOffers(orgId: string | undefined) {
  return useQuery({
    queryKey: ["releaseOffers", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { offers, error } = await listCircleReleaseOffers(orgId);
      if (error) throw error;
      return offers;
    },
    enabled: !!orgId,
  });
}

export function useTakeReleaseOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offerId: string) => {
      const { success, newBookingId, error } = await takeReleaseOffer(offerId);
      if (error) throw error;
      return { success, newBookingId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["releaseOffers"] });
      queryClient.invalidateQueries({ queryKey: ["scheduler"] });
    },
  });
}

export function useCancelReleaseOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offerId: string) => {
      const { success, error } = await cancelReleaseOffer(offerId);
      if (error) throw error;
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["releaseOffers"] });
      queryClient.invalidateQueries({ queryKey: ["scheduler"] });
    },
  });
}

// ============================================
// Scoped Talent Search
// ============================================

export function useAvailableTalentsScoped(
  location: string,
  startTs: string,
  endTs: string,
  scope: BorrowScope,
  requesterOrgId: string | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["availableTalents", location, startTs, endTs, scope, requesterOrgId],
    queryFn: async () => {
      if (!requesterOrgId) return [];
      const { talents, error } = await findAvailableTalentsScoped(
        location,
        startTs,
        endTs,
        scope,
        requesterOrgId
      );
      if (error) throw error;
      return talents;
    },
    enabled: enabled && !!requesterOrgId && !!location,
  });
}

export function useAvailableTalentCounts(
  location: string,
  startTs: string,
  endTs: string,
  requesterOrgId: string | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["talentCounts", location, startTs, endTs, requesterOrgId],
    queryFn: async () => {
      if (!requesterOrgId) return { internal: 0, circle: 0, local: 0 };
      const result = await getAvailableTalentCounts(location, startTs, endTs, requesterOrgId);
      if (result.error) throw result.error;
      return { internal: result.internal, circle: result.circle, local: result.local };
    },
    enabled: enabled && !!requesterOrgId && !!location,
    staleTime: 1000 * 30, // 30 seconds
  });
}
