import { supabase } from "@/integrations/supabase/client";

export interface CandidateCardDTO {
  type: "real" | "demo_card";
  user_id?: string;
  demo_card_id?: string;
  full_name: string | null;
  legacy_score_cached: number | null;
  badges: Array<{ badge_key: string; label: string | null; verified: boolean | null }>;
  availability_snippet: string;
  video_thumbnail_url: string | null;
  video_playback_id: string | null;
  has_video: boolean;
  location?: string | null;
  role_key?: string | null;
  skills?: string[];
  housing_needed?: boolean;
}

export interface DemoTalentCard {
  id: string;
  name: string;
  location: string;
  role_key: string;
  skills: string[];
  legacy_score: number;
  housing_needed: boolean;
  available_for_extra_hours: boolean;
  video_url: string | null;
  is_demo: boolean;
  created_at: string;
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
      type: "real" as const,
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
 * Fetch demo talent cards from the demo_talent_cards table
 * These are synthetic cards not tied to auth.users
 */
export async function listDemoTalentCards(
  orgId: string,
  jobId: string | null,
  limit: number = 6
): Promise<{
  cards: CandidateCardDTO[];
  error: Error | null;
}> {
  console.log("[listDemoTalentCards] Fetching demo cards, limit:", limit);

  // Get already swiped demo card IDs for this org/job using raw query
  // Note: We use explicit typing since these tables may not be in generated types yet
  const swipeQuery = supabase
    .from("employer_demo_talent_swipes" as any)
    .select("demo_card_id")
    .eq("org_id", orgId);
  
  if (jobId) {
    swipeQuery.eq("job_post_id", jobId);
  }

  const { data: existingSwipes, error: swipeError } = await swipeQuery;

  if (swipeError) {
    console.error("[listDemoTalentCards] Swipe query error:", swipeError);
    return { cards: [], error: new Error(swipeError.message) };
  }

  const swipedCardIds = ((existingSwipes ?? []) as unknown as Array<{ demo_card_id: string }>).map((s) => s.demo_card_id);
  console.log("[listDemoTalentCards] Already swiped cards:", swipedCardIds.length);

  // Fetch demo cards that haven't been swiped
  let cardQuery = supabase
    .from("demo_talent_cards" as any)
    .select("*")
    .eq("is_demo", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (swipedCardIds.length > 0) {
    cardQuery = cardQuery.not("id", "in", `(${swipedCardIds.join(",")})`);
  }

  const { data: demoCards, error: cardError } = await cardQuery;

  if (cardError) {
    console.error("[listDemoTalentCards] Card query error:", cardError);
    return { cards: [], error: new Error(cardError.message) };
  }

  console.log("[listDemoTalentCards] Found demo cards:", demoCards?.length ?? 0);

  // Convert to CandidateCardDTO format
  const typedCards = (demoCards ?? []) as unknown as DemoTalentCard[];
  const cards: CandidateCardDTO[] = typedCards.map((card) => ({
    type: "demo_card" as const,
    demo_card_id: card.id,
    full_name: card.name,
    legacy_score_cached: card.legacy_score,
    badges: (card.skills ?? []).map((skill: string) => ({
      badge_key: skill.toLowerCase().replace(/\s+/g, "-"),
      label: skill,
      verified: true,
    })),
    availability_snippet: card.available_for_extra_hours ? "Flexibel" : "Begränsad",
    video_thumbnail_url: card.video_url ?? null,
    video_playback_id: null,
    has_video: !!card.video_url,
    location: card.location,
    role_key: card.role_key,
    skills: card.skills ?? [],
    housing_needed: card.housing_needed,
  }));

  return { cards, error: null };
}

/**
 * HARD demo fetch for talents - combines real demo talents + demo cards
 * This should NEVER return 0 talents if demo talents or cards exist
 */
export async function listDemoTalentsHard(
  orgId: string,
  jobId: string | null,
  limit: number = 6
): Promise<{
  talents: CandidateCardDTO[];
  error: Error | null;
}> {
  console.log("[listDemoTalentsHard] Fetching with orgId:", orgId, "jobId:", jobId);
  
  const allTalents: CandidateCardDTO[] = [];
  let lastError: Error | null = null;

  // 1. Try to get real demo talents first
  const { data: demoProfiles, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, full_name, home_base, is_demo, created_at")
    .eq("is_demo", true)
    .eq("type", "talent")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (profileError) {
    console.warn("[listDemoTalentsHard] Profile query error:", profileError);
    lastError = new Error(profileError.message);
  } else if (demoProfiles && demoProfiles.length > 0) {
    const userIds = demoProfiles.map(p => p.user_id);

    // Get talent_profiles for scores
    const { data: talentProfiles } = await supabase
      .from("talent_profiles")
      .select("user_id, legacy_score_cached, desired_roles")
      .in("user_id", userIds);

    // Get badges
    const { data: badges } = await supabase
      .from("talent_badges")
      .select("user_id, badge_key, label, verified")
      .in("user_id", userIds);

    // Build maps
    const talentProfileMap = new Map(talentProfiles?.map(p => [p.user_id, p]) ?? []);
    const badgeMap = new Map<string, typeof badges>();
    badges?.forEach(b => {
      const existing = badgeMap.get(b.user_id) ?? [];
      existing.push(b);
      badgeMap.set(b.user_id, existing);
    });

    // Build DTOs for real talents
    demoProfiles.forEach(profile => {
      const talentProfile = talentProfileMap.get(profile.user_id);
      const userBadges = badgeMap.get(profile.user_id) ?? [];

      allTalents.push({
        type: "real",
        user_id: profile.user_id,
        full_name: profile.full_name ?? null,
        legacy_score_cached: talentProfile?.legacy_score_cached ?? 50,
        badges: userBadges.map(b => ({
          badge_key: b.badge_key,
          label: b.label,
          verified: b.verified,
        })),
        availability_snippet: "Demo",
        video_thumbnail_url: null,
        video_playback_id: null,
        has_video: false,
        location: profile.home_base,
      });
    });
  }

  console.log("[listDemoTalentsHard] Real demo talents found:", allTalents.length);

  // 2. If we don't have enough, fill with demo cards
  if (allTalents.length < limit) {
    const remaining = limit - allTalents.length;
    const { cards, error: cardError } = await listDemoTalentCards(orgId, jobId, remaining);
    
    if (cardError) {
      console.warn("[listDemoTalentsHard] Demo cards error:", cardError);
      if (!lastError) lastError = cardError;
    } else {
      allTalents.push(...cards);
    }
  }

  console.log("[listDemoTalentsHard] Total talents after cards:", allTalents.length);

  return { talents: allTalents, error: lastError };
}

/**
 * Record employer swipe on a talent (idempotent upsert)
 * Handles both real talents and demo cards
 */
export async function upsertEmployerTalentSwipe(params: {
  orgId: string;
  jobId: string;
  talentUserId?: string;
  demoCardId?: string;
  type?: "real" | "demo_card";
  direction: "yes" | "no";
}): Promise<{ error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error("Not authenticated") };
  }

  // Determine type if not provided (backwards compatibility)
  const swipeType = params.type ?? (params.demoCardId ? "demo_card" : "real");

  if (swipeType === "demo_card" && params.demoCardId) {
    // Insert into demo card swipes table
    const { error } = await supabase
      .from("employer_demo_talent_swipes" as any)
      .upsert(
        {
          org_id: params.orgId,
          job_post_id: params.jobId,
          demo_card_id: params.demoCardId,
          swiper_user_id: user.id,
          direction: params.direction,
        },
        { onConflict: "org_id,job_post_id,demo_card_id" }
      );

    return { error: error ? new Error(error.message) : null };
  }

  if (swipeType === "real" && params.talentUserId) {
    // Insert into real talent swipes table
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

  return { error: new Error("Invalid swipe parameters") };
}
