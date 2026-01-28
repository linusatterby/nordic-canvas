/**
 * Supabase environment variable checks
 * Used to prevent app crashes when env vars are missing
 */

export interface SupabaseEnvResult {
  url: string | undefined;
  anonKey: string | undefined;
  missing: string[];
}

/**
 * Get Supabase environment variables and list any missing ones
 */
export function getSupabaseEnv(): SupabaseEnvResult {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const missing: string[] = [];

  if (!url) missing.push("VITE_SUPABASE_URL");
  if (!anonKey) missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");

  return { url, anonKey, missing };
}

/**
 * Check if all required Supabase env vars are present
 */
export function hasSupabaseEnv(): boolean {
  return getSupabaseEnv().missing.length === 0;
}
