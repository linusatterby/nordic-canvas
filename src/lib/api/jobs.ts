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
 * In demo mode: if no jobs found, return demo jobs ignoring availability constraints
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

  // Check if user has active date filters set in UI
  const hasActiveDateFilters = !!(filters?.startDate || filters?.endDate);

  // Build query with filters
  let query = supabase
    .from("job_posts")
    .select(`
      *,
      orgs ( name )
    `)
    .eq("status", "published");

  // Apply location filter
  if (filters?.location && filters.location !== "all") {
    query = query.eq("location", filters.location);
  }

  // Apply role filter
  if (filters?.roleKey && filters.roleKey !== "all") {
    query = query.eq("role_key", filters.roleKey);
  }

  // Apply date filters only if user actively set them in UI
  // In demo mode without active date filters, skip date filtering entirely
  if (hasActiveDateFilters) {
    if (filters?.startDate) {
      query = query.gte("end_date", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte("start_date", filters.endDate);
    }
  }

  // Apply housing filter - check both housing_offered=true OR housing_text is not null
  if (filters?.housingOnly) {
    query = query.or("housing_offered.eq.true,housing_text.neq.null");
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

  // Demo fallback: if in demo mode and no jobs found, fetch demo jobs ignoring all filters except swipes
  if (isDemoMode && jobs.length === 0) {
    // First try: get demo jobs user hasn't swiped on
    let demoQuery = supabase
      .from("job_posts")
      .select(`
        *,
        orgs ( name )
      `)
      .eq("status", "published")
      .eq("is_demo", true)
      .order("location", { ascending: false }) // Visby first (reverse alphabetical)
      .order("created_at", { ascending: false })
      .limit(6);

    // Only exclude swiped jobs if there are some
    if (swipedJobIds.length > 0) {
      demoQuery = demoQuery.not("id", "in", `(${swipedJobIds.join(",")})`);
    }

    const { data: demoData, error: demoError } = await demoQuery;

    if (!demoError && demoData && demoData.length > 0) {
      jobs = demoData.map((job) => ({
        ...job,
        org_name: (job.orgs as { name: string } | null)?.name ?? "Okänd",
      }));
    } else if (isDemoMode && jobs.length === 0) {
      // Second fallback: return ANY demo jobs (even already swiped) if all have been swiped
      const { data: allDemoData, error: allDemoError } = await supabase
        .from("job_posts")
        .select(`
          *,
          orgs ( name )
        `)
        .eq("status", "published")
        .eq("is_demo", true)
        .order("location", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6);

      if (!allDemoError && allDemoData && allDemoData.length > 0) {
        jobs = allDemoData.map((job) => ({
          ...job,
          org_name: (job.orgs as { name: string } | null)?.name ?? "Okänd",
        }));
      }
    }
  }

  return { jobs, error: null };
}

export type JobFetchReason = "not_found" | "forbidden" | "rls_blocked" | "unknown";

export interface JobFetchResult {
  job: JobWithOrg | null;
  error: Error | null;
  reason?: JobFetchReason;
}

/**
 * Get a single job by ID with detailed error reporting
 */
export async function getJob(jobId: string): Promise<JobFetchResult> {
  // First try with org join
  const { data, error } = await supabase
    .from("job_posts")
    .select(`
      *,
      orgs ( name )
    `)
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    // Check if it's an RLS error
    if (error.code === "42501" || error.message.includes("permission")) {
      return { job: null, error: new Error(error.message), reason: "forbidden" };
    }
    return { job: null, error: new Error(error.message), reason: "unknown" };
  }

  if (!data) {
    // Try without org join to check if it's an RLS issue on orgs
    const { data: jobOnly, error: jobOnlyError } = await supabase
      .from("job_posts")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();
    
    if (jobOnlyError) {
      return { job: null, error: new Error(jobOnlyError.message), reason: "rls_blocked" };
    }
    
    if (!jobOnly) {
      return { job: null, error: null, reason: "not_found" };
    }
    
    // Job exists but we couldn't get org - use fallback
    const job: JobWithOrg = {
      ...jobOnly,
      org_name: "Okänd",
    };
    return { job, error: null };
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
 * HARD demo fetch - fetches demo jobs excluding already swiped ones
 * Falls back to ALL demo jobs if all have been swiped (for demo continuity)
 */
export async function listDemoJobsHard(limit: number = 6): Promise<{
  jobs: Array<{
    id: string;
    title: string;
    location: string | null;
    role_key: string;
    status: string | null;
    is_demo: boolean;
    created_at: string;
    start_date: string;
    end_date: string;
    housing_offered: boolean | null;
    housing_text: string | null;
    org_id: string;
    required_badges: string[] | null;
  }>;
  error: Error | null;
}> {
  console.log("[listDemoJobsHard] Fetching demo jobs with limit:", limit);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error("[listDemoJobsHard] No authenticated user");
    return { jobs: [], error: new Error("Not authenticated") };
  }

  // Get jobs user already swiped on
  const { data: swipes, error: swipeError } = await supabase
    .from("talent_job_swipes")
    .select("job_post_id")
    .eq("talent_user_id", user.id);

  if (swipeError) {
    console.error("[listDemoJobsHard] Error fetching swipes:", swipeError);
    return { jobs: [], error: new Error(swipeError.message) };
  }

  const swipedJobIds = (swipes ?? []).map((s) => s.job_post_id);
  console.log("[listDemoJobsHard] User has swiped on", swipedJobIds.length, "jobs");

  // Build query excluding swiped jobs
  let query = supabase
    .from("job_posts")
    .select("*")
    .eq("is_demo", true)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (swipedJobIds.length > 0) {
    query = query.not("id", "in", `(${swipedJobIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[listDemoJobsHard] Supabase error:", error);
    return { jobs: [], error: new Error(error.message) };
  }

  console.log("[listDemoJobsHard] Found unswiped jobs:", data?.length ?? 0);
  return { jobs: data ?? [], error: null };
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
