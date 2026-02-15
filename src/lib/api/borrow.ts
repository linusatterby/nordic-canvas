import { supabase } from "@/integrations/supabase/client";

export interface BorrowRequest {
  id: string;
  org_id: string;
  created_by: string;
  location: string;
  role_key: string;
  start_ts: string;
  end_ts: string;
  message: string | null;
  status: string;
  created_at: string;
}

export interface BorrowOffer {
  id: string;
  borrow_request_id: string;
  talent_user_id: string;
  status: string;
  responded_at: string | null;
  created_at: string;
  demo_session_id: string | null;
}

export interface BorrowRequestWithOffers extends BorrowRequest {
  offers: BorrowOfferWithTalent[];
  accepted_talent_name?: string | null;
}

export interface BorrowOfferWithTalent extends BorrowOffer {
  talent_name: string | null;
  legacy_score: number | null;
}

export interface BorrowOfferWithRequest extends BorrowOffer {
  request: BorrowRequest;
  org_name: string;
}

export interface AvailableTalent {
  user_id: string;
  full_name: string | null;
  legacy_score: number;
}

export type BorrowScope = "internal" | "circle" | "local";

/**
 * Create a new borrow request with scope and optional circle_id
 */
export async function createBorrowRequest(
  orgId: string,
  payload: {
    location: string;
    role_key: string;
    start_ts: string;
    end_ts: string;
    message?: string;
    scope?: BorrowScope;
    circle_id?: string | null;
  }
): Promise<{ request: BorrowRequest | null; error: Error | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { request: null, error: new Error("Not authenticated") };
  }

  const scope = payload.scope ?? "local";
  // Only include circle_id when scope is 'circle', otherwise must be null for CHECK constraint
  const circleId = scope === "circle" ? payload.circle_id ?? null : null;

  const { data, error } = await supabase
    .from("borrow_requests")
    .insert({
      org_id: orgId,
      created_by: user.id,
      location: payload.location,
      role_key: payload.role_key,
      start_ts: payload.start_ts,
      end_ts: payload.end_ts,
      message: payload.message || null,
      scope,
      circle_id: circleId,
    })
    .select()
    .single();

  if (error) {
    return { request: null, error: new Error(error.message) };
  }

  return { request: data, error: null };
}

/**
 * Find available talents for a borrow request using the SQL function (with scope support)
 */
export async function findAvailableTalents(
  location: string,
  startTs: string,
  endTs: string,
  scope?: BorrowScope,
  requesterOrgId?: string,
  circleId?: string | null
): Promise<{ talents: AvailableTalent[]; error: Error | null }> {
  // Use scoped version if we have scope and org
  if (scope && requesterOrgId) {
    const { data, error } = await supabase.rpc("find_available_talents_scoped", {
      p_location: location,
      p_start_ts: startTs,
      p_end_ts: endTs,
      p_scope: scope,
      p_requester_org_id: requesterOrgId,
      p_circle_id: scope === "circle" ? circleId ?? null : null,
    });

    if (error) {
      return { talents: [], error: new Error(error.message) };
    }

    return { talents: data ?? [], error: null };
  }

  // Legacy: use basic function
  const { data, error } = await supabase.rpc("find_available_talents", {
    p_location: location,
    p_start_ts: startTs,
    p_end_ts: endTs,
  });

  if (error) {
    return { talents: [], error: new Error(error.message) };
  }

  return { talents: data ?? [], error: null };
}

/**
 * Create offers for available talents
 */
export async function createOffersForTalents(
  borrowRequestId: string,
  talentUserIds: string[]
): Promise<{ count: number; error: Error | null }> {
  if (talentUserIds.length === 0) {
    return { count: 0, error: null };
  }

  const offers = talentUserIds.map((talentUserId) => ({
    borrow_request_id: borrowRequestId,
    talent_user_id: talentUserId,
    status: "pending",
  }));

  const { error } = await supabase.from("borrow_offers").upsert(offers, {
    onConflict: "borrow_request_id,talent_user_id",
    ignoreDuplicates: true,
  });

  if (error) {
    return { count: 0, error: new Error(error.message) };
  }

  return { count: talentUserIds.length, error: null };
}

/**
 * Compute and create offers for a borrow request
 * This is the main flow: find talents based on scope, create offers
 */
export async function computeAndCreateOffers(
  request: BorrowRequest & { scope?: string; circle_id?: string | null }
): Promise<{ count: number; error: Error | null }> {
  const scope = (request.scope as BorrowScope) ?? "local";
  const circleId = request.circle_id ?? null;
  
  const { talents, error: findError } = await findAvailableTalents(
    request.location,
    request.start_ts,
    request.end_ts,
    scope,
    request.org_id,
    circleId
  );

  if (findError) {
    return { count: 0, error: findError };
  }

  const talentIds = talents.map((t) => t.user_id);
  return createOffersForTalents(request.id, talentIds);
}

/**
 * List borrow requests for an org (employer view)
 */
export async function listOrgBorrowRequests(
  orgId: string
): Promise<{ requests: BorrowRequestWithOffers[]; error: Error | null }> {
  const { data: requests, error: reqError } = await supabase
    .from("borrow_requests")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (reqError) {
    return { requests: [], error: new Error(reqError.message) };
  }

  if (!requests || requests.length === 0) {
    return { requests: [], error: null };
  }

  // Get all offers for these requests
  const requestIds = requests.map((r) => r.id);
  const { data: offers } = await supabase
    .from("borrow_offers")
    .select("*")
    .in("borrow_request_id", requestIds);

  // Get talent names for offers
  const talentIds = [...new Set((offers ?? []).map((o) => o.talent_user_id))];
  let talentMap = new Map<string, { name: string | null; score: number | null }>();

  if (talentIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", talentIds);

    const { data: talentProfiles } = await supabase
      .from("talent_profiles")
      .select("user_id, legacy_score_cached")
      .in("user_id", talentIds);

    const scoreMap = new Map<string, number | null>();
    talentProfiles?.forEach((tp) => {
      scoreMap.set(tp.user_id, tp.legacy_score_cached);
    });

    profiles?.forEach((p) => {
      talentMap.set(p.user_id, {
        name: p.full_name,
        score: scoreMap.get(p.user_id) ?? null,
      });
    });
  }

  // Map offers to requests
  const offersMap = new Map<string, BorrowOfferWithTalent[]>();
  (offers ?? []).forEach((o) => {
    const info = talentMap.get(o.talent_user_id);
    const enriched: BorrowOfferWithTalent = {
      ...o,
      talent_name: info?.name ?? null,
      legacy_score: info?.score ?? null,
    };
    const existing = offersMap.get(o.borrow_request_id) ?? [];
    existing.push(enriched);
    offersMap.set(o.borrow_request_id, existing);
  });

  const result: BorrowRequestWithOffers[] = requests.map((r) => {
    const reqOffers = offersMap.get(r.id) ?? [];
    const accepted = reqOffers.find((o) => o.status === "accepted");
    return {
      ...r,
      offers: reqOffers,
      accepted_talent_name: accepted?.talent_name ?? null,
    };
  });

  return { requests: result, error: null };
}

/**
 * List pending borrow offers for a talent
 */
export async function listTalentBorrowOffers(): Promise<{
  offers: BorrowOfferWithRequest[];
  error: Error | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { offers: [], error: new Error("Not authenticated") };
  }

  // Get offers for this talent
  const { data: offers, error: offersError } = await supabase
    .from("borrow_offers")
    .select("*")
    .eq("talent_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (offersError) {
    return { offers: [], error: new Error(offersError.message) };
  }

  if (!offers || offers.length === 0) {
    return { offers: [], error: null };
  }

  // Get request details
  const requestIds = offers.map((o) => o.borrow_request_id);
  const { data: requests } = await supabase
    .from("borrow_requests")
    .select("*")
    .in("id", requestIds);

  // Get org names
  const orgIds = [...new Set((requests ?? []).map((r) => r.org_id))];
  let orgMap = new Map<string, string>();

  if (orgIds.length > 0) {
    const { data: orgs } = await supabase
      .from("orgs")
      .select("id, name")
      .in("id", orgIds);

    orgs?.forEach((o) => {
      orgMap.set(o.id, o.name);
    });
  }

  const requestMap = new Map<string, BorrowRequest>();
  (requests ?? []).forEach((r) => {
    requestMap.set(r.id, r);
  });

  const result: BorrowOfferWithRequest[] = offers
    .map((o) => {
      const req = requestMap.get(o.borrow_request_id);
      if (!req) return null;
      return {
        ...o,
        request: req,
        org_name: orgMap.get(req.org_id) ?? "Okänd organisation",
      };
    })
    .filter((o): o is BorrowOfferWithRequest => o !== null);

  return { offers: result, error: null };
}

/**
 * Accept a borrow offer using the atomic RPC function
 */
export async function acceptBorrowOffer(
  offerId: string
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  const { data, error } = await supabase.rpc("accept_borrow_offer", {
    p_offer_id: offerId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; booking_id?: string; error?: string };
  return {
    success: result.success,
    bookingId: result.booking_id,
    error: result.error,
  };
}

/**
 * Decline a borrow offer
 */
export async function declineBorrowOffer(
  offerId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase
    .from("borrow_offers")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", offerId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

/**
 * Close a borrow request manually
 */
export async function closeBorrowRequest(
  requestId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase
    .from("borrow_requests")
    .update({ status: "closed" })
    .eq("id", requestId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}
