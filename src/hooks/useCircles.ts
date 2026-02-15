import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCircleRequests,
  createCircleRequest,
  acceptCircleRequest,
  declineCircleRequest,
  listTrustedCircle,
  listCirclePartners,
  listMyCircles,
  getCircleMembers,
  createCircle,
  addCircleMember,
  removeCircleMember,
  getMyVisibility,
  updateMyVisibility,
  createReleaseOffer,
  listCircleReleaseOffers,
  takeReleaseOffer,
  cancelReleaseOffer,
  findAvailableTalentsScoped,
  getAvailableTalentCounts,
  listAllCircleMembersFlat,
  type TalentVisibilityScope,
  type BorrowScope,
  type CirclePartner,
  type CirclePartnerFlat,
} from "@/lib/api/circles";
import { queryKeys } from "@/lib/queryKeys";

// ============================================
// Circle Requests
// ============================================

export function useCircleRequests(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.circles.requests(orgId),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.circles.requests(fromOrgId) });
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

export function useAllCirclePartnersFlat(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.circles.allPartnersFlat(orgId),
    queryFn: async () => {
      if (!orgId) return [];
      const { partners, error } = await listAllCircleMembersFlat(orgId);
      if (error) throw error;
      return partners;
    },
    enabled: !!orgId,
    staleTime: 1000 * 120,
  });
}

/** @deprecated Use useAllCirclePartnersFlat instead */
export function useCirclePartners(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.circles.partners(orgId),
    queryFn: async () => {
      if (!orgId) return [];
      const { partners, error } = await listCirclePartners(orgId);
      if (error) throw error;
      return partners;
    },
    enabled: !!orgId,
  });
}

/** @deprecated Use useAllCirclePartnersFlat instead */
export function useTrustedCircle(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.circles.trusted(orgId),
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
// Multi-Circle Management
// ============================================

export function useMyCircles(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.circles.myCircles(orgId),
    queryFn: async () => {
      if (!orgId) return [];
      const { circles, error } = await listMyCircles(orgId);
      if (error) throw error;
      return circles;
    },
    enabled: !!orgId,
  });
}

export function useCircleMembers(circleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.circles.members(circleId),
    queryFn: async () => {
      if (!circleId) return [];
      const { members, error } = await getCircleMembers(circleId);
      if (error) throw error;
      return members;
    },
    enabled: !!circleId,
  });
}

export function useCreateCircle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, name }: { orgId: string; name: string }) => {
      const { circleId, error } = await createCircle(orgId, name);
      if (error) throw error;
      return circleId;
    },
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.circles.myCircles(orgId) });
    },
  });
}

export function useAddCircleMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ circleId, memberOrgId }: { circleId: string; memberOrgId: string }) => {
      const { success, error } = await addCircleMember(circleId, memberOrgId);
      if (error) throw error;
      return success;
    },
    onSuccess: (_, { circleId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.circles.members(circleId) });
      queryClient.invalidateQueries({ queryKey: ["myCircles"] });
    },
  });
}

export function useRemoveCircleMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ circleId, memberOrgId }: { circleId: string; memberOrgId: string }) => {
      const { success, error } = await removeCircleMember(circleId, memberOrgId);
      if (error) throw error;
      return success;
    },
    onSuccess: (_, { circleId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.circles.members(circleId) });
      queryClient.invalidateQueries({ queryKey: ["myCircles"] });
    },
  });
}

// ============================================
// Talent Visibility
// ============================================

export function useMyVisibility() {
  return useQuery({
    queryKey: queryKeys.circles.myVisibility(),
    queryFn: async () => {
      const { visibility, error } = await getMyVisibility();
      if (error) throw error;
      return visibility;
    },
    staleTime: 1000 * 120,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.circles.myVisibility() });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.all });
    },
  });
}

export function useCircleReleaseOffers(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.circles.releaseOffers(orgId),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.all });
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
    queryKey: queryKeys.circles.availableTalents(location, startTs, endTs, scope, requesterOrgId),
    queryFn: async () => {
      if (!requesterOrgId) return [];
      const { talents, error } = await findAvailableTalentsScoped(
        location, startTs, endTs, scope, requesterOrgId
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
  enabled: boolean = true,
  circleId?: string
) {
  return useQuery({
    queryKey: queryKeys.circles.talentCounts(location, startTs, endTs, requesterOrgId, circleId),
    queryFn: async () => {
      if (!requesterOrgId) return { internal: 0, circle: 0, local: 0 };
      const result = await getAvailableTalentCounts(location, startTs, endTs, requesterOrgId, circleId);
      if (result.error) throw result.error;
      return { internal: result.internal, circle: result.circle, local: result.local };
    },
    enabled: enabled && !!requesterOrgId && !!location,
    staleTime: 1000 * 30,
  });
}
