/**
 * SEO meta configuration – foundation for future SSR/SSG
 *
 * Usage:
 *   import { buildMeta, siteDefaults } from "@/lib/seo/meta";
 *   const meta = buildMeta({ title: "För Talanger", canonicalPath: "/for-talanger" });
 */

import { SITE_URL } from "@/lib/config/env";

/** Default OG image served from public/ */
export const DEFAULT_OG_IMAGE = "/og/default.png";

import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from "@/config/brand";

export const siteDefaults = {
  siteName: APP_NAME,
  defaultTitle: `${APP_NAME} – ${APP_TAGLINE}`,
  defaultDescription: APP_DESCRIPTION,
} as const;

export interface MetaConfig {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  robots: string;
}

interface BuildMetaOptions {
  /** Page-specific title (will be suffixed with siteName) */
  title?: string;
  /** Page-specific description */
  description?: string;
  /** Canonical path e.g. "/for-talanger" */
  canonicalPath?: string;
  /** Override robots directive (default: "index,follow") */
  robots?: string;
  /** Override OG image URL */
  ogImage?: string;
}

/**
 * Resolve base URL for canonical/og links.
 * Uses VITE_SITE_URL if set, otherwise falls back to window.location.origin.
 */
function getBaseUrl(): string {
  if (SITE_URL) return SITE_URL;
  return typeof window !== "undefined" ? window.location.origin : "";
}

/**
 * Build a standardised meta configuration for a page.
 * Designed to work with both client-side <head> manipulation
 * and future SSR/SSG renderers.
 */
export function buildMeta(opts: BuildMetaOptions = {}): MetaConfig {
  const baseUrl = getBaseUrl();

  const title = opts.title
    ? `${opts.title} | ${siteDefaults.siteName}`
    : siteDefaults.defaultTitle;

  const description = opts.description || siteDefaults.defaultDescription;

  // Ensure canonicalPath has leading slash
  const path = opts.canonicalPath
    ? (opts.canonicalPath.startsWith("/") ? opts.canonicalPath : `/${opts.canonicalPath}`)
    : "";
  const canonical = path
    ? `${baseUrl}${path}`
    : baseUrl || "/";

  const ogImage = opts.ogImage || `${baseUrl}${DEFAULT_OG_IMAGE}`;

  return {
    title,
    description,
    canonical,
    ogTitle: title,
    ogDescription: description,
    ogImage,
    ogType: "website",
    robots: opts.robots || "index,follow",
  };
}
