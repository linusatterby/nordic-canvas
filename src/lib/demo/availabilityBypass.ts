/**
 * Demo-only availability bypass
 *
 * In demo mode we never want date/availability filters to hide demo jobs,
 * because that would make the demo feel empty and confuse new users.
 *
 * This module exposes a single feature-flag helper that the API layer
 * checks before applying date-related WHERE clauses.
 *
 * To disable the bypass (e.g. when demo should respect dates), set
 * VITE_DEMO_BYPASS_AVAILABILITY=false in .env.
 */

import { IS_DEMO_ENV } from "@/lib/config/env";

/**
 * Returns true when date/availability filters should be skipped.
 * Only returns true in demo environments.
 */
export function shouldBypassAvailabilityFilters(isDemoMode: boolean): boolean {
  // Env-level kill switch (defaults to enabled in demo)
  const envOverride = import.meta.env.VITE_DEMO_BYPASS_AVAILABILITY;
  if (envOverride === "false") return false;

  return isDemoMode || IS_DEMO_ENV;
}

/** UI label shown when the bypass is active */
export const DEMO_AVAILABILITY_BYPASS_LABEL =
  "Demo: Vi visar jobb oavsett valda datum så du kan testa flödet.";
