/**
 * Internal communications API layer.
 * Employer → staff messaging with group targeting.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────
export interface InternalGroup {
  id: string;
  org_id: string;
  name: string;
  created_at: string;
}

export interface InternalGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  added_at: string;
}

export interface InternalMessage {
  id: string;
  org_id: string;
  sender_user_id: string;
  title: string;
  body: string;
  target: "all" | "groups";
  is_important: boolean;
  created_at: string;
  /** Populated on read – group names this message targets */
  group_names?: string[];
}

export interface CreateMessagePayload {
  org_id: string;
  title: string;
  body: string;
  target: "all" | "groups";
  group_ids?: string[];
  is_important?: boolean;
}

// ── Groups ─────────────────────────────────────────────────────
export async function listGroupsForOrg(orgId: string): Promise<InternalGroup[]> {
  const { data, error } = await supabase
    .from("internal_groups")
    .select("*")
    .eq("org_id", orgId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as InternalGroup[];
}

export async function createGroup(orgId: string, name: string): Promise<InternalGroup> {
  const { data, error } = await supabase
    .from("internal_groups")
    .insert({ org_id: orgId, name })
    .select()
    .single();
  if (error) throw error;
  return data as InternalGroup;
}

export async function listGroupMembers(groupId: string): Promise<InternalGroupMember[]> {
  const { data, error } = await supabase
    .from("internal_group_members")
    .select("*")
    .eq("group_id", groupId);
  if (error) throw error;
  return (data ?? []) as InternalGroupMember[];
}

export async function assignUserToGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("internal_group_members")
    .insert({ group_id: groupId, user_id: userId });
  if (error) throw error;
}

export async function removeUserFromGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("internal_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

// ── Org Members (for member picker) ───────────────────────────
export interface OrgMemberProfile {
  user_id: string;
  full_name: string | null;
  role: string;
}

export async function listOrgMembersWithProfile(orgId: string): Promise<OrgMemberProfile[]> {
  const { data, error } = await supabase
    .from("org_members")
    .select("user_id, role, profiles!org_members_user_id_fkey ( full_name )")
    .eq("org_id", orgId);
  if (error) throw error;
  return (data ?? []).map((m: any) => ({
    user_id: m.user_id,
    full_name: m.profiles?.full_name ?? null,
    role: m.role,
  }));
}

// ── Messages ───────────────────────────────────────────────────
export async function createMessage(payload: CreateMessagePayload): Promise<InternalMessage> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("internal_messages")
    .insert({
      org_id: payload.org_id,
      sender_user_id: userId,
      title: payload.title,
      body: payload.body,
      target: payload.target,
      is_important: payload.is_important ?? false,
    })
    .select()
    .single();
  if (error) throw error;

  // If targeting specific groups, create junction rows
  if (payload.target === "groups" && payload.group_ids?.length) {
    const rows = payload.group_ids.map((gid) => ({
      message_id: (data as InternalMessage).id,
      group_id: gid,
    }));
    const { error: jErr } = await supabase
      .from("internal_message_groups")
      .insert(rows);
    if (jErr) throw jErr;
  }

  return data as InternalMessage;
}

export async function listMessagesForOrg(orgId: string): Promise<InternalMessage[]> {
  const { data, error } = await supabase
    .from("internal_messages")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const messages = (data ?? []) as InternalMessage[];

  // Enrich with group names for group-targeted messages
  const groupTargeted = messages.filter((m) => m.target === "groups");
  if (groupTargeted.length) {
    const msgIds = groupTargeted.map((m) => m.id);
    const { data: junctions } = await supabase
      .from("internal_message_groups")
      .select("message_id, group_id")
      .in("message_id", msgIds);

    if (junctions?.length) {
      const groupIds = [...new Set(junctions.map((j: { group_id: string }) => j.group_id))];
      const { data: groups } = await supabase
        .from("internal_groups")
        .select("id, name")
        .in("id", groupIds);

      const groupMap = new Map((groups ?? []).map((g: { id: string; name: string }) => [g.id, g.name]));

      for (const msg of groupTargeted) {
        const gIds = junctions
          .filter((j: { message_id: string }) => j.message_id === msg.id)
          .map((j: { group_id: string }) => j.group_id);
        msg.group_names = gIds.map((gid: string) => groupMap.get(gid) ?? gid);
      }
    }
  }

  return messages;
}

/**
 * List messages visible to a specific user (staff view).
 * Returns messages where target='all' OR user is member of a targeted group.
 */
export async function listMessagesForUser(orgId: string): Promise<InternalMessage[]> {
  // RLS handles filtering; we fetch all messages the user can see for this org
  return listMessagesForOrg(orgId);
}
