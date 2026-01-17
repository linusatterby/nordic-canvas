import { supabase } from "@/integrations/supabase/client";

// ============================================
// Types
// ============================================

export type CircleRequestStatus = "pending" | "accepted" | "declined";
export type TalentVisibilityScope = "off" | "circle_only" | "public";
export type BorrowScope = "internal" | "circle" | "local";

export interface CircleRequest {
  id: string;
  from_org_id: string;
  to_org_id: string;
  created_by: string;
  status: CircleRequestStatus;
  created_at: string;
  from_org_name?: string;
  to_org_name?: string;
}

export interface TrustedCircleLink {
  id: string;
  org_a: string;
  org_b: string;
  created_at: string;
  partner_org_id: string;
  partner_org_name: string;
}

// New simpler interface for circle partners from RPC
export interface CirclePartner {
  id: string;
  name: string;
  location: string | null;
}

// Circle group (for multi-circle feature)
export interface Circle {
  id: string;
  name: string;
  memberCount: number;
}

export interface CircleMember {
  id: string;
  name: string;
  location: string | null;
}

export interface TalentVisibility {
  talent_user_id: string;
  scope: TalentVisibilityScope;
  available_for_extra_hours: boolean;
  updated_at: string;
}

export interface ReleaseOffer {
  id: string;
  booking_id: string;
  from_org_id: string;
  status: "open" | "taken" | "cancelled";
  taken_by_org_id: string | null;
  created_at: string;
  // Joined data
  talent_name?: string;
  start_ts?: string;
  end_ts?: string;
  from_org_name?: string;
}

export interface AvailableTalent {
  user_id: string;
  full_name: string;
  legacy_score: number;
}

// ============================================
// Circle Requests
// ============================================

/**
 * List circle requests for current user's orgs
 */
export async function listCircleRequests(orgId: string): Promise<{
  incoming: CircleRequest[];
  outgoing: CircleRequest[];
  error: Error | null;
}> {
  // Get incoming requests (to our org)
  const { data: incoming, error: inError } = await supabase
    .from("circle_requests")
    .select(`
      *,
      from_org:orgs!circle_requests_from_org_id_fkey ( name )
    `)
    .eq("to_org_id", orgId)
    .order("created_at", { ascending: false });

  if (inError) {
    return { incoming: [], outgoing: [], error: new Error(inError.message) };
  }

  // Get outgoing requests (from our org)
  const { data: outgoing, error: outError } = await supabase
    .from("circle_requests")
    .select(`
      *,
      to_org:orgs!circle_requests_to_org_id_fkey ( name )
    `)
    .eq("from_org_id", orgId)
    .order("created_at", { ascending: false });

  if (outError) {
    return { incoming: [], outgoing: [], error: new Error(outError.message) };
  }

  const mappedIncoming: CircleRequest[] = (incoming ?? []).map((r) => ({
    id: r.id,
    from_org_id: r.from_org_id,
    to_org_id: r.to_org_id,
    created_by: r.created_by,
    status: r.status as CircleRequestStatus,
    created_at: r.created_at,
    from_org_name: (r.from_org as { name: string } | null)?.name ?? "Okänd",
  }));

  const mappedOutgoing: CircleRequest[] = (outgoing ?? []).map((r) => ({
    id: r.id,
    from_org_id: r.from_org_id,
    to_org_id: r.to_org_id,
    created_by: r.created_by,
    status: r.status as CircleRequestStatus,
    created_at: r.created_at,
    to_org_name: (r.to_org as { name: string } | null)?.name ?? "Okänd",
  }));

  return { incoming: mappedIncoming, outgoing: mappedOutgoing, error: null };
}

/**
 * Create a circle request
 */
export async function createCircleRequest(
  fromOrgId: string,
  toOrgId: string
): Promise<{ request: CircleRequest | null; error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { request: null, error: new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("circle_requests")
    .insert({
      from_org_id: fromOrgId,
      to_org_id: toOrgId,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { request: null, error: new Error(error.message) };
  }

  const request: CircleRequest = {
    id: data.id,
    from_org_id: data.from_org_id,
    to_org_id: data.to_org_id,
    created_by: data.created_by,
    status: data.status as CircleRequestStatus,
    created_at: data.created_at,
  };

  return { request, error: null };
}

/**
 * Accept a circle request (via RPC for race-safety)
 */
export async function acceptCircleRequest(requestId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc("accept_circle_request", {
    p_request_id: requestId,
  });

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  const result = data as unknown as { success: boolean; error?: string };
  if (!result.success) {
    return { success: false, error: new Error(result.error ?? "Unknown error") };
  }

  return { success: true, error: null };
}

/**
 * Decline a circle request
 */
export async function declineCircleRequest(requestId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  const { error } = await supabase
    .from("circle_requests")
    .update({ status: "declined" })
    .eq("id", requestId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

// ============================================
// Trusted Circle Links
// ============================================

/**
 * List trusted circle partners for an org (using SECURITY DEFINER RPC to bypass RLS)
 */
export async function listCirclePartners(orgId: string): Promise<{
  partners: CirclePartner[];
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc("get_circle_partners", {
    p_org_id: orgId,
  });

  if (error) {
    return { partners: [], error: new Error(error.message) };
  }

  // Map RPC result to CirclePartner interface
  const partners: CirclePartner[] = (data ?? []).map((p: { partner_org_id: string; partner_org_name: string; partner_location: string | null }) => ({
    id: p.partner_org_id,
    name: p.partner_org_name ?? "(namn saknas)",
    location: p.partner_location,
  }));

  // Dedupe by id as extra safety
  const uniquePartners = Array.from(
    new Map(partners.map((p) => [p.id, p])).values()
  );

  return { partners: uniquePartners, error: null };
}

/**
 * @deprecated Use listCirclePartners instead - kept for backward compatibility
 */
export async function listTrustedCircle(orgId: string): Promise<{
  partners: TrustedCircleLink[];
  error: Error | null;
}> {
  const { partners, error } = await listCirclePartners(orgId);
  
  if (error) {
    return { partners: [], error };
  }

  // Map to legacy format
  const legacyPartners: TrustedCircleLink[] = partners.map((p) => ({
    id: p.id, // Use partner_org_id as id for uniqueness
    org_a: "",
    org_b: "",
    created_at: "",
    partner_org_id: p.id,
    partner_org_name: p.name,
  }));

  return { partners: legacyPartners, error: null };
}

// ============================================
// Talent Visibility
// ============================================

/**
 * Get talent visibility settings
 */
export async function getMyVisibility(): Promise<{
  visibility: TalentVisibility | null;
  error: Error | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { visibility: null, error: new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("talent_visibility")
    .select("*")
    .eq("talent_user_id", user.id)
    .maybeSingle();

  if (error) {
    return { visibility: null, error: new Error(error.message) };
  }

  // Return defaults if no record exists
  if (!data) {
    return {
      visibility: {
        talent_user_id: user.id,
        scope: "public",
        available_for_extra_hours: false,
        updated_at: new Date().toISOString(),
      },
      error: null,
    };
  }

  return { visibility: data as TalentVisibility, error: null };
}

/**
 * Update talent visibility settings (via RPC)
 */
export async function updateMyVisibility(
  scope: TalentVisibilityScope,
  extraHours: boolean
): Promise<{ success: boolean; error: Error | null }> {
  const { data, error } = await supabase.rpc("toggle_talent_circle_visibility", {
    p_scope: scope,
    p_extra_hours: extraHours,
  });

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  const result = data as unknown as { success: boolean; error?: string };
  if (!result.success) {
    return { success: false, error: new Error(result.error ?? "Unknown error") };
  }

  return { success: true, error: null };
}

// ============================================
// Release Offers
// ============================================

/**
 * Create a release offer for a booking
 */
export async function createReleaseOffer(
  bookingId: string,
  fromOrgId: string
): Promise<{ offer: ReleaseOffer | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("release_offers")
    .insert({
      booking_id: bookingId,
      from_org_id: fromOrgId,
    })
    .select()
    .single();

  if (error) {
    return { offer: null, error: new Error(error.message) };
  }

  return { offer: data as ReleaseOffer, error: null };
}

/**
 * List open release offers from circle partners
 */
export async function listCircleReleaseOffers(orgId: string): Promise<{
  offers: ReleaseOffer[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("release_offers")
    .select(`
      *,
      booking:shift_bookings!release_offers_booking_id_fkey (
        start_ts,
        end_ts,
        talent_user_id
      ),
      from_org:orgs!release_offers_from_org_id_fkey ( name )
    `)
    .eq("status", "open")
    .neq("from_org_id", orgId);

  if (error) {
    return { offers: [], error: new Error(error.message) };
  }

  // Fetch talent names
  const talentIds = [...new Set((data ?? []).map((o) => (o.booking as { talent_user_id: string })?.talent_user_id).filter(Boolean))];
  
  let talentMap: Map<string, string> = new Map();
  if (talentIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", talentIds);
    
    talentMap = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name ?? "Anonym"]));
  }

  const offers: ReleaseOffer[] = (data ?? []).map((o) => {
    const booking = o.booking as { start_ts: string; end_ts: string; talent_user_id: string } | null;
    return {
      id: o.id,
      booking_id: o.booking_id,
      from_org_id: o.from_org_id,
      status: o.status as "open" | "taken" | "cancelled",
      taken_by_org_id: o.taken_by_org_id,
      created_at: o.created_at,
      start_ts: booking?.start_ts,
      end_ts: booking?.end_ts,
      talent_name: talentMap.get(booking?.talent_user_id ?? "") ?? "Anonym",
      from_org_name: (o.from_org as { name: string } | null)?.name ?? "Okänd",
    };
  });

  return { offers, error: null };
}

/**
 * Take a release offer (via RPC for race-safety)
 */
export async function takeReleaseOffer(offerId: string): Promise<{
  success: boolean;
  newBookingId?: string;
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc("take_release_offer", {
    p_offer_id: offerId,
  });

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  const result = data as unknown as { success: boolean; error?: string; new_booking_id?: string };
  if (!result.success) {
    return { success: false, error: new Error(result.error ?? "Unknown error") };
  }

  return { success: true, newBookingId: result.new_booking_id, error: null };
}

/**
 * Cancel a release offer
 */
export async function cancelReleaseOffer(offerId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  const { error } = await supabase
    .from("release_offers")
    .update({ status: "cancelled" })
    .eq("id", offerId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

// ============================================
// Multi-Circle Management
// ============================================

/**
 * List circles owned by an org
 */
export async function listMyCircles(orgId: string): Promise<{
  circles: Circle[];
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc("get_my_circles", { p_org_id: orgId });

  if (error) {
    return { circles: [], error: new Error(error.message) };
  }

  const circles: Circle[] = (data ?? []).map((c: { circle_id: string; name: string; member_count: number }) => ({
    id: c.circle_id,
    name: c.name,
    memberCount: Number(c.member_count),
  }));

  return { circles, error: null };
}

/**
 * Get members of a circle
 */
export async function getCircleMembers(circleId: string): Promise<{
  members: CircleMember[];
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc("get_circle_members", { p_circle_id: circleId });

  if (error) {
    return { members: [], error: new Error(error.message) };
  }

  const members: CircleMember[] = (data ?? []).map((m: { org_id: string; org_name: string; org_location: string | null }) => ({
    id: m.org_id,
    name: m.org_name,
    location: m.org_location,
  }));

  return { members, error: null };
}

/**
 * Create a new circle
 */
export async function createCircle(orgId: string, name: string): Promise<{
  circleId: string | null;
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc("create_circle", { p_org_id: orgId, p_name: name });

  if (error) {
    return { circleId: null, error: new Error(error.message) };
  }

  return { circleId: data as string, error: null };
}

/**
 * Add a member to a circle
 */
export async function addCircleMember(circleId: string, memberOrgId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  const { error } = await supabase.rpc("add_circle_member", { p_circle_id: circleId, p_member_org_id: memberOrgId });

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

/**
 * Remove a member from a circle
 */
export async function removeCircleMember(circleId: string, memberOrgId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  const { error } = await supabase.rpc("remove_circle_member", { p_circle_id: circleId, p_member_org_id: memberOrgId });

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

// ============================================
// Scoped Talent Search
// ============================================

/**
 * Find available talents with scope filtering (now supports circle_id)
 */
export async function findAvailableTalentsScoped(
  location: string,
  startTs: string,
  endTs: string,
  scope: BorrowScope,
  requesterOrgId: string,
  circleId?: string
): Promise<{ talents: AvailableTalent[]; error: Error | null }> {
  const { data, error } = await supabase.rpc("find_available_talents_scoped", {
    p_location: location,
    p_start_ts: startTs,
    p_end_ts: endTs,
    p_scope: scope,
    p_requester_org_id: requesterOrgId,
    p_circle_id: circleId ?? null,
  });

  if (error) {
    return { talents: [], error: new Error(error.message) };
  }

  return { talents: data as AvailableTalent[], error: null };
}

/**
 * Get count of available talents per scope (for layer tabs)
 */
export async function getAvailableTalentCounts(
  location: string,
  startTs: string,
  endTs: string,
  requesterOrgId: string,
  circleId?: string
): Promise<{
  internal: number;
  circle: number;
  local: number;
  error: Error | null;
}> {
  const scopes: BorrowScope[] = ["internal", "circle", "local"];
  const counts = { internal: 0, circle: 0, local: 0 };

  for (const scope of scopes) {
    const { talents, error } = await findAvailableTalentsScoped(
      location,
      startTs,
      endTs,
      scope,
      requesterOrgId,
      scope === "circle" ? circleId : undefined
    );
    if (error) {
      return { ...counts, error };
    }
    counts[scope] = talents.length;
  }

  return { ...counts, error: null };
}
