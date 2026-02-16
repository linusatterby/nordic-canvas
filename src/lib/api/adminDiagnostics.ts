import { supabase } from "@/integrations/supabase/client";
import { IS_LIVE_BACKEND } from "@/lib/config/env";

/**
 * Admin diagnostics API layer.
 * All Supabase calls for the diagnostics page live here.
 */

/** Ping the backend by checking auth session */
export async function pingBackend(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = performance.now();
  try {
    const { error } = await supabase.auth.getSession();
    const latencyMs = Math.round(performance.now() - start);
    if (error) {
      return { ok: false, latencyMs, error: error.message };
    }
    return { ok: true, latencyMs };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: false,
      latencyMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Invoke the seed-test edge function. Hard-blocked on live backend. */
export async function invokeSeedTest(): Promise<{
  ok: boolean;
  elapsedMs?: number;
  error?: string;
}> {
  if (IS_LIVE_BACKEND) {
    return { ok: false, error: "Seed är inaktiverat mot live backend" };
  }
  try {
    const { data, error } = await supabase.functions.invoke("seed-test");
    if (error) {
      return { ok: false, error: error.message };
    }
    if (data?.ok) {
      return { ok: true, elapsedMs: data.elapsed_ms };
    }
    return { ok: false, error: data?.error || "Okänt fel" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
