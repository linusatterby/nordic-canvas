import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  listMyShiftAvailability,
  replaceShiftAvailability,
} from "@/lib/api/talent/shiftAvailability";

export function useShiftAvailability() {
  return useQuery({
    queryKey: queryKeys.talent.shiftAvailability(),
    queryFn: listMyShiftAvailability,
    staleTime: 5 * 60 * 1000,
  });
}

export function useReplaceShiftAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ weekdays, timeblocks }: { weekdays: number[]; timeblocks: string[] }) =>
      replaceShiftAvailability(weekdays, timeblocks),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.talent.all }),
  });
}
