/**
 * Central runtime configuration & invariant validation.
 *
 * Every module that needs env values should import from here –
 * **never** read `import.meta.env` directly outside `src/lib/config/`.
 *
 * NOTE: `src/integrations/supabase/client.ts` is auto-generated and reads
 * env vars itself. We cannot change that file, but `validateConfig()` runs
 * _before_ the app module is imported, so a missing value will surface as a
 * clear error before the Supabase client has a chance to blow up.
 */

// ---------------------------------------------------------------------------
// 1. Raw reads (only place allowed to touch import.meta.env)
// ---------------------------------------------------------------------------

const raw = {
  APP_ENV: (import.meta.env.VITE_APP_ENV as string) || "demo",
  BACKEND_ENV: (import.meta.env.VITE_BACKEND_ENV as string) || "test",
  SITE_URL: ((import.meta.env.VITE_SITE_URL as string) || "").replace(/\/+$/, ""),
  SUPABASE_URL: (import.meta.env.VITE_SUPABASE_URL as string) || "",
  SUPABASE_ANON_KEY: (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "",
} as const;

// ---------------------------------------------------------------------------
// 2. Typed constants
// ---------------------------------------------------------------------------

const VALID_APP_ENVS = ["demo", "prod"] as const;
const VALID_BACKEND_ENVS = ["test", "live"] as const;

export type AppEnv = (typeof VALID_APP_ENVS)[number];
export type BackendEnv = (typeof VALID_BACKEND_ENVS)[number];

export const APP_ENV: AppEnv = VALID_APP_ENVS.includes(raw.APP_ENV as AppEnv)
  ? (raw.APP_ENV as AppEnv)
  : "demo";

export const BACKEND_ENV: BackendEnv = VALID_BACKEND_ENVS.includes(raw.BACKEND_ENV as BackendEnv)
  ? (raw.BACKEND_ENV as BackendEnv)
  : "test";

export const SITE_URL: string = raw.SITE_URL;
export const SUPABASE_URL: string = raw.SUPABASE_URL;
export const SUPABASE_ANON_KEY: string = raw.SUPABASE_ANON_KEY;

export const IS_DEMO_ENV: boolean = APP_ENV === "demo";
export const IS_LIVE_BACKEND: boolean = BACKEND_ENV === "live";

// ---------------------------------------------------------------------------
// 3. Validation
// ---------------------------------------------------------------------------

export interface ConfigValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate the current runtime configuration.
 *
 * Call this **early** in the bootstrap sequence (before the app tree renders).
 *
 * @param opts.throwOnError  If true (default), throws on fatal misconfigurations.
 */
export function validateConfig(
  opts: { throwOnError?: boolean } = {},
): ConfigValidationResult {
  const { throwOnError = true } = opts;
  const errors: string[] = [];
  const warnings: string[] = [];

  // ---- Cross-env protection: demo app + live backend is forbidden ----
  if (IS_DEMO_ENV && IS_LIVE_BACKEND) {
    errors.push(
      "FATAL: VITE_APP_ENV=demo + VITE_BACKEND_ENV=live is not allowed. " +
        "Demo mode must never run against the live backend.",
    );
  }

  // ---- Live backend requires Supabase credentials ----
  if (IS_LIVE_BACKEND) {
    if (!SUPABASE_URL) {
      errors.push("FATAL: VITE_BACKEND_ENV=live but VITE_SUPABASE_URL is missing.");
    }
    if (!SUPABASE_ANON_KEY) {
      errors.push("FATAL: VITE_BACKEND_ENV=live but VITE_SUPABASE_PUBLISHABLE_KEY is missing.");
    }
    if (!SITE_URL) {
      errors.push("FATAL: VITE_BACKEND_ENV=live but VITE_SITE_URL is missing.");
    }
  }

  // ---- Test backend: optional but informative warnings ----
  if (!IS_LIVE_BACKEND) {
    if (!SITE_URL) {
      warnings.push(
        "VITE_SITE_URL is empty in test mode – canonical URLs will use relative paths.",
      );
    }
    // Suspicious: test backend but SITE_URL looks like a production domain
    if (SITE_URL && !SITE_URL.includes("localhost") && !SITE_URL.includes("preview")) {
      warnings.push(
        `VITE_BACKEND_ENV=test but VITE_SITE_URL looks like a live domain (${SITE_URL}). ` +
          "Double-check that you're not pointing test at a production URL.",
      );
    }
  }

  // ---- Emit ----
  warnings.forEach((w) => console.warn(`[runtime-config] ${w}`));

  if (errors.length > 0) {
    errors.forEach((e) => console.error(`[runtime-config] ${e}`));
    if (throwOnError) {
      throw new Error(
        `[runtime-config] Configuration errors:\n${errors.join("\n")}`,
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
