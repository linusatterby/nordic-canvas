import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { fetchCredentialCatalog } from "@/lib/api/talent/credentialCatalog";

export function useCredentialCatalog() {
  return useQuery({
    queryKey: queryKeys.credentialCatalog.all,
    queryFn: fetchCredentialCatalog,
    staleTime: 30 * 60 * 1000, // 30 min — rarely changes
  });
}
