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
