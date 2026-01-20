import { supabase } from "@/integrations/supabase/client";

export type TalentVisibilityScope = "off" | "circle_only" | "public";

export interface VisibilitySummary {
  scope: TalentVisibilityScope;
  available_for_extra_hours: boolean;
}

/**
 * Lightweight fetch of visibility summary - only the fields needed for the dashboard card
 */
export async function getVisibilitySummary(): Promise<{
  summary: VisibilitySummary | null;
  error: Error | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { summary: null, error: new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("talent_visibility")
    .select("scope, available_for_extra_hours")
    .eq("talent_user_id", user.id)
    .maybeSingle();

  if (error) {
    return { summary: null, error: new Error(error.message) };
  }

  // Return defaults if no record exists
  if (!data) {
    return {
      summary: {
        scope: "public",
        available_for_extra_hours: false,
      },
      error: null,
    };
  }

  return {
    summary: {
      scope: data.scope as TalentVisibilityScope,
      available_for_extra_hours: data.available_for_extra_hours,
    },
    error: null,
  };
}

/**
 * Update visibility via RPC (reuses existing RPC)
 */
export async function updateVisibility(
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
