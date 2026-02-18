import { supabase } from "@/integrations/supabase/client";
import { IS_LIVE_BACKEND } from "@/lib/config/env";

/**
 * Demo inbox item from the demo_inbox_items table.
 * Used to populate the kandidat inbox with realistic demo content.
 */
export interface DemoInboxItem {
  id: string;
  tab: "notification" | "match" | "offer" | "message" | "request";
  title: string;
  body: string | null;
  org_name: string | null;
  status: string | null;
  severity: string;
  metadata: Record<string, unknown>;
  sort_order: number;
  is_demo: boolean;
  created_at: string;
}

export type DemoInboxTab = DemoInboxItem["tab"];

/**
 * Hard guard: demo inbox is NEVER available on live backend.
 */
const LIVE_GUARD_RESULT = { items: [] as DemoInboxItem[], error: null };

/**
 * List demo inbox items for a specific tab.
 * Returns empty on live backend — hard guard, no exceptions.
 */
export async function listDemoInboxItems(
  tab?: DemoInboxTab
): Promise<{ items: DemoInboxItem[]; error: Error | null }> {
  // ── HARD GUARD: never call DB on live backend ──
  if (IS_LIVE_BACKEND) {
    return LIVE_GUARD_RESULT;
  }

  let query = supabase
    .from("demo_inbox_items")
    .select("*")
    .eq("is_demo", true)
    .order("sort_order", { ascending: true });

  if (tab) {
    query = query.eq("tab", tab);
  }

  const { data, error } = await query;

  return {
    items: (data ?? []) as DemoInboxItem[],
    error: error ? new Error(error.message) : null,
  };
}
