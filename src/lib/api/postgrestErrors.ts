/**
 * PostgREST error detection & normalisation.
 *
 * Catches PGRST201 (ambiguous relationship / HTTP 300) and surfaces a
 * developer-friendly message in dev/test while keeping prod output generic.
 *
 * Includes a 5-second dedupe to avoid log/toast spam during retries.
 */

import { IS_DEV } from "@/lib/config/env";

export interface PostgrestAmbiguousError {
  kind: "ambiguous_relationship";
  message: string;
  hint: string;
}

export interface PostgrestGenericError {
  kind: "postgrest_error";
  message: string;
}

export type NormalisedPostgrestError =
  | PostgrestAmbiguousError
  | PostgrestGenericError
  | null;

/* ── Dedupe state ─────────────────────────────────────────────── */
const DEDUPE_WINDOW_MS = 5_000;
const recentLogs = new Map<string, number>();

function shouldLog(key: string): boolean {
  const now = Date.now();
  const last = recentLogs.get(key);
  if (last && now - last < DEDUPE_WINDOW_MS) return false;
  recentLogs.set(key, now);
  // Housekeeping: evict stale entries
  if (recentLogs.size > 50) {
    for (const [k, ts] of recentLogs) {
      if (now - ts > DEDUPE_WINDOW_MS) recentLogs.delete(k);
    }
  }
  return true;
}

/** Exposed for testing only */
export function _resetDedupeState(): void {
  recentLogs.clear();
}

/* ── Detection ────────────────────────────────────────────────── */

/**
 * Detect whether a Supabase error is the PGRST201 ambiguous relationship error.
 */
export function isPGRST201(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  if (e.code === "PGRST201") return true;
  // PostgREST sometimes returns HTTP 300 for ambiguous joins
  if (e.code === "300" || (typeof e.message === "string" && e.message.includes("PGRST201"))) return true;
  return false;
}

/* ── Normalisation ────────────────────────────────────────────── */

/**
 * Normalise a Supabase/PostgREST error into a typed object.
 * Returns null if `error` is falsy.
 */
export function normalisePostgrestError(error: unknown): NormalisedPostgrestError {
  if (!error) return null;

  if (isPGRST201(error)) {
    const msg =
      typeof (error as any).message === "string"
        ? (error as any).message
        : "Ambiguous relationship detected";

    return {
      kind: "ambiguous_relationship",
      message: msg,
      hint: 'Use an explicit FK hint in your .select(), e.g. orgs!job_posts_org_id_fkey ( name )',
    };
  }

  return {
    kind: "postgrest_error",
    message:
      typeof (error as any).message === "string"
        ? (error as any).message
        : "Unknown database error",
  };
}

/* ── Logging (with dedupe) ────────────────────────────────────── */

/**
 * Log a normalised PostgREST error.
 * In dev/test: console.error with hint (deduped per 5s window).
 * In prod: generic log only.
 */
export function handlePostgrestError(
  label: string,
  error: unknown
): Error {
  const norm = normalisePostgrestError(error);

  if (!norm) return new Error("Unknown error");

  const dedupeKey = `${norm.kind}:${norm.message}`;

  if (norm.kind === "ambiguous_relationship") {
    if ((IS_DEV || import.meta.env.MODE === "test") && shouldLog(dedupeKey)) {
      console.error(
        `[${label}] ⚠️ PGRST201 Ambiguous relationship!\n` +
          `  Message: ${norm.message}\n` +
          `  Fix: ${norm.hint}`
      );
    } else if (!IS_DEV && import.meta.env.MODE !== "test" && shouldLog(dedupeKey)) {
      console.error(`[${label}] Database query error`);
    }
    return new Error(
      IS_DEV
        ? `Dev: Ambiguous join (PGRST201) in ${label}. Se console.`
        : "Ett databasfel uppstod. Försök igen."
    );
  }

  if (shouldLog(dedupeKey)) {
    console.error(`[${label}] PostgREST error: ${norm.message}`);
  }
  return new Error(norm.message);
}
