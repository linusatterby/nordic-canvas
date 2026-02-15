/**
 * A Supabase client wrapper that injects the `x-demo-session` header
 * so RLS policies can scope rows to the current demo visitor.
 *
 * Usage: import { getDemoSupabase } from "@/lib/supabase/demoClient";
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Create a Supabase client scoped to a demo session.
 * The `x-demo-session` header is read by `get_demo_session_id()` in Postgres.
 */
export function getDemoSupabase(demoSessionId: string) {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        "x-demo-session": demoSessionId,
      },
    },
    auth: {
      persistSession: false, // demo visitors don't need auth persistence
      autoRefreshToken: false,
    },
  });
}
