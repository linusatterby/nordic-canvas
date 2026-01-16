import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listMyOrgs, getDefaultOrgId, createOrg, type OrgWithRole } from "@/lib/api/orgs";

/**
 * Hook to fetch user's orgs
 */
export function useMyOrgs() {
  return useQuery({
    queryKey: ["myOrgs"],
    queryFn: async () => {
      const { orgs, error } = await listMyOrgs();
      if (error) throw error;
      return orgs;
    },
  });
}

/**
 * Hook to get default org ID
 */
export function useDefaultOrgId() {
  return useQuery({
    queryKey: ["defaultOrgId"],
    queryFn: async () => {
      const { orgId, error } = await getDefaultOrgId();
      if (error) throw error;
      return orgId;
    },
  });
}

/**
 * Hook to create an org
 */
export function useCreateOrg() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { name: string; location?: string }) => {
      const { org, error } = await createOrg(params);
      if (error) throw error;
      return org;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myOrgs"] });
      queryClient.invalidateQueries({ queryKey: ["defaultOrgId"] });
    },
  });
}
