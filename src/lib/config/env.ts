/**
 * Centralized environment configuration for production readiness
 * All env flags related to demo/debug should be accessed from here
 */

// Core environment detection
export const IS_PROD = import.meta.env.PROD;
export const IS_DEV = import.meta.env.DEV;

// Debug flag (from existing debug.ts - re-exported here for completeness)
export const DEMO_DEBUG_ENABLED = import.meta.env.VITE_DEMO_DEBUG === "true";

// App environment: "demo" | "prod" (default: "demo")
// Unknown values fall back to "demo" with a console warning.
const _rawAppEnv = (import.meta.env.VITE_APP_ENV as string) || "demo";
const VALID_APP_ENVS = ["demo", "prod"] as const;
export type AppEnv = (typeof VALID_APP_ENVS)[number];

export const APP_ENV: AppEnv = VALID_APP_ENVS.includes(_rawAppEnv as AppEnv)
  ? (_rawAppEnv as AppEnv)
  : (() => {
      console.warn(
        `[env] Unknown VITE_APP_ENV="${_rawAppEnv}" – falling back to "demo". Valid values: ${VALID_APP_ENVS.join(", ")}`
      );
      return "demo" as AppEnv;
    })();
export const IS_DEMO_ENV = APP_ENV === "demo";

// Site URL for absolute canonical links (set in prod, empty in demo)
export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string) || "").replace(/\/+$/, "");

// Runtime diagnostics (runs once at module load)
if (IS_DEMO_ENV) {
  console.info("[SEO] DEMO MODE: noindex,nofollow enabled");
} else if (APP_ENV === "prod" && !SITE_URL) {
  console.warn("[SEO] VITE_APP_ENV=prod but VITE_SITE_URL is empty – canonical & og:image will use relative paths");
}

// Demo feature flags
// DEMO_ENABLED: Master switch for demo functionality (default: true)
// Set VITE_DEMO_ENABLED=false in production to completely disable demo features
export const DEMO_ENABLED = import.meta.env.VITE_DEMO_ENABLED !== "false";

// ALLOW_DEMO_SEED: Controls whether demo seeding is allowed (default: false in prod, true in dev)
// Set VITE_ALLOW_DEMO_SEED=true to enable demo seeding
export const ALLOW_DEMO_SEED = import.meta.env.VITE_ALLOW_DEMO_SEED === "true";

/**
 * Check if demo features should be active
 * Requires both the user to be in demo mode AND demo to be globally enabled
 */
export function isDemoEffectivelyEnabled(userIsDemoMode: boolean): boolean {
  return userIsDemoMode && DEMO_ENABLED;
}

/**
 * Check if demo seeding is allowed
 * Only true when VITE_ALLOW_DEMO_SEED=true
 */
export function canSeedDemo(): boolean {
  return ALLOW_DEMO_SEED;
}

/**
 * Get all environment flags for health/admin display
 */
export function getEnvStatus() {
  return {
    IS_PROD,
    IS_DEV,
    APP_ENV,
    IS_DEMO_ENV,
    SITE_URL,
    DEMO_ENABLED,
    DEMO_DEBUG_ENABLED,
    ALLOW_DEMO_SEED,
  };
}

/**
 * Get production configuration warnings
 * Returns an array of warning messages for misconfigurations
 */
export function getProductionWarnings(): string[] {
  const warnings: string[] = [];

  if (IS_PROD && DEMO_DEBUG_ENABLED) {
    warnings.push("⚠️ VITE_DEMO_DEBUG=true i produktion – debugpaneler kan synas för användare");
  }

  if (IS_PROD && ALLOW_DEMO_SEED) {
    warnings.push("⚠️ VITE_ALLOW_DEMO_SEED=true i produktion – demo-seeding är aktiverat");
  }

  if (IS_PROD && DEMO_ENABLED) {
    warnings.push("ℹ️ Demo-läge är aktiverat i produktion. Sätt VITE_DEMO_ENABLED=false för att stänga av helt.");
  }

  return warnings;
}
