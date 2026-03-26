/**
 * React Query hooks for onboarding.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  listOnboardingForOrg,
  listOnboardingForUser,
  listProgressForUser,
  createOnboardingItem,
  markOnboardingComplete,
  type CreateOnboardingPayload,
} from "@/lib/api/onboarding";

export function useOnboardingItems(orgId?: string) {
  return useQuery({
    queryKey: queryKeys.onboarding.items(orgId),
    queryFn: () => listOnboardingForOrg(orgId!),
    enabled: !!orgId,
  });
}

export function useOnboardingForUser(orgId?: string) {
  return useQuery({
    queryKey: queryKeys.onboarding.userItems(orgId),
    queryFn: () => listOnboardingForUser(orgId!),
    enabled: !!orgId,
  });
}

export function useOnboardingProgress(orgId?: string) {
  return useQuery({
    queryKey: queryKeys.onboarding.progress(orgId),
    queryFn: () => listProgressForUser(orgId!),
    enabled: !!orgId,
  });
}

export function useCreateOnboardingItem(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOnboardingPayload) => createOnboardingItem(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.onboarding.items(orgId) });
    },
  });
}

export function useCompleteOnboarding(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => markOnboardingComplete(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.onboarding.progress(orgId) });
    },
  });
}
