import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type JobPost = Database["public"]["Tables"]["job_posts"]["Row"];
export type TalentJobSwipe = Database["public"]["Tables"]["talent_job_swipes"]["Row"];

export interface JobWithOrg extends JobPost {
  org_name: string;
}

/**
 * List all published jobs
 */
export async function listPublishedJobs(): Promise<{
  jobs: JobWithOrg[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("job_posts")
    .select(`
      *,
      orgs ( name )
    `)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    return { jobs: [], error: new Error(error.message) };
  }

  const jobs: JobWithOrg[] = (data ?? []).map((job) => ({
    ...job,
    org_name: (job.orgs as { name: string } | null)?.name ?? "Okänd",
  }));

  return { jobs, error: null };
}

/**
 * List published jobs the user hasn't swiped on yet
 */
export async function listUnswipedJobs(): Promise<{
  jobs: JobWithOrg[];
  error: Error | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { jobs: [], error: new Error("Not authenticated") };
  }

  // Get jobs user already swiped on
  const { data: swipes, error: swipeError } = await supabase
    .from("talent_job_swipes")
    .select("job_post_id")
    .eq("talent_user_id", user.id);

  if (swipeError) {
    return { jobs: [], error: new Error(swipeError.message) };
  }

  const swipedJobIds = (swipes ?? []).map((s) => s.job_post_id);

  // Get published jobs not yet swiped
  let query = supabase
    .from("job_posts")
    .select(`
      *,
      orgs ( name )
    `)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (swipedJobIds.length > 0) {
    query = query.not("id", "in", `(${swipedJobIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    return { jobs: [], error: new Error(error.message) };
  }

  const jobs: JobWithOrg[] = (data ?? []).map((job) => ({
    ...job,
    org_name: (job.orgs as { name: string } | null)?.name ?? "Okänd",
  }));

  return { jobs, error: null };
}

/**
 * Get a single job by ID
 */
export async function getJob(jobId: string): Promise<{
  job: JobWithOrg | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("job_posts")
    .select(`
      *,
      orgs ( name )
    `)
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    return { job: null, error: new Error(error.message) };
  }

  if (!data) {
    return { job: null, error: null };
  }

  const job: JobWithOrg = {
    ...data,
    org_name: (data.orgs as { name: string } | null)?.name ?? "Okänd",
  };

  return { job, error: null };
}

/**
 * Record a talent's swipe on a job (idempotent upsert)
 */
export async function upsertTalentJobSwipe(
  jobId: string,
  direction: "yes" | "no"
): Promise<{ error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error("Not authenticated") };
  }

  const { error } = await supabase
    .from("talent_job_swipes")
    .upsert(
      {
        talent_user_id: user.id,
        job_post_id: jobId,
        direction,
      },
      { onConflict: "talent_user_id,job_post_id" }
    );

  return { error: error ? new Error(error.message) : null };
}

/**
 * List jobs for an org (employer view)
 */
export async function listOrgJobs(orgId: string): Promise<{
  jobs: JobPost[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("job_posts")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return {
    jobs: data ?? [],
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Create a new job post
 */
export async function createJob(params: {
  orgId: string;
  title: string;
  roleKey: string;
  location: string;
  startDate: string;
  endDate: string;
  requiredBadges?: string[];
  housingOffered?: boolean;
}): Promise<{
  job: JobPost | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("job_posts")
    .insert({
      org_id: params.orgId,
      title: params.title,
      role_key: params.roleKey,
      location: params.location,
      start_date: params.startDate,
      end_date: params.endDate,
      required_badges: params.requiredBadges ?? [],
      housing_offered: params.housingOffered ?? false,
      status: "published",
    })
    .select()
    .single();

  return {
    job: data,
    error: error ? new Error(error.message) : null,
  };
}
