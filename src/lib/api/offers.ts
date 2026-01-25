import { supabase } from "@/integrations/supabase/client";

/**
 * Offer status type
 */
export type OfferStatus = "draft" | "sent" | "accepted" | "declined" | "withdrawn" | "expired";

/**
 * Offer listing type
 */
export type OfferListingType = "job" | "shift_cover";

/**
 * Offer data structure
 */
export interface Offer {
  id: string;
  org_id: string;
  talent_user_id: string;
  match_id: string | null;
  listing_id: string | null;
  listing_type: OfferListingType;
  status: OfferStatus;
  message: string | null;
  
  // Payload
  location: string | null;
  role_title: string | null;
  start_date: string | null;
  end_date: string | null;
  shift_start: string | null;
  shift_end: string | null;
  hours_per_week: number | null;
  hourly_rate: number | null;
  currency: string;
  housing_included: boolean;
  housing_note: string | null;
  
  // Audit
  created_by: string | null;
  sent_at: string | null;
  responded_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Offer with org name for display
 */
export interface OfferWithOrg extends Offer {
  org_name?: string;
}

/**
 * Payload for creating an offer draft
 */
export interface CreateOfferPayload {
  org_id: string;
  talent_user_id: string;
  match_id?: string | null;
  listing_id?: string | null;
  listing_type?: OfferListingType;
  message?: string | null;
  location?: string | null;
  role_title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  shift_start?: string | null;
  shift_end?: string | null;
  hours_per_week?: number | null;
  hourly_rate?: number | null;
  currency?: string;
  housing_included?: boolean;
  housing_note?: string | null;
  expires_at?: string | null;
}

/**
 * Create an offer draft
 */
export async function createOfferDraft(payload: CreateOfferPayload): Promise<{
  offer: Offer | null;
  error: Error | null;
}> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { offer: null, error: new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("offers")
    .insert({
      ...payload,
      status: "draft",
      created_by: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("[createOfferDraft] Error:", error);
    return { offer: null, error };
  }

  return { offer: data as Offer, error: null };
}

/**
 * List offers for a talent (their received offers)
 */
export async function listTalentOffers(): Promise<{
  offers: OfferWithOrg[];
  error: Error | null;
}> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { offers: [], error: new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("offers")
    .select(`
      *,
      orgs:org_id (name)
    `)
    .eq("talent_user_id", userData.user.id)
    .neq("status", "draft") // Talents only see sent offers
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listTalentOffers] Error:", error);
    return { offers: [], error };
  }

  const offers: OfferWithOrg[] = (data ?? []).map((row: any) => ({
    ...row,
    org_name: row.orgs?.name ?? "Okänd arbetsgivare",
    orgs: undefined,
  }));

  return { offers, error: null };
}

/**
 * List offers for an org (their sent offers)
 */
export async function listOrgOffers(orgId: string): Promise<{
  offers: Offer[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listOrgOffers] Error:", error);
    return { offers: [], error };
  }

  return { offers: (data ?? []) as Offer[], error: null };
}

/**
 * Get a single offer by ID
 */
export async function getOffer(offerId: string): Promise<{
  offer: OfferWithOrg | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("offers")
    .select(`
      *,
      orgs:org_id (name)
    `)
    .eq("id", offerId)
    .maybeSingle();

  if (error) {
    console.error("[getOffer] Error:", error);
    return { offer: null, error };
  }

  if (!data) {
    return { offer: null, error: null };
  }

  const offer: OfferWithOrg = {
    ...(data as unknown as Offer),
    org_name: (data as any).orgs?.name ?? "Okänd arbetsgivare",
  };

  return { offer, error: null };
}

/**
 * Offer action result type for standardized error handling
 */
export type OfferActionResult = 
  | { ok: true; offerId?: string }
  | { ok: false; reason: 'conflict' | 'forbidden' | 'validation' | 'not_found' | 'invalid_status' | 'unknown'; message: string; existingOfferId?: string };

/**
 * Map server reasons to user-friendly messages
 */
export function getOfferErrorMessage(reason: string): string {
  switch (reason) {
    case 'conflict':
      return 'Ett erbjudande är redan skickat eller accepterat för den här matchningen.';
    case 'forbidden':
      return 'Du saknar behörighet för den här organisationen.';
    case 'validation':
      return 'Erbjudandet saknar obligatorisk information.';
    case 'not_found':
      return 'Erbjudandet kunde inte hittas.';
    case 'invalid_status':
      return 'Erbjudandet kan inte skickas i nuvarande status.';
    default:
      return 'Något gick fel. Försök igen.';
  }
}

/**
 * Check if an offer conflict exists (dry-run)
 */
export async function checkOfferConflict(
  orgId: string,
  talentUserId: string,
  matchId?: string | null,
  listingId?: string | null
): Promise<{ hasConflict: boolean; conflictCount: number }> {
  const { data, error } = await supabase.rpc("check_offer_conflict", {
    p_org_id: orgId,
    p_talent_user_id: talentUserId,
    p_match_id: matchId ?? undefined,
    p_listing_id: listingId ?? undefined,
  });

  if (error) {
    console.error("[checkOfferConflict] RPC error:", error);
    return { hasConflict: false, conflictCount: 0 };
  }

  const result = data as { has_conflict: boolean; conflict_count: number };
  return { hasConflict: result.has_conflict, conflictCount: result.conflict_count };
}

/**
 * Send an offer (draft -> sent) with standardized result
 */
export async function sendOffer(offerId: string): Promise<OfferActionResult> {
  const { data, error } = await supabase.rpc("send_offer", {
    p_offer_id: offerId,
  });

  if (error) {
    console.error("[sendOffer] RPC error:", error);
    return { ok: false, reason: 'unknown', message: getOfferErrorMessage('unknown') };
  }

  const result = data as { success: boolean; reason?: string; offer_id?: string };
  
  if (!result.success) {
    const reason = (result.reason as OfferActionResult extends { ok: false } ? OfferActionResult['reason'] : never) || 'unknown';
    return { 
      ok: false, 
      reason: reason as any,
      message: getOfferErrorMessage(result.reason || 'unknown')
    };
  }
  
  return { ok: true, offerId };
}

/**
 * Legacy sendOffer return format for backward compatibility
 */
export async function sendOfferLegacy(offerId: string): Promise<{
  success: boolean;
  reason?: string;
  error: Error | null;
}> {
  const result = await sendOffer(offerId);
  if (result.ok === true) {
    return { success: true, error: null };
  }
  return { success: false, reason: result.reason, error: null };
}

/**
 * Respond to an offer (accept or decline)
 */
export async function respondOffer(
  offerId: string,
  action: "accept" | "decline"
): Promise<{
  success: boolean;
  reason?: string;
  new_status?: string;
  match_id?: string | null;
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc("respond_offer", {
    p_offer_id: offerId,
    p_action: action,
  });

  if (error) {
    console.error("[respondOffer] RPC error:", error);
    return { success: false, error };
  }

  const result = data as { 
    success: boolean; 
    reason?: string; 
    new_status?: string;
    match_id?: string | null;
  };
  
  return { 
    success: result.success, 
    reason: result.reason,
    new_status: result.new_status,
    match_id: result.match_id,
    error: null 
  };
}

/**
 * Withdraw an offer (draft/sent -> withdrawn)
 */
export async function withdrawOffer(offerId: string): Promise<{
  success: boolean;
  reason?: string;
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc("withdraw_offer", {
    p_offer_id: offerId,
  });

  if (error) {
    console.error("[withdrawOffer] RPC error:", error);
    return { success: false, error };
  }

  const result = data as { success: boolean; reason?: string };
  return { 
    success: result.success, 
    reason: result.reason,
    error: null 
  };
}

/**
 * Update an offer draft
 */
export async function updateOfferDraft(
  offerId: string, 
  updates: Partial<CreateOfferPayload>
): Promise<{
  offer: Offer | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("offers")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", offerId)
    .eq("status", "draft") // Can only update drafts
    .select()
    .single();

  if (error) {
    console.error("[updateOfferDraft] Error:", error);
    return { offer: null, error };
  }

  return { offer: data as Offer, error: null };
}

/**
 * Get status display info
 */
export function getOfferStatusInfo(status: OfferStatus): {
  label: string;
  variant: "default" | "success" | "warn" | "danger" | "muted";
} {
  switch (status) {
    case "draft":
      return { label: "Utkast", variant: "muted" };
    case "sent":
      return { label: "Skickat", variant: "default" };
    case "accepted":
      return { label: "Accepterat", variant: "success" };
    case "declined":
      return { label: "Avböjt", variant: "danger" };
    case "withdrawn":
      return { label: "Återkallat", variant: "warn" };
    case "expired":
      return { label: "Utgånget", variant: "muted" };
    default:
      return { label: status, variant: "default" };
  }
}
