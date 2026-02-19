/**
 * Employer Views API layer.
 *
 * Two distinct data streams:
 *  1. Applications – only APPLIED/submitted applications to employer's jobs
 *  2. CandidatePool – only candidates who opted into pool visibility (scope != 'off')
 *  3. Outreach – employer sends a "förfrågan" (NOT an application) to a pool candidate
 *
 * Hard guard: demo vs live separation via IS_LIVE_BACKEND + demo_session_id.
 */

import { supabase } from "@/integrations/supabase/client";
import { IS_LIVE_BACKEND } from "@/lib/config/runtime";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmployerApplication {
  id: string;
  candidate_id: string;
  candidate_name: string | null;
  job_id: string;
  job_title: string;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface PoolCandidate {
  user_id: string;
  full_name: string | null;
  home_base: string | null;
  scope: string;
  available_for_extra_hours: boolean;
  desired_roles: string[];
  bio: string | null;
  is_demo?: boolean;
}

export interface OutreachRecord {
  id: string;
  org_id: string;
  talent_user_id: string;
  message: string | null;
  role_title: string | null;
  location: string | null;
  status: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function currentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

async function demoSessionId(): Promise<string | null> {
  if (IS_LIVE_BACKEND) return null;
  try {
    return localStorage.getItem("demo_session_id") || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. APPLICATIONS: Only submitted applications to employer's jobs
// ---------------------------------------------------------------------------

export async function listEmployerApplications(orgId: string): Promise<{
  applications: EmployerApplication[];
  error: Error | null;
}> {
  // Get org's job IDs first
  const { data: jobs, error: jobsError } = await supabase
    .from("job_posts")
    .select("id, title")
    .eq("org_id", orgId);

  if (jobsError) return { applications: [], error: new Error(jobsError.message) };
  if (!jobs || jobs.length === 0) return { applications: [], error: null };

  const jobIds = jobs.map((j) => j.id);
  const jobMap = new Map(jobs.map((j) => [j.id, j.title]));

  // Only fetch submitted (APPLIED) applications — never saved/draft
  const { data, error } = await supabase
    .from("applications")
    .select("id, candidate_id, job_id, status, payload, created_at")
    .in("job_id", jobIds)
    .eq("status", "submitted")
    .order("created_at", { ascending: false });

  if (error) return { applications: [], error: new Error(error.message) };

  // Get candidate names
  const candidateIds = [...new Set((data ?? []).map((a) => a.candidate_id))];
  let nameMap = new Map<string, string | null>();

  if (candidateIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", candidateIds);

    nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));
  }

  const applications: EmployerApplication[] = (data ?? []).map((row) => ({
    id: row.id,
    candidate_id: row.candidate_id,
    candidate_name: nameMap.get(row.candidate_id) ?? null,
    job_id: row.job_id,
    job_title: jobMap.get(row.job_id) ?? "—",
    status: row.status,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    created_at: row.created_at,
  }));

  return { applications, error: null };
}

// ---------------------------------------------------------------------------
// 2. CANDIDATE POOL: Only candidates who opted into pool visibility
// ---------------------------------------------------------------------------

export async function listCandidatePool(filters?: {
  location?: string;
  role?: string;
}): Promise<{
  candidates: PoolCandidate[];
  error: Error | null;
}> {
  // Get all candidates with visibility != 'off'
  const { data: visible, error: visError } = await supabase
    .from("talent_visibility")
    .select("talent_user_id, scope, available_for_extra_hours")
    .neq("scope", "off");

  if (visError) return { candidates: [], error: new Error(visError.message) };
  if (!visible || visible.length === 0) return { candidates: [], error: null };

  const userIds = visible.map((v) => v.talent_user_id);
  const visMap = new Map(visible.map((v) => [v.talent_user_id, v]));

  // Get profiles
  const { data: profiles, error: profError } = await supabase
    .from("profiles")
    .select("user_id, full_name, home_base, is_demo")
    .in("user_id", userIds)
    .eq("type", "talent");

  if (profError) return { candidates: [], error: new Error(profError.message) };

  // Get talent_profiles for desired_roles + bio
  const { data: talentProfiles } = await supabase
    .from("talent_profiles")
    .select("user_id, desired_roles, bio")
    .in("user_id", userIds);

  const tpMap = new Map((talentProfiles ?? []).map((tp) => [tp.user_id, tp]));

  let candidates: PoolCandidate[] = (profiles ?? []).map((p) => {
    const vis = visMap.get(p.user_id);
    const tp = tpMap.get(p.user_id);
    return {
      user_id: p.user_id,
      full_name: p.full_name,
      home_base: p.home_base,
      scope: vis?.scope ?? "public",
      available_for_extra_hours: vis?.available_for_extra_hours ?? false,
      desired_roles: tp?.desired_roles ?? [],
      bio: tp?.bio ?? null,
      is_demo: p.is_demo,
    };
  });

  // Client-side filters
  if (filters?.location) {
    const loc = filters.location.toLowerCase();
    candidates = candidates.filter((c) =>
      c.home_base?.toLowerCase().includes(loc)
    );
  }
  if (filters?.role) {
    const role = filters.role.toLowerCase();
    candidates = candidates.filter((c) =>
      c.desired_roles.some((r) => r.toLowerCase().includes(role))
    );
  }

  return { candidates, error: null };
}

// ---------------------------------------------------------------------------
// 3. OUTREACH: Send a "förfrågan" to a pool candidate
// ---------------------------------------------------------------------------

export async function sendOutreach(params: {
  orgId: string;
  talentUserId: string;
  message?: string;
  roleTitle?: string;
  location?: string;
}): Promise<{ id: string | null; error: Error | null }> {
  const uid = await currentUserId();
  const dsId = await demoSessionId();

  const { data, error } = await supabase
    .from("employer_outreach")
    .insert({
      org_id: params.orgId,
      talent_user_id: params.talentUserId,
      sent_by: uid,
      message: params.message ?? null,
      role_title: params.roleTitle ?? null,
      location: params.location ?? null,
      demo_session_id: dsId,
    })
    .select("id")
    .single();

  return {
    id: data?.id ?? null,
    error: error ? new Error(error.message) : null,
  };
}

// ---------------------------------------------------------------------------
// 4. READ: Outreach received by candidate (for inbox)
// ---------------------------------------------------------------------------

export async function listReceivedOutreach(): Promise<{
  outreach: OutreachRecord[];
  error: Error | null;
}> {
  const uid = await currentUserId();

  const { data, error } = await supabase
    .from("employer_outreach")
    .select("id, org_id, talent_user_id, message, role_title, location, status, created_at")
    .eq("talent_user_id", uid)
    .order("created_at", { ascending: false });

  return {
    outreach: (data ?? []) as OutreachRecord[],
    error: error ? new Error(error.message) : null,
  };
}

// ---------------------------------------------------------------------------
// 5. READ: Outreach sent by employer org
// ---------------------------------------------------------------------------

export async function listOrgOutreach(orgId: string): Promise<{
  outreach: OutreachRecord[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("employer_outreach")
    .select("id, org_id, talent_user_id, message, role_title, location, status, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return {
    outreach: (data ?? []) as OutreachRecord[],
    error: error ? new Error(error.message) : null,
  };
}
