import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  listOrgBookings, 
  listBusyBlocksForTalentIds, 
  createBooking,
  type ShiftBookingWithTalent,
  type BusyBlock 
} from "@/lib/api/scheduler";
import { useDemoMode } from "@/hooks/useDemo";
import { useDemoBookings, useDemoReleaseOffers, type DemoBookingWithTalent, type DemoReleaseOfferDTO } from "@/hooks/useDemoScheduler";

// Effective booking type (union of real and demo)
export interface EffectiveBooking {
  id: string;
  org_id: string;
  talent_user_id: string | null;
  demo_card_id?: string | null;
  start_ts: string;
  end_ts: string;
  is_released: boolean;
  created_at: string;
  talent_name: string | null;
  is_demo: boolean;
}

export interface EffectiveReleaseOffer {
  id: string;
  from_org_id: string;
  booking_id?: string | null;
  demo_booking_id?: string | null;
  taken_by_org_id: string | null;
  status: string;
  created_at: string;
  booking_start_ts: string | null;
  booking_end_ts: string | null;
  talent_name: string | null;
  is_demo: boolean;
}

interface SchedulerData {
  bookings: EffectiveBooking[];
  busyBlocks: BusyBlock[];
  releaseOffers: EffectiveReleaseOffer[];
}

function toEffectiveBooking(b: ShiftBookingWithTalent): EffectiveBooking {
  return {
    id: b.id,
    org_id: b.org_id,
    talent_user_id: b.talent_user_id,
    start_ts: b.start_ts,
    end_ts: b.end_ts,
    is_released: b.is_released,
    created_at: b.created_at,
    talent_name: b.talent_name,
    is_demo: false,
  };
}

function demoToEffectiveBooking(b: DemoBookingWithTalent): EffectiveBooking {
  return {
    id: b.id,
    org_id: b.org_id,
    talent_user_id: b.talent_user_id,
    demo_card_id: b.demo_card_id,
    start_ts: b.start_ts,
    end_ts: b.end_ts,
    is_released: b.is_released,
    created_at: b.created_at,
    talent_name: b.talent_name,
    is_demo: true,
  };
}

function demoToEffectiveReleaseOffer(o: DemoReleaseOfferDTO): EffectiveReleaseOffer {
  return {
    id: o.id,
    from_org_id: o.from_org_id,
    demo_booking_id: o.demo_booking_id,
    taken_by_org_id: o.taken_by_org_id,
    status: o.status,
    created_at: o.created_at,
    booking_start_ts: o.booking_start_ts,
    booking_end_ts: o.booking_end_ts,
    talent_name: o.talent_name,
    is_demo: true,
  };
}

/**
 * Hook to fetch scheduler data for an org with realtime updates
 * In demo mode: returns demo bookings if no real bookings exist
 */
export function useScheduler(
  orgId: string | undefined,
  range: { start: string; end: string },
  matchedTalentIds: string[]
) {
  const queryClient = useQueryClient();
  const { isDemoMode } = useDemoMode();
  
  // Fetch real bookings
  const realQuery = useQuery({
    queryKey: ["scheduler", "bookings", orgId, range.start, range.end],
    queryFn: async () => {
      if (!orgId) return { bookings: [], busyBlocks: [] };

      const [bookingsResult, busyResult] = await Promise.all([
        listOrgBookings(orgId, range),
        listBusyBlocksForTalentIds(matchedTalentIds, range),
      ]);

      if (bookingsResult.error) throw bookingsResult.error;
      if (busyResult.error) throw busyResult.error;

      return {
        bookings: bookingsResult.bookings,
        busyBlocks: busyResult.blocks,
      };
    },
    enabled: !!orgId,
    staleTime: 1000 * 60,
    refetchOnMount: true,
  });

  // Fetch demo bookings (only in demo mode)
  const demoBookingsQuery = useDemoBookings(orgId, range, isDemoMode);
  const demoReleaseOffersQuery = useDemoReleaseOffers(orgId, range, isDemoMode);

  // Subscribe to realtime updates for shift_bookings
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`shift_bookings:${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shift_bookings",
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["scheduler", "bookings", orgId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  // Compute effective data
  const realBookings = realQuery.data?.bookings ?? [];
  const demoBookings = demoBookingsQuery.data ?? [];
  const demoReleaseOffers = demoReleaseOffersQuery.data ?? [];

  // Use real bookings if available, otherwise use demo bookings in demo mode
  const effectiveBookings: EffectiveBooking[] = realBookings.length > 0
    ? realBookings.map(toEffectiveBooking)
    : isDemoMode
      ? demoBookings.map(demoToEffectiveBooking)
      : [];

  // For release offers, merge real (if any) with demo in demo mode
  const effectiveReleaseOffers: EffectiveReleaseOffer[] = isDemoMode
    ? demoReleaseOffers.map(demoToEffectiveReleaseOffer)
    : [];

  const data: SchedulerData = {
    bookings: effectiveBookings,
    busyBlocks: realQuery.data?.busyBlocks ?? [],
    releaseOffers: effectiveReleaseOffers,
  };

  return {
    data,
    isLoading: realQuery.isLoading || (isDemoMode && (demoBookingsQuery.isLoading || demoReleaseOffersQuery.isLoading)),
    error: realQuery.error || demoBookingsQuery.error || demoReleaseOffersQuery.error,
    debug: {
      realBookingsCount: realBookings.length,
      demoBookingsCount: demoBookings.length,
      demoReleaseOffersCount: demoReleaseOffers.length,
      isDemoMode,
      usingDemo: realBookings.length === 0 && demoBookings.length > 0,
    },
  };
}

/**
 * Hook to create a shift booking
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      orgId: string;
      talentUserId: string;
      startTs: string;
      endTs: string;
    }) => {
      const { booking, error } = await createBooking(params);
      if (error) throw error;
      return booking;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["scheduler", "bookings", variables.orgId] 
      });
    },
  });
}
