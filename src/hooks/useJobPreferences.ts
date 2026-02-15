import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  fetchMyJobPreferences,
  upsertJobPreferences,
  type JobPreferencesUpdate,
} from "@/lib/api/talent/jobPreferences";

export function useJobPreferences() {
  return useQuery({
    queryKey: queryKeys.jobPreferences.mine(),
    queryFn: fetchMyJobPreferences,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveJobPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: JobPreferencesUpdate) => upsertJobPreferences(prefs),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.jobPreferences.all }),
  });
}
