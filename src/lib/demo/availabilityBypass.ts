/**
 * Demo-only availability bypass
 *
 * In demo mode we never want date/availability filters to hide demo jobs,
 * because that would make the demo feel empty and confuse new users.
 *
 * CRITICAL SAFETY INVARIANT:
 * When IS_LIVE_BACKEND is true, bypass is ALWAYS false — regardless of
 * isDemoMode, IS_DEMO_ENV, or any other flag. This prevents demo logic
 * from leaking into production queries.
 *
 * To disable the bypass in demo/test (e.g. when demo should respect dates),
 * set VITE_DEMO_BYPASS_AVAILABILITY=false in .env.
 */

import { IS_DEMO_ENV, IS_LIVE_BACKEND } from "@/lib/config/env";

/**
 * Returns true when date/availability filters should be skipped.
 * Only returns true in demo/test environments — NEVER on live backend.
 */
export function shouldBypassAvailabilityFilters(isDemoMode: boolean): boolean {
  // Hard guard: live backend → never bypass
  if (IS_LIVE_BACKEND) return false;

  // Env-level kill switch (defaults to enabled in demo)
  const envOverride = import.meta.env.VITE_DEMO_BYPASS_AVAILABILITY;
  if (envOverride === "false") return false;

  return isDemoMode || IS_DEMO_ENV;
}

/** UI label shown when the bypass is active */
export const DEMO_AVAILABILITY_BYPASS_LABEL =
  "Demo: Vi visar jobb oavsett valda datum så du kan testa flödet.";
