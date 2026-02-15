/**
 * Return URL validation for auth redirects.
 * Prevents open-redirect attacks by only allowing known internal paths.
 */

/** Allowed path prefixes for returnUrl (app areas) */
const ALLOWED_PREFIXES = [
  "/talent",
  "/employer",
  "/host",
  "/admin",
  "/settings",
] as const;

const DEFAULT_LANDING: Record<string, string> = {
  talent: "/talent/swipe-jobs",
  employer: "/employer/jobs",
  host: "/host/housing",
};

const FALLBACK = "/";

/**
 * Validate a returnUrl string.
 * Must be an internal path starting with "/" (not "//"),
 * AND must match one of the allowed app-area prefixes.
 */
export function isValidReturnUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== "string") return false;
  // Must start with "/" but not "//" (protocol-relative)
  if (!url.startsWith("/") || url.startsWith("//")) return false;
  // Block any URL-encoded variants of "//"
  if (url.toLowerCase().startsWith("/%2f")) return false;
  return true;
}

/**
 * Check if a returnUrl targets an allowed app area.
 * Only paths matching known prefixes are accepted for post-login redirect.
 */
export function isAllowedReturnPath(url: string): boolean {
  if (!isValidReturnUrl(url)) return false;
  // Extract pathname (strip query/hash)
  const pathname = url.split("?")[0].split("#")[0];
  return ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Get a safe returnUrl, falling back to a role-based landing or "/".
 * Applies both structural validation AND allowlist check.
 */
export function getSafeReturnUrl(
  raw: string | null | undefined,
  role?: string | null,
): string {
  if (isAllowedReturnPath(raw as string)) return raw as string;
  if (role && DEFAULT_LANDING[role]) return DEFAULT_LANDING[role];
  return FALLBACK;
}

/**
 * Build the login path with a returnUrl query parameter.
 * Only encodes the returnUrl if it passes the allowlist.
 */
export function buildLoginUrl(returnTo?: string): string {
  if (returnTo && isAllowedReturnPath(returnTo)) {
    return `/auth?returnUrl=${encodeURIComponent(returnTo)}`;
  }
  return "/auth";
}
