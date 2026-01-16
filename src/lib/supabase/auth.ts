import { supabase } from "@/integrations/supabase/client";
import type { AuthError, Session } from "@supabase/supabase-js";

export interface AuthResult {
  error: AuthError | null;
  session?: Session | null;
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  return { error, session: data?.session };
}

/**
 * Sign up with email and password
 */
export async function signUpWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  const redirectUrl = `${window.location.origin}/`;

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: redirectUrl,
    },
  });

  return { error, session: data?.session };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the current session
 */
export async function getSession(): Promise<{
  session: Session | null;
  error: AuthError | null;
}> {
  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session ?? null, error };
}
