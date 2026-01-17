import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createBorrowRequest,
  computeAndCreateOffers,
  listOrgBorrowRequests,
  listTalentBorrowOffers,
  acceptBorrowOffer,
  declineBorrowOffer,
  closeBorrowRequest,
} from "@/lib/api/borrow";

/**
 * Hook for employer to manage borrow requests
 */
export function useOrgBorrowRequests(orgId: string | undefined) {
  return useQuery({
    queryKey: ["borrow", "requests", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { requests, error } = await listOrgBorrowRequests(orgId);
      if (error) throw error;
      return requests;
    },
    enabled: !!orgId,
  });
}

/**
 * Hook for talent to view pending borrow offers
 */
export function useTalentBorrowOffers() {
  return useQuery({
    queryKey: ["borrow", "offers", "talent"],
    queryFn: async () => {
      const { offers, error } = await listTalentBorrowOffers();
      if (error) throw error;
      return offers;
    },
  });
}

/**
 * Mutation to create a borrow request with scope and circle support
 */
export function useCreateBorrowRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      payload,
    }: {
      orgId: string;
      payload: {
        location: string;
        role_key: string;
        start_ts: string;
        end_ts: string;
        message?: string;
        scope?: "internal" | "circle" | "local";
        circle_id?: string | null;
      };
    }) => {
      // Create the request with scope
      const { request, error } = await createBorrowRequest(orgId, payload);
      if (error || !request) throw error || new Error("Failed to create request");

      // Compute and create offers (uses scope from request)
      const { count, error: offerError } = await computeAndCreateOffers({
        ...request,
        scope: payload.scope,
        circle_id: payload.circle_id,
      });
      if (offerError) {
        console.warn("Failed to create offers:", offerError);
      }

      return { request, offerCount: count };
    },
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: ["borrow", "requests", orgId] });
    },
  });
}

/**
 * Mutation for talent to accept an offer
 */
export function useAcceptBorrowOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offerId: string) => {
      const result = await acceptBorrowOffer(offerId);
      if (!result.success) {
        throw new Error(result.error || "Failed to accept offer");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["borrow", "offers", "talent"] });
      queryClient.invalidateQueries({ queryKey: ["scheduler"] });
    },
  });
}

/**
 * Mutation for talent to decline an offer
 */
export function useDeclineBorrowOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offerId: string) => {
      const { success, error } = await declineBorrowOffer(offerId);
      if (!success) throw error || new Error("Failed to decline offer");
      return { success };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["borrow", "offers", "talent"] });
    },
  });
}

/**
 * Mutation to close a borrow request
 */
export function useCloseBorrowRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, orgId }: { requestId: string; orgId: string }) => {
      const { success, error } = await closeBorrowRequest(requestId);
      if (!success) throw error || new Error("Failed to close request");
      return { success };
    },
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: ["borrow", "requests", orgId] });
    },
  });
}
