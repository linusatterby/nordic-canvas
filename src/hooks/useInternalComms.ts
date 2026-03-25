/**
 * React Query hooks for internal communications.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  listGroupsForOrg,
  createGroup,
  listMessagesForOrg,
  listMessagesForUser,
  createMessage,
  assignUserToGroup,
  removeUserFromGroup,
  listGroupMembers,
  type CreateMessagePayload,
  type InternalGroupMember,
} from "@/lib/api/internalComms";

// ── Groups ─────────────────────────────────────────────────────
export function useGroups(orgId?: string) {
  return useQuery({
    queryKey: queryKeys.internalComms.groups(orgId),
    queryFn: () => listGroupsForOrg(orgId!),
    enabled: !!orgId,
  });
}

export function useGroupMembers(groupId?: string) {
  return useQuery({
    queryKey: queryKeys.internalComms.groupMembers(groupId),
    queryFn: () => listGroupMembers(groupId!),
    enabled: !!groupId,
  });
}

export function useCreateGroup(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createGroup(orgId!, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.internalComms.groups(orgId) });
    },
  });
}

export function useAssignUserToGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      assignUserToGroup(groupId, userId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.internalComms.groupMembers(vars.groupId) });
    },
  });
}

export function useRemoveUserFromGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      removeUserFromGroup(groupId, userId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.internalComms.groupMembers(vars.groupId) });
    },
  });
}

// ── Messages ───────────────────────────────────────────────────
export function useInternalMessages(orgId?: string) {
  return useQuery({
    queryKey: queryKeys.internalComms.messages(orgId),
    queryFn: () => listMessagesForOrg(orgId!),
    enabled: !!orgId,
  });
}

export function useInternalMessagesForUser(orgId?: string) {
  return useQuery({
    queryKey: queryKeys.internalComms.userMessages(orgId),
    queryFn: () => listMessagesForUser(orgId!),
    enabled: !!orgId,
  });
}

export function useCreateMessage(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMessagePayload) => createMessage(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.internalComms.messages(orgId) });
    },
  });
}
