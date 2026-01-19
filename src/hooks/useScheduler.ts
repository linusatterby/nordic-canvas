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

interface SchedulerData {
  bookings: ShiftBookingWithTalent[];
  busyBlocks: BusyBlock[];
}

/**
 * Hook to fetch scheduler data for an org with realtime updates
 */
export function useScheduler(
  orgId: string | undefined,
  range: { start: string; end: string },
  matchedTalentIds: string[]
) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ["scheduler", "bookings", orgId, range.start, range.end],
    queryFn: async (): Promise<SchedulerData> => {
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
    staleTime: 1000 * 60, // 1 minute
    refetchOnMount: true, // Scheduler needs fresh data when viewed
  });

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
          // Invalidate to refetch on any change
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

  return query;
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
      // Invalidate scheduler queries for this org
      queryClient.invalidateQueries({ 
        queryKey: ["scheduler", "bookings", variables.orgId] 
      });
    },
  });
}
