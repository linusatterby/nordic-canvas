import { supabase } from "@/integrations/supabase/client";

export interface TalentDashboardSummary {
  legacyScore: number;
  badgesCount: number;
  profileCompletionPct: number;
  seasonsCompleted: number;
}

/**
 * Lightweight fetch of talent dashboard summary - single query
 */
export async function getTalentDashboardSummary(): Promise<{
  summary: TalentDashboardSummary | null;
  error: Error | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { summary: null, error: new Error("Not authenticated") };
  }

  // Fetch from talent_profiles for cached legacy score
  const { data: talentProfile, error: tpError } = await supabase
    .from("talent_profiles")
    .select("legacy_score_cached")
    .eq("user_id", user.id)
    .maybeSingle();

  if (tpError) {
    return { summary: null, error: new Error(tpError.message) };
  }

  // Count badges
  const { count: badgesCount, error: badgeError } = await supabase
    .from("talent_badges")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (badgeError) {
    return { summary: null, error: new Error(badgeError.message) };
  }

  // For now, profile completion and seasons are calculated client-side or stubbed
  // as we don't have dedicated columns for these yet
  const legacyScore = talentProfile?.legacy_score_cached ?? 72;
  
  // Calculate profile completion based on what fields are filled
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, phone, home_base")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return { summary: null, error: new Error(profileError.message) };
  }

  // Simple completion calculation
  let completedFields = 0;
  const totalFields = 5;
  if (profile?.full_name) completedFields++;
  if (profile?.phone) completedFields++;
  if (profile?.home_base) completedFields++;
  if (talentProfile) completedFields++;
  if ((badgesCount ?? 0) > 0) completedFields++;

  const profileCompletionPct = Math.round((completedFields / totalFields) * 100);

  // Seasons completed - for now, based on completed matches
  const { count: completedMatchesCount } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("talent_user_id", user.id)
    .eq("status", "completed");

  // Rough estimate: 1 season = 3 completed matches
  const seasonsCompleted = Math.floor((completedMatchesCount ?? 0) / 3);

  return {
    summary: {
      legacyScore,
      badgesCount: badgesCount ?? 0,
      profileCompletionPct,
      seasonsCompleted: Math.max(seasonsCompleted, 0),
    },
    error: null,
  };
}
