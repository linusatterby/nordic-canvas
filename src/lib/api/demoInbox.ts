import { supabase } from "@/integrations/supabase/client";

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
 * List demo inbox items for a specific tab
 */
export async function listDemoInboxItems(
  tab?: DemoInboxTab
): Promise<{ items: DemoInboxItem[]; error: Error | null }> {
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
