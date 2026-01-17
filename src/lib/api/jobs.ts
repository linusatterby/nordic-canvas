import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type JobPost = Database["public"]["Tables"]["job_posts"]["Row"];
export type TalentJobSwipe = Database["public"]["Tables"]["talent_job_swipes"]["Row"];

export interface JobWithOrg extends JobPost {
  org_name: string;
}

export interface JobFilters {
  location?: string | null;
  roleKey?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  housingOnly?: boolean;
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
 * List published jobs the user hasn't swiped on yet, with optional filters
 */
export async function listUnswipedJobs(filters?: JobFilters, isDemoMode?: boolean): Promise<{
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

  // Build query with filters
  let query = supabase
    .from("job_posts")
    .select(`
      *,
      orgs ( name )
    `)
    .eq("status", "published");

  // Apply filters
  if (filters?.location && filters.location !== "all") {
    query = query.eq("location", filters.location);
  }

  if (filters?.roleKey && filters.roleKey !== "all") {
    query = query.eq("role_key", filters.roleKey);
  }

  if (filters?.startDate) {
    query = query.gte("end_date", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("start_date", filters.endDate);
  }

  if (filters?.housingOnly) {
    query = query.eq("housing_offered", true);
  }

  // Exclude already swiped jobs
  if (swipedJobIds.length > 0) {
    query = query.not("id", "in", `(${swipedJobIds.join(",")})`);
  }

  // Order: demo jobs first (Visby prioritized), then by date
  query = query.order("is_demo", { ascending: false })
    .order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    return { jobs: [], error: new Error(error.message) };
  }

  let jobs: JobWithOrg[] = (data ?? []).map((job) => ({
    ...job,
    org_name: (job.orgs as { name: string } | null)?.name ?? "Okänd",
  }));

  // Demo fallback: if in demo mode and no jobs found, fetch demo jobs ignoring swipes
  if (isDemoMode && jobs.length === 0) {
    const { data: demoData, error: demoError } = await supabase
      .from("job_posts")
      .select(`
        *,
        orgs ( name )
      `)
      .eq("status", "published")
      .eq("is_demo", true)
      .order("location", { ascending: false }) // Visby first (reverse alphabetical: V > S > Å)
      .order("created_at", { ascending: false })
      .limit(6);

    if (!demoError && demoData && demoData.length > 0) {
      jobs = demoData.map((job) => ({
        ...job,
        org_name: (job.orgs as { name: string } | null)?.name ?? "Okänd",
      }));
    }
  }

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

/**
 * Reset talent's demo job swipes
 */
export async function resetTalentDemoSwipes(): Promise<{
  success: boolean;
  deletedCount?: number;
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc("reset_talent_demo_swipes");

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  const result = data as { success: boolean; deleted_count?: number; error?: string };
  
  if (!result.success) {
    return { success: false, error: new Error(result.error ?? "Unknown error") };
  }

  return { success: true, deletedCount: result.deleted_count, error: null };
}
