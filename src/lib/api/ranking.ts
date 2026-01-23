import { supabase } from "@/integrations/supabase/client";

/**
 * Match score result from scoring RPCs
 */
export interface MatchScore {
  score: number;
  reasons: MatchReason[];
  error?: string;
}

export interface MatchReason {
  key: string;
  label: string;
  impact: number;
}

/**
 * Scored listing with match info attached
 */
export interface ScoredListing {
  listing_id: string;
  score: number;
  reasons: MatchReason[];
}

/**
 * Scored candidate with match info attached
 */
export interface ScoredCandidate {
  candidate_id: string;
  candidate_type: "real" | "demo_card";
  score: number;
  reasons: MatchReason[];
}

/**
 * Interaction action types
 */
export type ListingInteractionAction = 
  | "view" 
  | "swipe_yes" 
  | "swipe_no" 
  | "open" 
  | "chat_started" 
  | "applied" 
  | "saved";

export type CandidateInteractionAction = 
  | "view" 
  | "swipe_yes" 
  | "swipe_no" 
  | "open_profile" 
  | "chat_started" 
  | "booked";

/**
 * Get match weights for scoring (with priority cascade)
 */
export async function getMatchWeights(
  orgId?: string,
  location?: string
): Promise<{ weights: Record<string, number> | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc("get_match_weights", {
      p_org_id: orgId || null,
      p_location: location || null,
    });

    if (error) throw error;
    return { weights: data as Record<string, number>, error: null };
  } catch (err) {
    console.error("[getMatchWeights] Error:", err);
    return { weights: null, error: err as Error };
  }
}

/**
 * Score a single listing for a talent
 */
export async function scoreListingForTalent(
  talentUserId: string,
  listingId: string
): Promise<{ score: MatchScore | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc("score_listing_for_talent", {
      p_talent_user_id: talentUserId,
      p_listing_id: listingId,
    });

    if (error) throw error;

    const result = data as unknown as { score: number; reasons: MatchReason[]; error?: string };
    return { 
      score: {
        score: result?.score ?? 0,
        reasons: result?.reasons || [],
        error: result?.error,
      }, 
      error: null 
    };
  } catch (err) {
    console.error("[scoreListingForTalent] Error:", err);
    return { score: null, error: err as Error };
  }
}

/**
 * Batch score multiple listings for a talent (efficient single RPC)
 */
export async function scoreListingsForTalent(
  talentUserId: string,
  listingIds: string[]
): Promise<{ scores: ScoredListing[]; error: Error | null }> {
  if (listingIds.length === 0) {
    return { scores: [], error: null };
  }

  try {
    const { data, error } = await supabase.rpc("score_listings_for_talent", {
      p_talent_user_id: talentUserId,
      p_listing_ids: listingIds,
    });

    if (error) throw error;

    const scores: ScoredListing[] = (data as any[] || []).map((row) => ({
      listing_id: row.listing_id,
      score: row.score,
      reasons: row.reasons || [],
    }));

    return { scores, error: null };
  } catch (err) {
    console.error("[scoreListingsForTalent] Error:", err);
    return { scores: [], error: err as Error };
  }
}

/**
 * Score a single candidate for a job
 */
export async function scoreCandidateForJob(
  orgId: string,
  jobPostId: string,
  talentUserId?: string,
  demoCardId?: string
): Promise<{ score: MatchScore | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc("score_candidate_for_job", {
      p_org_id: orgId,
      p_job_post_id: jobPostId,
      p_talent_user_id: talentUserId || null,
      p_demo_card_id: demoCardId || null,
    });

    if (error) throw error;

    const result = data as unknown as { score: number; reasons: MatchReason[]; error?: string };
    return { 
      score: {
        score: result?.score ?? 0,
        reasons: result?.reasons || [],
        error: result?.error,
      }, 
      error: null 
    };
  } catch (err) {
    console.error("[scoreCandidateForJob] Error:", err);
    return { score: null, error: err as Error };
  }
}

/**
 * Batch score multiple candidates for a job (efficient single RPC)
 */
export async function scoreCandidatesForJob(
  orgId: string,
  jobPostId: string,
  talentUserIds: string[],
  demoCardIds: string[]
): Promise<{ scores: ScoredCandidate[]; error: Error | null }> {
  if (talentUserIds.length === 0 && demoCardIds.length === 0) {
    return { scores: [], error: null };
  }

  try {
    const { data, error } = await supabase.rpc("score_candidates_for_job", {
      p_org_id: orgId,
      p_job_post_id: jobPostId,
      p_talent_user_ids: talentUserIds.length > 0 ? talentUserIds : null,
      p_demo_card_ids: demoCardIds.length > 0 ? demoCardIds : null,
    });

    if (error) throw error;

    const scores: ScoredCandidate[] = (data as any[] || []).map((row) => ({
      candidate_id: row.candidate_id,
      candidate_type: row.candidate_type as "real" | "demo_card",
      score: row.score,
      reasons: row.reasons || [],
    }));

    return { scores, error: null };
  } catch (err) {
    console.error("[scoreCandidatesForJob] Error:", err);
    return { scores: [], error: err as Error };
  }
}

/**
 * Log a listing interaction (talent viewing/swiping listings)
 */
export async function logListingInteraction(
  listingId: string,
  action: ListingInteractionAction
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc("log_listing_interaction", {
      p_listing_id: listingId,
      p_action: action,
    });

    if (error) throw error;
    return { success: data !== null, error: null };
  } catch (err) {
    // Non-blocking - log but don't fail
    console.warn("[logListingInteraction] Error (non-blocking):", err);
    return { success: false, error: err as Error };
  }
}

/**
 * Log a candidate interaction (employer viewing/swiping candidates)
 */
export async function logCandidateInteraction(
  orgId: string,
  jobPostId: string,
  talentUserId: string | undefined,
  demoCardId: string | undefined,
  action: CandidateInteractionAction
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc("log_candidate_interaction", {
      p_org_id: orgId,
      p_job_post_id: jobPostId,
      p_talent_user_id: talentUserId || null,
      p_demo_card_id: demoCardId || null,
      p_action: action,
    });

    if (error) throw error;
    return { success: data !== null, error: null };
  } catch (err) {
    // Non-blocking - log but don't fail
    console.warn("[logCandidateInteraction] Error (non-blocking):", err);
    return { success: false, error: err as Error };
  }
}

/**
 * Sort items by match score (descending)
 */
export function sortByScore<T extends { match_score?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
}

/**
 * Get human-readable reason labels (already localized in DB, but fallback here)
 */
export function getReasonLabel(key: string): string {
  const labels: Record<string, string> = {
    availability: "Passar din tillgänglighet",
    skills: "Matchar dina styrkor",
    housing: "Boende erbjuds",
    legacy: "Hög rating",
    recency: "Nyligen publicerat",
    affinity: "Liknar tidigare val",
    location: "Bor nära",
    extra_hours: "Öppen för extratimmar",
    circle: "I ditt nätverk",
  };
  return labels[key] || key;
}
