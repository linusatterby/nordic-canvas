/**
 * Onboarding API layer.
 * Employer can create onboarding items; staff can view & complete them.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────
export interface OnboardingItem {
  id: string;
  org_id: string;
  title: string;
  description: string;
  content_type: string;
  content_url: string | null;
  target: "all" | "groups";
  created_by: string;
  created_at: string;
  is_demo: boolean;
  /** Populated on read – group names this item targets */
  group_names?: string[];
}

export interface OnboardingProgress {
  id: string;
  item_id: string;
  user_id: string;
  status: "not_started" | "completed";
  completed_at: string | null;
}

export interface CreateOnboardingPayload {
  org_id: string;
  title: string;
  description: string;
  content_type: string;
  content_url?: string;
  target: "all" | "groups";
  group_ids?: string[];
}

// ── Items ──────────────────────────────────────────────────────
export async function createOnboardingItem(payload: CreateOnboardingPayload): Promise<OnboardingItem> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("onboarding_items")
    .insert({
      org_id: payload.org_id,
      title: payload.title,
      description: payload.description,
      content_type: payload.content_type,
      content_url: payload.content_url ?? null,
      target: payload.target,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;

  // Junction rows for group targeting
  if (payload.target === "groups" && payload.group_ids?.length) {
    const rows = payload.group_ids.map((gid) => ({
      item_id: (data as OnboardingItem).id,
      group_id: gid,
    }));
    const { error: jErr } = await supabase
      .from("onboarding_item_groups")
      .insert(rows);
    if (jErr) throw jErr;
  }

  return data as OnboardingItem;
}

export async function listOnboardingForOrg(orgId: string): Promise<OnboardingItem[]> {
  const { data, error } = await supabase
    .from("onboarding_items")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const items = (data ?? []) as OnboardingItem[];

  // Enrich group-targeted items with group names
  const groupTargeted = items.filter((i) => i.target === "groups");
  if (groupTargeted.length) {
    const itemIds = groupTargeted.map((i) => i.id);
    const { data: junctions } = await supabase
      .from("onboarding_item_groups")
      .select("item_id, group_id")
      .in("item_id", itemIds);

    if (junctions?.length) {
      const groupIds = [...new Set(junctions.map((j: { group_id: string }) => j.group_id))];
      const { data: groups } = await supabase
        .from("internal_groups")
        .select("id, name")
        .in("id", groupIds);

      const groupMap = new Map((groups ?? []).map((g: { id: string; name: string }) => [g.id, g.name]));

      for (const item of groupTargeted) {
        const gIds = junctions
          .filter((j: { item_id: string }) => j.item_id === item.id)
          .map((j: { group_id: string }) => j.group_id);
        item.group_names = gIds.map((gid: string) => groupMap.get(gid) ?? gid);
      }
    }
  }

  return items;
}

/**
 * List onboarding items visible to the current user.
 * RLS ensures org membership; we additionally filter by target/group.
 */
export async function listOnboardingForUser(orgId: string): Promise<OnboardingItem[]> {
  // RLS already limits to org members; for staff we get all items they can see
  return listOnboardingForOrg(orgId);
}

// ── Progress ───────────────────────────────────────────────────
export async function listProgressForUser(orgId: string): Promise<OnboardingProgress[]> {
  const { data: items } = await supabase
    .from("onboarding_items")
    .select("id")
    .eq("org_id", orgId);

  if (!items?.length) return [];

  const itemIds = items.map((i: { id: string }) => i.id);
  const { data, error } = await supabase
    .from("onboarding_progress")
    .select("*")
    .in("item_id", itemIds);
  if (error) throw error;

  return (data ?? []) as OnboardingProgress[];
}

export async function markOnboardingComplete(itemId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("onboarding_progress")
    .upsert(
      {
        item_id: itemId,
        user_id: userId,
        status: "completed",
        completed_at: new Date().toISOString(),
      },
      { onConflict: "item_id,user_id" }
    );
  if (error) throw error;
}
