import { useEffect } from "react";
import { buildMeta, type MetaConfig } from "./meta";

interface PageMetaProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  robots?: string;
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
export function PageMeta({ title, description, canonicalPath, robots }: PageMetaProps) {
  useEffect(() => {
    const meta: MetaConfig = buildMeta({ title, description, canonicalPath, robots });

    document.title = meta.title;
    setMetaTag("description", meta.description);
    setMetaTag("robots", meta.robots);
    setMetaTag("og:title", meta.ogTitle, "property");
    setMetaTag("og:description", meta.ogDescription, "property");
    setMetaTag("og:type", meta.ogType, "property");
    if (meta.canonical) {
      setLinkTag("canonical", meta.canonical);
    }
  }, [title, description, canonicalPath, robots]);

  return null;
}
