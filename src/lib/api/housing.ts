import { supabase } from "@/integrations/supabase/client";
import type { ListingWithOrg, ListingFilters } from "./jobs";
import { listListings } from "./jobs";

export interface HousingListing extends ListingWithOrg {
  rent_per_month: number | null;
  rooms: number | null;
  furnished: boolean;
  available_from: string | null;
  available_to: string | null;
  deposit: number | null;
  approx_area: string | null;
  host_user_id: string | null;
}

export interface HousingFilters {
  location?: string | null;
  maxRent?: number | null;
  minRooms?: number | null;
  furnished?: boolean;
}

export interface HousingThread {
  thread_id: string;
  housing_listing_id: string;
  talent_user_id?: string;
  host_user_id?: string;
  talent_name?: string;
  host_name?: string;
  listing_title: string;
  listing_location: string;
  rent_per_month?: number;
  last_message_at: string | null;
  unread_count?: number;
}

export interface CreateHousingPayload {
  title: string;
  location: string | null;
  approx_area: string | null;
  rent_per_month: number;
  rooms: number | null;
  furnished: boolean;
  available_from: string | null;
  available_to: string | null;
  deposit: number | null;
  housing_text: string | null;
}

/**
 * List published housing listings with filters
 */
export async function listHousingListings(
  filters?: HousingFilters,
  isDemoMode?: boolean
): Promise<{ listings: HousingListing[]; error: Error | null }> {
  const listingFilters: ListingFilters = {
    listingType: "housing",
    status: ["published"],
    location: filters?.location,
  };

  const { listings, error } = await listListings(listingFilters, isDemoMode);

  if (error) return { listings: [], error };

  let filtered = listings as HousingListing[];

  if (filters?.maxRent) {
    filtered = filtered.filter(
      (l) => l.rent_per_month && l.rent_per_month <= filters.maxRent!
    );
  }
  if (filters?.minRooms) {
    filtered = filtered.filter(
      (l) => l.rooms && l.rooms >= filters.minRooms!
    );
  }
  if (filters?.furnished) {
    filtered = filtered.filter((l) => l.furnished === true);
  }

  return { listings: filtered, error: null };
}

/**
 * List host's own housing listings
 */
export async function listMyHostHousing(): Promise<{
  listings: HousingListing[];
  error: Error | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { listings: [], error: new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("job_posts")
    .select(`*, orgs ( name )`)
    .eq("listing_type", "housing")
    .eq("host_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { listings: [], error: new Error(error.message) };
  }

  const listings: HousingListing[] = (data ?? []).map((item) => ({
    ...item,
    org_name: (item.orgs as { name: string } | null)?.name ?? "—",
  }));

  return { listings, error: null };
}

/**
 * Create a housing listing as host
 */
export async function createHostHousingListing(payload: CreateHousingPayload): Promise<{
  listing: HousingListing | null;
  error: Error | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { listing: null, error: new Error("Not authenticated") };
  }

  // Get or create a placeholder org for private hosts
  // For v0, we'll use a special "private_host" org or just set org_id to a demo org
  // In production, hosts would have their own org or we'd allow null org_id
  const { data: demoOrg } = await supabase
    .from("orgs")
    .select("id")
    .eq("is_demo", true)
    .limit(1)
    .maybeSingle();

  const orgId = demoOrg?.id;
  if (!orgId) {
    return { listing: null, error: new Error("No organization available") };
  }

  const { data, error } = await supabase
    .from("job_posts")
    .insert({
      listing_type: "housing",
      title: payload.title,
      location: payload.location,
      approx_area: payload.approx_area,
      rent_per_month: payload.rent_per_month,
      rooms: payload.rooms,
      furnished: payload.furnished,
      available_from: payload.available_from,
      available_to: payload.available_to,
      deposit: payload.deposit,
      housing_text: payload.housing_text,
      host_user_id: user.id,
      org_id: orgId,
      role_key: "housing",
      start_date: payload.available_from || new Date().toISOString().split("T")[0],
      end_date: payload.available_to || "2099-12-31",
      status: "draft",
    })
    .select(`*, orgs ( name )`)
    .single();

  if (error) {
    return { listing: null, error: new Error(error.message) };
  }

  const listing: HousingListing = {
    ...data,
    org_name: (data.orgs as { name: string } | null)?.name ?? "—",
  };

  return { listing, error: null };
}

/**
 * Update housing listing status
 */
export async function updateHousingListingStatus(
  id: string,
  status: "published" | "closed"
): Promise<{ error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: new Error("Not authenticated") };
  }

  const { error } = await supabase
    .from("job_posts")
    .update({ status })
    .eq("id", id)
    .eq("host_user_id", user.id)
    .eq("listing_type", "housing");

  return { error: error ? new Error(error.message) : null };
}

/**
 * Create a housing inquiry (verified tenant gate)
 */
export async function createHousingInquiry(listingId: string): Promise<{
  success: boolean;
  threadId?: string;
  isNew?: boolean;
  reason?: string;
}> {
  const { data, error } = await supabase.rpc("create_housing_inquiry", {
    p_housing_listing_id: listingId,
  });

  if (error) {
    return { success: false, reason: error.message };
  }

  const result = data as { success: boolean; thread_id?: string; is_new?: boolean; reason?: string };
  return {
    success: result.success,
    threadId: result.thread_id,
    isNew: result.is_new,
    reason: result.reason,
  };
}

/**
 * List housing threads for host
 */
export async function listHostHousingThreads(): Promise<{
  threads: HousingThread[];
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc("list_host_housing_threads");

  if (error) {
    return { threads: [], error: new Error(error.message) };
  }

  return { threads: (data ?? []) as HousingThread[], error: null };
}

/**
 * List housing threads for talent
 */
export async function listTalentHousingThreads(): Promise<{
  threads: HousingThread[];
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc("list_talent_housing_threads");

  if (error) {
    return { threads: [], error: new Error(error.message) };
  }

  return { threads: (data ?? []) as HousingThread[], error: null };
}

/**
 * Check if current user is a verified tenant
 */
export async function checkVerifiedTenant(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Check for accepted offer or demo profile
  const { data: offers } = await supabase
    .from("offers")
    .select("id")
    .eq("talent_user_id", user.id)
    .eq("status", "accepted")
    .limit(1);

  if (offers && offers.length > 0) return true;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_demo")
    .eq("user_id", user.id)
    .maybeSingle();

  return profile?.is_demo === true;
}
