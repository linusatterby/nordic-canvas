import { supabase } from "@/integrations/supabase/client";

export interface JobPreferences {
  user_id: string;
  wants_permanent: boolean;
  wants_seasonal: boolean;
  wants_extra_shifts: boolean;
  permanent_earliest_start: string | null;
  seasonal_from: string | null;
  seasonal_to: string | null;
  extra_weekdays: string[];
  extra_timeblocks: string[];
  updated_at: string;
}

export type JobPreferencesUpdate = Omit<JobPreferences, "user_id" | "updated_at">;

export async function fetchMyJobPreferences(): Promise<JobPreferences | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("talent_job_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as JobPreferences | null;
}

export async function upsertJobPreferences(prefs: JobPreferencesUpdate): Promise<JobPreferences> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("talent_job_preferences")
    .upsert({ ...prefs, user_id: user.id }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as JobPreferences;
}
