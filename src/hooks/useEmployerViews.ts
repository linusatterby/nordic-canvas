/**
 * Hooks for the separated employer views:
 *   useEmployerApplications(orgId) – submitted applications only
 *   useCandidatePool(filters)      – opt-in visible candidates
 *   useSendOutreach()              – mutation: send förfrågan
 *   useReceivedOutreach()          – outreach received by candidate
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  listEmployerApplications,
  listCandidatePool,
  sendOutreach,
  listReceivedOutreach,
  listOrgOutreach,
} from "@/lib/api/employerViews";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useEmployerApplications(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.employer.applications(orgId),
    queryFn: async () => {
      const { applications, error } = await listEmployerApplications(orgId!);
      if (error) throw error;
      return applications;
    },
    enabled: !!orgId,
  });
}

export function useCandidatePool(filters?: { location?: string; role?: string }) {
  return useQuery({
    queryKey: queryKeys.employer.pool(filters?.location, filters?.role),
    queryFn: async () => {
      const { candidates, error } = await listCandidatePool(filters);
      if (error) throw error;
      return candidates;
    },
  });
}

export function useReceivedOutreach() {
  return useQuery({
    queryKey: queryKeys.employer.outreachReceived(),
    queryFn: async () => {
      const { outreach, error } = await listReceivedOutreach();
      if (error) throw error;
      return outreach;
    },
  });
}

export function useOrgOutreach(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.employer.outreachSent(orgId),
    queryFn: async () => {
      const { outreach, error } = await listOrgOutreach(orgId!);
      if (error) throw error;
      return outreach;
    },
    enabled: !!orgId,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useSendOutreach() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      orgId: string;
      talentUserId: string;
      message?: string;
      roleTitle?: string;
      location?: string;
    }) => {
      const { id, error } = await sendOutreach(params);
      if (error) throw error;
      return id;
    },
    onSettled: (_d, _e, params) => {
      qc.invalidateQueries({ queryKey: queryKeys.employer.outreachSent(params.orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.employer.pool() });
    },
  });
}
