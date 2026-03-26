import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listMyOrgs, getDefaultOrgId, createOrg, listDemoOrgs, type OrgWithRole } from "@/lib/api/orgs";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook to fetch user's orgs
 */
export function useMyOrgs() {
  return useQuery({
    queryKey: queryKeys.orgs.my(),
    queryFn: async () => {
      const { orgs, error } = await listMyOrgs();
      if (error) throw error;
      return orgs;
    },
    staleTime: 1000 * 300,
  });
}

/**
 * Hook to get default org ID
 */
export function useDefaultOrgId() {
  return useQuery({
    queryKey: queryKeys.orgs.defaultId(),
    queryFn: async () => {
      const { orgId, error } = await getDefaultOrgId();
      if (error) throw error;
      return orgId;
    },
    staleTime: 1000 * 300,
  });
}

/**
 * Hook to create an org
 */
export function useCreateOrg() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { name: string; location?: string; demoSessionId?: string | null }) => {
      const { org, error } = await createOrg(params);
      if (error) throw error;
      return org;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orgs.my() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orgs.defaultId() });
    },
  });
}

/**
 * Hook to get first demo org ID (fallback for anonymous demo sessions)
 */
export function useDemoOrgId() {
  return useQuery({
    queryKey: queryKeys.orgs.demoDefault(),
    queryFn: async () => {
      const { orgs, error } = await listDemoOrgs();
      if (error) throw error;
      // Prefer well-known seed org "Visby Strandhotell" (a1111111-...)
      const preferred = orgs.find((o) => o.id === "a1111111-1111-1111-1111-111111111111");
      return preferred?.id ?? orgs[0]?.id ?? null;
    },
    staleTime: 1000 * 300,
  });
}
