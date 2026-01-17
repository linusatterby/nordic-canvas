import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"] & {
  is_demo?: boolean;
};
export type ProfileType = "talent" | "employer" | "both";

export interface ProfileUpdate {
  full_name?: string;
  phone?: string;
  home_base?: string;
  type?: ProfileType;
}

/**
 * Get the current user's profile
 */
export async function getMyProfile(): Promise<{
  profile: Profile | null;
  error: Error | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { profile: null, error: new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    profile: data,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Ensure the current user has a profile, creating one if missing
 * @param defaultType - Default profile type if creating new (default: 'talent')
 */
export async function ensureMyProfile(
  defaultType: ProfileType = "talent"
): Promise<{
  profile: Profile | null;
  error: Error | null;
  created: boolean;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { profile: null, error: new Error("Not authenticated"), created: false };
  }

  // First, try to get existing profile
  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return { profile: null, error: new Error(fetchError.message), created: false };
  }

  if (existingProfile) {
    return { profile: existingProfile, error: null, created: false };
  }

  // Create new profile
  const { data: newProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      type: defaultType,
      full_name: user.email?.split("@")[0] ?? null,
    })
    .select()
    .single();

  if (insertError) {
    return { profile: null, error: new Error(insertError.message), created: false };
  }

  return { profile: newProfile, error: null, created: true };
}

/**
 * Update the current user's profile
 */
export async function updateMyProfile(
  updates: ProfileUpdate
): Promise<{
  profile: Profile | null;
  error: Error | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { profile: null, error: new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", user.id)
    .select()
    .single();

  return {
    profile: data,
    error: error ? new Error(error.message) : null,
  };
}
