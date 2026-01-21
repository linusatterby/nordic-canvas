import { supabase } from "@/integrations/supabase/client";

export interface DemoGuideSummary {
  hasSwiped: boolean;
  hasMatchThread: boolean;
  hasSentMessage: boolean;
  hasBorrowRequest: boolean;
  hasBorrowOffer: boolean;
  hasBooking: boolean;
  hasReleaseOffer: boolean;
  hasUpdatedProfile: boolean;
}

interface GetDemoGuideSummaryParams {
  orgId?: string | null;
  userId?: string | null;
  role: "employer" | "talent";
}

/**
 * Get demo guide progress summary based on actual data
 */
export async function getDemoGuideSummary(
  params: GetDemoGuideSummaryParams
): Promise<{ summary: DemoGuideSummary; error: Error | null }> {
  const { orgId, userId, role } = params;

  const defaultSummary: DemoGuideSummary = {
    hasSwiped: false,
    hasMatchThread: false,
    hasSentMessage: false,
    hasBorrowRequest: false,
    hasBorrowOffer: false,
    hasBooking: false,
    hasReleaseOffer: false,
    hasUpdatedProfile: false,
  };

  try {
    if (role === "employer" && orgId) {
      // Check employer swipes (real + demo)
      const [realSwipes, demoSwipes] = await Promise.all([
        supabase
          .from("employer_talent_swipes")
          .select("org_id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .limit(1),
        supabase
          .from("employer_demo_talent_swipes")
          .select("org_id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .limit(1),
      ]);
      defaultSummary.hasSwiped = (realSwipes.count ?? 0) > 0 || (demoSwipes.count ?? 0) > 0;

      // Check matches (real + demo)
      const [realMatches, demoMatches] = await Promise.all([
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .limit(1),
        supabase
          .from("demo_matches")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .limit(1),
      ]);
      defaultSummary.hasMatchThread = (realMatches.count ?? 0) > 0 || (demoMatches.count ?? 0) > 0;

      // Check messages (via demo threads for org)
      const { data: demoThreads } = await supabase
        .from("demo_chat_threads")
        .select("id")
        .eq("org_id", orgId)
        .limit(10);
      
      if (demoThreads && demoThreads.length > 0) {
        const threadIds = demoThreads.map((t) => t.id);
        const { count: demoMsgCount } = await supabase
          .from("demo_chat_messages")
          .select("id", { count: "exact", head: true })
          .in("thread_id", threadIds)
          .eq("sender_type", "org")
          .limit(1);
        
        if ((demoMsgCount ?? 0) > 0) {
          defaultSummary.hasSentMessage = true;
        }
      }

      // Also check real messages via real threads/matches
      if (!defaultSummary.hasSentMessage && userId) {
        const { count: realMsgCount } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("sender_user_id", userId)
          .limit(1);
        defaultSummary.hasSentMessage = (realMsgCount ?? 0) > 0;
      }

      // Check borrow requests
      const { count: borrowReqCount } = await supabase
        .from("borrow_requests")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .limit(1);
      defaultSummary.hasBorrowRequest = (borrowReqCount ?? 0) > 0;

      // Check bookings (real + demo)
      const [realBookings, demoBookings] = await Promise.all([
        supabase
          .from("shift_bookings")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .limit(1),
        supabase
          .from("demo_shift_bookings")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .limit(1),
      ]);
      defaultSummary.hasBooking = (realBookings.count ?? 0) > 0 || (demoBookings.count ?? 0) > 0;

      // Check release offers (real + demo)
      const [realReleases, demoReleases] = await Promise.all([
        supabase
          .from("release_offers")
          .select("id", { count: "exact", head: true })
          .eq("from_org_id", orgId)
          .limit(1),
        supabase
          .from("demo_release_offers")
          .select("id", { count: "exact", head: true })
          .eq("from_org_id", orgId)
          .limit(1),
      ]);
      defaultSummary.hasReleaseOffer = (realReleases.count ?? 0) > 0 || (demoReleases.count ?? 0) > 0;
    }

    if (role === "talent" && userId) {
      // Check talent swipes
      const { count: swipeCount } = await supabase
        .from("talent_job_swipes")
        .select("job_post_id", { count: "exact", head: true })
        .eq("talent_user_id", userId)
        .limit(1);
      defaultSummary.hasSwiped = (swipeCount ?? 0) > 0;

      // Check matches
      const { count: matchCount } = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("talent_user_id", userId)
        .limit(1);
      defaultSummary.hasMatchThread = (matchCount ?? 0) > 0;

      // Check sent messages
      const { count: msgCount } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_user_id", userId)
        .limit(1);
      defaultSummary.hasSentMessage = (msgCount ?? 0) > 0;

      // Check borrow offers received
      const { count: offerCount } = await supabase
        .from("borrow_offers")
        .select("id", { count: "exact", head: true })
        .eq("talent_user_id", userId)
        .limit(1);
      defaultSummary.hasBorrowOffer = (offerCount ?? 0) > 0;

      // Check profile updates (talent_profiles with bio or desired_roles)
      const { data: profile } = await supabase
        .from("talent_profiles")
        .select("bio, desired_roles")
        .eq("user_id", userId)
        .maybeSingle();
      
      defaultSummary.hasUpdatedProfile = !!(
        profile?.bio || 
        (profile?.desired_roles && profile.desired_roles.length > 0)
      );
    }

    return { summary: defaultSummary, error: null };
  } catch (err) {
    console.error("[getDemoGuideSummary] Error:", err);
    return { summary: defaultSummary, error: err as Error };
  }
}
