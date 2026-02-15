import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Org = Database["public"]["Tables"]["orgs"]["Row"];
export type OrgMember = Database["public"]["Tables"]["org_members"]["Row"];

export interface OrgWithRole extends Org {
  role: string;
}

/**
 * List orgs the current user is a member of
 */
export async function listMyOrgs(): Promise<{
  orgs: OrgWithRole[];
  error: Error | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { orgs: [], error: new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("org_members")
    .select(`
      role,
      orgs!org_members_org_id_fkey ( * )
    `)
    .eq("user_id", user.id);

  if (error) {
    return { orgs: [], error: new Error(error.message) };
  }

  const orgs: OrgWithRole[] = (data ?? [])
    .filter((m) => m.orgs)
    .map((m) => ({
      ...(m.orgs as Org),
      role: m.role,
    }));

  return { orgs, error: null };
}

/**
 * Get the default org ID for the current user
 * Returns the first org if user has only one, null otherwise
 */
export async function getDefaultOrgId(): Promise<{
  orgId: string | null;
  error: Error | null;
}> {
  const { orgs, error } = await listMyOrgs();

  if (error) {
    return { orgId: null, error };
  }

  if (orgs.length === 1) {
    return { orgId: orgs[0].id, error: null };
  }

  // Return first if multiple, null if none
  return {
    orgId: orgs.length > 0 ? orgs[0].id : null,
    error: null,
  };
}

/**
 * Create a new organization and add current user as admin
 */
export async function createOrg(params: {
  name: string;
  location?: string;
  demoSessionId?: string | null;
}): Promise<{
  org: Org | null;
  error: Error | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { org: null, error: new Error("Not authenticated") };
  }

  const isDemo = !!params.demoSessionId;

  // Create org
  const { data: org, error: orgError } = await supabase
    .from("orgs")
    .insert({
      name: params.name,
      location: params.location ?? null,
      is_demo: isDemo,
      demo_session_id: params.demoSessionId ?? null,
    })
    .select()
    .single();

  if (orgError || !org) {
    return { org: null, error: new Error(orgError?.message ?? "Failed to create org") };
  }

  // Add current user as admin
  const { error: memberError } = await supabase
    .from("org_members")
    .insert({
      org_id: org.id,
      user_id: user.id,
      role: "admin",
      demo_session_id: params.demoSessionId ?? null,
    });

  if (memberError) {
    // Rollback org creation
    await supabase.from("orgs").delete().eq("id", org.id);
    return { org: null, error: new Error(memberError.message) };
  }

  return { org, error: null };
}
