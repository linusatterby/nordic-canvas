/**
 * SEO meta configuration – foundation for future SSR/SSG
 *
 * Usage:
 *   import { buildMeta, siteDefaults } from "@/lib/seo/meta";
 *   const meta = buildMeta({ title: "För Talanger", description: "...", canonicalPath: "/for-talanger" });
 */

export const siteDefaults = {
  siteName: "Seasonal Talent",
  defaultTitle: "Seasonal Talent – Matcha jobb & talanger",
  defaultDescription:
    "Plattformen som matchar säsongsarbetare med arbetsgivare. Hitta rätt jobb eller rätt talang – snabbt och enkelt.",
  baseUrl: typeof window !== "undefined" ? window.location.origin : "",
} as const;

export interface MetaConfig {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
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
}

/**
 * Build a standardised meta configuration for a page.
 * Designed to work with both client-side <head> manipulation
 * and future SSR/SSG renderers.
 */
export function buildMeta(opts: BuildMetaOptions = {}): MetaConfig {
  const title = opts.title
    ? `${opts.title} | ${siteDefaults.siteName}`
    : siteDefaults.defaultTitle;

  const description = opts.description || siteDefaults.defaultDescription;
  const canonical = opts.canonicalPath
    ? `${siteDefaults.baseUrl}${opts.canonicalPath}`
    : siteDefaults.baseUrl;

  return {
    title,
    description,
    canonical,
    ogTitle: title,
    ogDescription: description,
    ogType: "website",
    robots: opts.robots || "index,follow",
  };
}
