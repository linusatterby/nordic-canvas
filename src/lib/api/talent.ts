import { supabase } from "@/integrations/supabase/client";

export interface CandidateCardDTO {
  user_id: string;
  full_name: string | null;
  legacy_score_cached: number | null;
  badges: Array<{ badge_key: string; label: string | null; verified: boolean | null }>;
  availability_snippet: string;
  video_thumbnail_url: string | null;
  video_playback_id: string | null;
  has_video: boolean;
}

/**
 * List talents for a specific job who haven't been swiped by employer yet
 * Requires the user to be an org member
 */
export async function listTalentsForJob(
  jobId: string,
  orgId: string
): Promise<{
  talents: CandidateCardDTO[];
  error: Error | null;
}> {
  // Get already swiped talent_user_ids for this job by this org
  const { data: existingSwipes, error: swipeError } = await supabase
    .from("employer_talent_swipes")
    .select("talent_user_id")
    .eq("job_post_id", jobId)
    .eq("org_id", orgId);

  if (swipeError) {
    return { talents: [], error: new Error(swipeError.message) };
  }

  const swipedTalentIds = (existingSwipes ?? []).map((s) => s.talent_user_id);

  // Get job to find requirements
  const { data: job, error: jobError } = await supabase
    .from("job_posts")
    .select("start_date, end_date, required_badges")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return { talents: [], error: new Error(jobError?.message ?? "Job not found") };
  }

  // Get talents who swiped YES on this job
  const { data: yesSwipes, error: yesError } = await supabase
    .from("talent_job_swipes")
    .select("talent_user_id")
    .eq("job_post_id", jobId)
    .eq("direction", "yes");

  if (yesError) {
    return { talents: [], error: new Error(yesError.message) };
  }

  let interestedTalentIds = (yesSwipes ?? []).map((s) => s.talent_user_id);
  
  // Filter out already swiped
  interestedTalentIds = interestedTalentIds.filter(
    (id) => !swipedTalentIds.includes(id)
  );

  if (interestedTalentIds.length === 0) {
    return { talents: [], error: null };
  }

  // Get talent profiles
  const { data: talentProfiles, error: profileError } = await supabase
    .from("talent_profiles")
    .select("user_id, legacy_score_cached")
    .in("user_id", interestedTalentIds);

  if (profileError) {
    return { talents: [], error: new Error(profileError.message) };
  }

  // Get profiles for names
  const { data: profiles, error: namesError } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", interestedTalentIds);

  if (namesError) {
    return { talents: [], error: new Error(namesError.message) };
  }

  // Get badges
  const { data: badges, error: badgesError } = await supabase
    .from("talent_badges")
    .select("user_id, badge_key, label, verified")
    .in("user_id", interestedTalentIds);

  if (badgesError) {
    return { talents: [], error: new Error(badgesError.message) };
  }

  // Get availability blocks
  const { data: availability, error: availError } = await supabase
    .from("availability_blocks")
    .select("user_id, start_date, end_date")
    .in("user_id", interestedTalentIds);

  if (availError) {
    return { talents: [], error: new Error(availError.message) };
  }

  // Get video pitches
  const { data: videos, error: videoError } = await supabase
    .from("video_pitches")
    .select("user_id, thumbnail_url, playback_id, status")
    .in("user_id", interestedTalentIds)
    .eq("status", "ready");

  if (videoError) {
    return { talents: [], error: new Error(videoError.message) };
  }

  // Build DTOs
  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));
  const talentProfileMap = new Map(talentProfiles?.map((p) => [p.user_id, p]));
  const badgeMap = new Map<string, typeof badges>();
  badges?.forEach((b) => {
    const existing = badgeMap.get(b.user_id) ?? [];
    existing.push(b);
    badgeMap.set(b.user_id, existing);
  });
  const availMap = new Map<string, typeof availability>();
  availability?.forEach((a) => {
    const existing = availMap.get(a.user_id) ?? [];
    existing.push(a);
    availMap.set(a.user_id, existing);
  });
  const videoMap = new Map(videos?.map((v) => [v.user_id, v]));

  const talents: CandidateCardDTO[] = interestedTalentIds.map((userId) => {
    const profile = profileMap.get(userId);
    const talentProfile = talentProfileMap.get(userId);
    const userBadges = badgeMap.get(userId) ?? [];
    const userAvail = availMap.get(userId) ?? [];
    const video = videoMap.get(userId);

    // Compute availability snippet
    let availabilitySnippet = "Ej angiven";
    if (userAvail.length > 0) {
      const sortedAvail = [...userAvail].sort(
        (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
      const first = sortedAvail[0];
      availabilitySnippet = `${first.start_date} - ${first.end_date}`;
      if (sortedAvail.length > 1) {
        availabilitySnippet += ` +${sortedAvail.length - 1} till`;
      }
    }

    return {
      user_id: userId,
      full_name: profile?.full_name ?? null,
      legacy_score_cached: talentProfile?.legacy_score_cached ?? 50,
      badges: userBadges.map((b) => ({
        badge_key: b.badge_key,
        label: b.label,
        verified: b.verified,
      })),
      availability_snippet: availabilitySnippet,
      video_thumbnail_url: video?.thumbnail_url ?? null,
      video_playback_id: video?.playback_id ?? null,
      has_video: !!video,
    };
  });

  return { talents, error: null };
}

/**
 * Record employer swipe on a talent (idempotent upsert)
 */
export async function upsertEmployerTalentSwipe(params: {
  orgId: string;
  jobId: string;
  talentUserId: string;
  direction: "yes" | "no";
}): Promise<{ error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error("Not authenticated") };
  }

  const { error } = await supabase
    .from("employer_talent_swipes")
    .upsert(
      {
        org_id: params.orgId,
        job_post_id: params.jobId,
        talent_user_id: params.talentUserId,
        swiper_user_id: user.id,
        direction: params.direction,
      },
      { onConflict: "org_id,job_post_id,talent_user_id" }
    );

  return { error: error ? new Error(error.message) : null };
}
