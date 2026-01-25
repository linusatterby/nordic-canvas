import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listTalentOffers,
  listOrgOffers,
  getOffer,
  createOfferDraft,
  sendOffer,
  respondOffer,
  withdrawOffer,
  updateOfferDraft,
  type CreateOfferPayload,
  type Offer,
  type OfferWithOrg,
} from "@/lib/api/offers";

/**
 * Hook for talent to list their received offers
 */
export function useTalentOffers() {
  return useQuery({
    queryKey: ["offers", "talent"],
    queryFn: async () => {
      const { offers, error } = await listTalentOffers();
      if (error) throw error;
      return offers;
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook for employer to list their org's offers
 */
export function useOrgOffers(orgId: string | undefined) {
  return useQuery({
    queryKey: ["offers", "org", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { offers, error } = await listOrgOffers(orgId);
      if (error) throw error;
      return offers;
    },
    enabled: !!orgId,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get a single offer
 */
export function useOffer(offerId: string | undefined) {
  return useQuery({
    queryKey: ["offers", "detail", offerId],
    queryFn: async () => {
      if (!offerId) return null;
      const { offer, error } = await getOffer(offerId);
      if (error) throw error;
      return offer;
    },
    enabled: !!offerId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to create an offer draft
 */
export function useCreateOfferDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateOfferPayload) => {
      const { offer, error } = await createOfferDraft(payload);
      if (error) throw error;
      return offer;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["offers", "org", variables.org_id] });
    },
  });
}

/**
 * Hook to update an offer draft
 */
export function useUpdateOfferDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ offerId, updates }: { offerId: string; updates: Partial<CreateOfferPayload> }) => {
      const { offer, error } = await updateOfferDraft(offerId, updates);
      if (error) throw error;
      return offer;
    },
    onSuccess: (offer) => {
      if (offer) {
        queryClient.invalidateQueries({ queryKey: ["offers", "detail", offer.id] });
        queryClient.invalidateQueries({ queryKey: ["offers", "org", offer.org_id] });
      }
    },
  });
}

/**
 * Hook to send an offer
 */
export function useSendOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offerId: string) => {
      const { success, reason, error } = await sendOffer(offerId);
      if (error) throw error;
      if (!success) throw new Error(reason || "Failed to send offer");
      return { success, offerId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/**
 * Hook to respond to an offer (accept/decline)
 */
export function useRespondOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ offerId, action }: { offerId: string; action: "accept" | "decline" }) => {
      const { success, reason, new_status, match_id, error } = await respondOffer(offerId, action);
      if (error) throw error;
      if (!success) throw new Error(reason || "Failed to respond to offer");
      return { success, offerId, new_status, match_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      
      // If accepted and has match, invalidate matches
      if (result.match_id) {
        queryClient.invalidateQueries({ queryKey: ["matches"] });
      }
    },
  });
}

/**
 * Hook to withdraw an offer
 */
export function useWithdrawOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offerId: string) => {
      const { success, reason, error } = await withdrawOffer(offerId);
      if (error) throw error;
      if (!success) throw new Error(reason || "Failed to withdraw offer");
      return { success, offerId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/**
 * Count pending offers for talent (for badge display)
 */
export function usePendingOffersCount() {
  const { data: offers } = useTalentOffers();
  
  const pendingCount = (offers ?? []).filter(
    (o) => o.status === "sent"
  ).length;
  
  return pendingCount;
}
