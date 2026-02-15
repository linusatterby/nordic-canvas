import { useQuery } from "@tanstack/react-query";
import {
  listDemoBookings,
  listDemoReleaseOffers,
  type DemoBookingWithTalent,
  type DemoReleaseOfferDTO,
} from "@/lib/api/demoScheduler";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook to fetch demo shift bookings for an org
 */
export function useDemoBookings(
  orgId: string | undefined,
  range: { start: string; end: string },
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.demo.bookings(orgId, range.start, range.end),
    queryFn: async () => {
      if (!orgId) return [];
      const { bookings, error } = await listDemoBookings(orgId, range);
      if (error) throw error;
      return bookings;
    },
    enabled: enabled && !!orgId,
    staleTime: 1000 * 60,
  });
}

/**
 * Hook to fetch demo release offers for an org
 */
export function useDemoReleaseOffers(
  orgId: string | undefined,
  range: { start: string; end: string },
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.demo.releaseOffers(orgId, range.start, range.end),
    queryFn: async () => {
      if (!orgId) return [];
      const { offers, error } = await listDemoReleaseOffers(orgId, range);
      if (error) throw error;
      return offers;
    },
    enabled: enabled && !!orgId,
    staleTime: 1000 * 60,
  });
}

export type { DemoBookingWithTalent, DemoReleaseOfferDTO };
