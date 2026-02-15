import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { debugWarn } from "@/lib/utils/debug";
import { logger } from "@/lib/logging/logger";

// Core types from database
export type JobPost = Database["public"]["Tables"]["job_posts"]["Row"];
export type TalentJobSwipe = Database["public"]["Tables"]["talent_job_swipes"]["Row"];

// New unified Listing type (alias for backward compatibility)
export type Listing = JobPost;
export type ListingType = "job" | "shift_cover" | "housing";
export type ListingStatus = "draft" | "published" | "matching" | "closed";

export interface JobWithOrg extends JobPost {
  org_name: string;
  // Computed display fields
  display_title?: string;
  display_location?: string;
  display_role?: string;
}

// Alias for new Listing terminology
export interface ListingWithOrg extends JobWithOrg {}

export interface JobFilters {
  location?: string | null;
  roleKey?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  housingOnly?: boolean;
}

// Extended filters for Listing API
export interface ListingFilters extends JobFilters {
  listingType?: ListingType | ListingType[] | null;
  status?: ListingStatus | ListingStatus[] | null;
  shiftRequired?: boolean;
  includeShiftCover?: boolean; // Toggle to include shift_cover type
  orgId?: string; // For employer queries
  excludeSwipedByUserId?: string; // Exclude jobs user has swiped
}

// ============================================================
// FIELD MAPPING - Server-side resolved via RPC for bulletproof mapping
// ============================================================

interface ResolvedColumns {
  location: string | null;
  role: string | null;
  title: string | null;
  hasHousingOffered: boolean;
  hasHousingText: boolean;
}

interface FieldMapRPCResponse {
  candidates: {
    location: string[];
    role: string[];
    title: string[];
    housing_flag: string[];
    housing_text: string[];
  };
  resolved: {
    location_col: string | null;
    role_col: string | null;
    title_col: string | null;
    has_housing_offered: boolean;
    has_housing_text: boolean;
  };
}

// Hardcoded fallback defaults (used if RPC fails)
const FALLBACK_COLUMNS: ResolvedColumns = {
  location: "location",
  role: "role_key",
  title: "title",
  hasHousingOffered: true,
  hasHousingText: true,
};

// Cache with TTL (10 minutes)
let resolvedColumnsCache: ResolvedColumns | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Resolve job_posts field mapping via server-side RPC
 * Uses information_schema for deterministic column resolution
 * Results are cached for 10 minutes
 */
async function resolveJobPostsColumns(): Promise<ResolvedColumns> {
  const now = Date.now();
  
  // Return cached result if still valid
  if (resolvedColumnsCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return resolvedColumnsCache;
  }

  try {
    // Call server-side RPC for deterministic field mapping
    const { data, error } = await supabase.rpc("get_job_posts_field_map");

    if (error) {
      debugWarn("Field map RPC failed, using fallback:", error.message);
      resolvedColumnsCache = FALLBACK_COLUMNS;
      cacheTimestamp = now;
      return resolvedColumnsCache;
    }

    const response = data as unknown as FieldMapRPCResponse;
    
    if (!response || !response.resolved) {
      debugWarn("Field map RPC returned invalid data, using fallback");
      resolvedColumnsCache = FALLBACK_COLUMNS;
      cacheTimestamp = now;
      return resolvedColumnsCache;
    }

    resolvedColumnsCache = {
      location: response.resolved.location_col,
      role: response.resolved.role_col,
      title: response.resolved.title_col,
      hasHousingOffered: response.resolved.has_housing_offered,
      hasHousingText: response.resolved.has_housing_text,
    };
    cacheTimestamp = now;

    debugWarn("Resolved job_posts columns via RPC:", resolvedColumnsCache);
    return resolvedColumnsCache;
  } catch (err) {
    // Network or other failure - use fallback
    debugWarn("Field map resolution failed, using fallback:", err);
    resolvedColumnsCache = FALLBACK_COLUMNS;
    cacheTimestamp = now;
    return resolvedColumnsCache;
  }
}

/**
 * Force refresh of column cache (useful after schema changes)
 */
export function invalidateFieldMapCache(): void {
  resolvedColumnsCache = null;
  cacheTimestamp = 0;
}

/**
 * Add computed display fields to listing
 * Safe fallback: never returns undefined for display fields
 */
function enrichListingWithDisplayFields(
  listing: Record<string, unknown>,
  cols: ResolvedColumns
): Record<string, unknown> {
  // Safe access with fallback chain
  const displayTitle = cols.title && listing[cols.title] 
    ? String(listing[cols.title]) 
    : (listing.title ? String(listing.title) : "—");
  
  const displayLocation = cols.location && listing[cols.location]
    ? String(listing[cols.location])
    : (listing.location ? String(listing.location) : "—");
  
  const displayRole = cols.role && listing[cols.role]
    ? String(listing[cols.role])
    : (listing.role_key ? String(listing.role_key) : "—");

  return {
    ...listing,
    display_title: displayTitle,
    display_location: displayLocation,
    display_role: displayRole,
  };
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

// ============================================================
// NEW LISTING API - Unified interface for all listing types
// ============================================================

/**
 * List listings with unified filters (new API)
 * Supports job, shift_cover, housing types with field-mapping
 */
export async function listListings(filters?: ListingFilters, isDemoMode?: boolean): Promise<{
  listings: ListingWithOrg[];
  error: Error | null;
}> {
  // Resolve column names for flexible schema
  const cols = await resolveJobPostsColumns();
  
  const { data: { user } } = await supabase.auth.getUser();

  // Get swiped job IDs if we need to exclude them
  let swipedJobIds: string[] = [];
  if (filters?.excludeSwipedByUserId && user) {
    const { data: swipes } = await supabase
      .from("talent_job_swipes")
      .select("job_post_id")
      .eq("talent_user_id", user.id);
    swipedJobIds = (swipes ?? []).map((s) => s.job_post_id);
  }

  let query = supabase
    .from("job_posts")
    .select(`
      *,
      orgs ( name )
    `);

  // Filter by org (for employer queries)
  if (filters?.orgId) {
    query = query.eq("org_id", filters.orgId);
  }

  // Filter by listing type (supports array or single value)
  if (filters?.listingType) {
    if (Array.isArray(filters.listingType)) {
      query = query.in("listing_type", filters.listingType);
    } else {
      query = query.eq("listing_type", filters.listingType);
    }
  } else if (filters?.includeShiftCover) {
    // Include both job and shift_cover
    query = query.in("listing_type", ["job", "shift_cover"]);
  }

  // Filter by status (supports array or single value)
  // For org queries, don't default to published
  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  } else if (!filters?.orgId) {
    // Default to published for public/talent queries
    query = query.eq("status", "published");
  }

  // Apply location filter using resolved column with ilike for fuzzy match
  if (filters?.location && filters.location !== "all" && filters.location !== "") {
    if (cols.location) {
      query = query.ilike(cols.location, `%${filters.location}%`);
    } else {
      debugWarn("No location column found, skipping location filter");
    }
  }

  // Apply role filter using resolved column
  if (filters?.roleKey && filters.roleKey !== "all" && filters.roleKey !== "") {
    if (cols.role) {
      query = query.ilike(cols.role, `%${filters.roleKey}%`);
    } else {
      debugWarn("No role column found, skipping role filter");
    }
  }

  // Apply date filters for shift_cover type
  if (filters?.startDate && filters?.includeShiftCover) {
    query = query.or(`end_date.gte.${filters.startDate},shift_end.gte.${filters.startDate}`);
  }
  if (filters?.endDate && filters?.includeShiftCover) {
    query = query.or(`start_date.lte.${filters.endDate},shift_start.lte.${filters.endDate}`);
  }

  // Apply housing filter
  if (filters?.housingOnly) {
    if (cols.hasHousingOffered) {
      query = query.or("housing_offered.eq.true,housing_text.neq.null");
    } else {
      query = query.not("housing_text", "is", null);
    }
  }

  // Apply shift required filter
  if (filters?.shiftRequired !== undefined) {
    query = query.eq("shift_required", filters.shiftRequired);
  }

  // Exclude swiped jobs
  if (swipedJobIds.length > 0) {
    query = query.not("id", "in", `(${swipedJobIds.join(",")})`);
  }

  query = query.order("match_priority", { ascending: false })
    .order("is_demo", { ascending: false }) // Demo first in demo mode
    .order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    return { listings: [], error: new Error(error.message) };
  }

  // Enrich with display fields
  const listings: ListingWithOrg[] = (data ?? []).map((listing) => ({
    ...enrichListingWithDisplayFields(listing, cols),
    org_name: (listing.orgs as { name: string } | null)?.name ?? "Okänd",
  } as ListingWithOrg));

  // Demo fallback: if in demo mode and no listings, get demo listings
  if (isDemoMode && listings.length === 0 && !filters?.orgId) {
    logger.info("demo_jobs_fallback_used", {
      context: "listListings",
      message: "Primary query returned 0 results, fetching demo jobs",
      meta: { reason: "empty_primary", filters: { location: filters?.location ?? null, roleKey: filters?.roleKey ?? null, housingOnly: !!filters?.housingOnly, includeShiftCover: !!filters?.includeShiftCover } },
    });
    const { data: demoData, error: demoError } = await supabase
      .from("job_posts")
      .select(`*, orgs ( name )`)
      .eq("is_demo", true)
      .eq("status", "published")
      .limit(6);
    
    if (demoError) {
      logger.warn("demo_jobs_fallback_used", {
        context: "listListings",
        message: "Fallback query also failed",
        meta: { reason: "fallback_error" },
        error: demoError,
      });
    }

    if (!demoError && demoData && demoData.length > 0) {
      logger.info("demo_jobs_fallback_used", {
        context: "listListings",
        message: `Returning ${demoData.length} fallback demo jobs`,
        meta: { reason: "fallback_success", count: demoData.length },
      });
      return {
        listings: demoData.map((listing) => ({
          ...enrichListingWithDisplayFields(listing, cols),
          org_name: (listing.orgs as { name: string } | null)?.name ?? "Demo",
        } as ListingWithOrg)),
        error: null,
      };
    }
  }

  return { listings, error: null };
}

/**
 * Create a new listing (unified create for all types)
 */
export async function createListing(params: {
  orgId: string;
  listingType?: ListingType;
  title: string;
  roleKey: string;
  location: string;
  startDate: string;
  endDate: string;
  status?: ListingStatus;
  shiftStart?: string;
  shiftEnd?: string;
  shiftRequired?: boolean;
  requiredBadges?: string[];
  housingOffered?: boolean;
  housingText?: string;
  matchPriority?: number;
  tags?: string[];
}): Promise<{
  listing: Listing | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("job_posts")
    .insert({
      org_id: params.orgId,
      listing_type: params.listingType ?? "job",
      title: params.title,
      role_key: params.roleKey,
      location: params.location,
      start_date: params.startDate,
      end_date: params.endDate,
      status: params.status ?? "published",
      shift_start: params.shiftStart ?? null,
      shift_end: params.shiftEnd ?? null,
      shift_required: params.shiftRequired ?? false,
      required_badges: params.requiredBadges ?? [],
      housing_offered: params.housingOffered ?? false,
      housing_text: params.housingText ?? null,
      match_priority: params.matchPriority ?? 0,
      tags: params.tags ?? null,
    })
    .select()
    .single();

  return {
    listing: data,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Update listing status (pipeline transitions)
 */
export async function updateListingStatus(
  listingId: string,
  status: ListingStatus
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase
    .from("job_posts")
    .update({ status })
    .eq("id", listingId);

  return {
    success: !error,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Get a single listing by ID (alias for getJob with new naming)
 */
export async function getListing(listingId: string): Promise<JobFetchResult> {
  return getJob(listingId);
}

/**
 * List org listings (unified, replaces listOrgJobs internally)
 */
export async function listOrgListings(
  orgId: string,
  filters?: { listingType?: ListingType; status?: ListingStatus }
): Promise<{
  listings: Listing[];
  error: Error | null;
}> {
  let query = supabase
    .from("job_posts")
    .select("*")
    .eq("org_id", orgId);

  if (filters?.listingType) {
    query = query.eq("listing_type", filters.listingType);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  return {
    listings: data ?? [],
    error: error ? new Error(error.message) : null,
  };
}
