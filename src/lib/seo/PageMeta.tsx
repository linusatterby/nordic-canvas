import { useEffect, useRef } from "react";
import { buildMeta, type MetaConfig } from "./meta";

interface PageMetaProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  robots?: string;
  ogImage?: string;
  /** Optional JSON-LD structured data objects to inject into <head> */
  jsonLd?: object[];
}

function setMetaTag(name: string, content: string, attribute = "name") {
  let el = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attribute, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLinkTag(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Declarative per-route <head> management.
 * Sets document.title + meta tags via DOM – works now and is easy
 * to replace with react-helmet-async or SSR head injection later.
 */
export function PageMeta({ title, description, canonicalPath, robots, ogImage, jsonLd }: PageMetaProps) {
  const ldScriptsRef = useRef<HTMLScriptElement[]>([]);

  useEffect(() => {
    const meta: MetaConfig = buildMeta({ title, description, canonicalPath, robots, ogImage });

    document.title = meta.title;
    setMetaTag("description", meta.description);
    setMetaTag("robots", meta.robots);
    setMetaTag("og:title", meta.ogTitle, "property");
    setMetaTag("og:description", meta.ogDescription, "property");
    setMetaTag("og:image", meta.ogImage, "property");
    setMetaTag("og:type", meta.ogType, "property");
    if (meta.canonical) {
      setLinkTag("canonical", meta.canonical);
    }
  }, [title, description, canonicalPath, robots, ogImage]);

  // JSON-LD injection
  useEffect(() => {
    // Clean up previous scripts
    ldScriptsRef.current.forEach((el) => el.remove());
    ldScriptsRef.current = [];

    if (!jsonLd?.length) return;

    for (const item of jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(item);
      document.head.appendChild(script);
      ldScriptsRef.current.push(script);
    }

    return () => {
      ldScriptsRef.current.forEach((el) => el.remove());
      ldScriptsRef.current = [];
    };
  }, [jsonLd]);

  return null;
}
