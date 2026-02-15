/**
 * Return URL validation for auth redirects.
 * Prevents open-redirect attacks by only allowing internal paths.
 */

const DEFAULT_LANDING: Record<string, string> = {
  talent: "/talent/swipe-jobs",
  employer: "/employer/jobs",
  host: "/host/housing",
};

const FALLBACK = "/";

/**
 * Validate a returnUrl string.
 * Only internal paths (starting with "/" but not "//") are accepted.
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
 * Get a safe returnUrl, falling back to a role-based landing or "/".
 */
export function getSafeReturnUrl(
  raw: string | null | undefined,
  role?: string | null,
): string {
  if (isValidReturnUrl(raw)) return raw;
  if (role && DEFAULT_LANDING[role]) return DEFAULT_LANDING[role];
  return FALLBACK;
}

/**
 * Build the login path with a returnUrl query parameter.
 */
export function buildLoginUrl(returnTo?: string): string {
  if (isValidReturnUrl(returnTo)) {
    return `/auth?returnUrl=${encodeURIComponent(returnTo)}`;
  }
  return "/auth";
}
