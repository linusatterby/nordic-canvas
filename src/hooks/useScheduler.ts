import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
 * Hook to fetch scheduler data for an org
 */
export function useScheduler(
  orgId: string | undefined,
  range: { start: string; end: string },
  matchedTalentIds: string[]
) {
  return useQuery({
    queryKey: ["scheduler", orgId, range.start, range.end, matchedTalentIds],
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
  });
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
        queryKey: ["scheduler", variables.orgId] 
      });
    },
  });
}
