import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  fetchMyCredentials,
  addCredential,
  deleteCredential,
  type CredentialInsert,
} from "@/lib/api/credentials";

export function useCredentials() {
  return useQuery({
    queryKey: queryKeys.credentials.mine(),
    queryFn: fetchMyCredentials,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CredentialInsert) => addCredential(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.credentials.all }),
  });
}

export function useDeleteCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCredential(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.credentials.all }),
  });
}
