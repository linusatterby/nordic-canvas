import { supabase } from "@/integrations/supabase/client";

export interface ResetDemoResult {
  success: boolean;
  message?: string;
  error?: string;
  org_id?: string;
  swipes_deleted?: number;
  offers_deleted?: number;
  messages_deleted?: number;
}

/**
 * Reset demo data for a specific org
 * Only works for demo orgs and requires admin access
 */
export async function resetDemo(orgId: string): Promise<{
  result: ResetDemoResult | null;
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc("reset_demo", {
    p_org_id: orgId,
  });

  if (error) {
    return { result: null, error: new Error(error.message) };
  }

  const result = data as unknown as ResetDemoResult;
  return { result, error: null };
}

/**
 * Check if an org is a demo org
 */
export async function checkDemoOrg(orgId: string): Promise<{
  isDemo: boolean;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("orgs")
    .select("is_demo")
    .eq("id", orgId)
    .single();

  if (error) {
    return { isDemo: false, error: new Error(error.message) };
  }

  return { isDemo: data?.is_demo ?? false, error: null };
}

/**
 * Reset demo data for a user (talent) without requiring org_id
 * Clears job swipes, borrow offers, and messages for demo data
 */
export async function resetDemoForUser(): Promise<{
  result: ResetDemoResult | null;
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc("reset_demo_for_user");

  if (error) {
    return { result: null, error: new Error(error.message) };
  }

  const result = data as unknown as ResetDemoResult;
  return { result, error: null };
}

/**
 * Get all demo orgs for the current user
 */
export async function listMyDemoOrgs(): Promise<{
  demoOrgIds: string[];
  error: Error | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { demoOrgIds: [], error: new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("org_members")
    .select(`
      org_id,
      orgs!inner ( id, is_demo )
    `)
    .eq("user_id", user.id);

  if (error) {
    return { demoOrgIds: [], error: new Error(error.message) };
  }

  const demoOrgIds = (data ?? [])
    .filter((m) => (m.orgs as { is_demo: boolean })?.is_demo)
    .map((m) => m.org_id);

  return { demoOrgIds, error: null };
}
