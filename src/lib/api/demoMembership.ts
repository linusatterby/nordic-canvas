import { supabase } from "@/integrations/supabase/client";
import { IS_LIVE_BACKEND } from "@/lib/config/runtime";

/**
 * Ensure the current anonymous demo user is a member of the given demo org.
 * Only works in non-live environments against demo orgs.
 * Uses an edge function with service_role to bypass RLS for the insert.
 */
export async function ensureDemoMembership(orgId: string, role = "admin"): Promise<{
  ok: boolean;
  error: Error | null;
}> {
  if (IS_LIVE_BACKEND) {
    return { ok: false, error: new Error("Not allowed in live") };
  }

  const { data, error } = await supabase.functions.invoke("demo-ensure-membership", {
    body: { org_id: orgId, role },
  });

  if (error) {
    return { ok: false, error: new Error(error.message) };
  }

  if (data?.error) {
    return { ok: false, error: new Error(data.error) };
  }

  return { ok: true, error: null };
}
