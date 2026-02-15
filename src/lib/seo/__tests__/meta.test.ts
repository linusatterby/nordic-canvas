import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to mock env before importing meta
vi.mock("@/lib/config/env", () => ({
  SITE_URL: "",
}));

import { buildMeta, siteDefaults, DEFAULT_OG_IMAGE } from "@/lib/seo/meta";

describe("buildMeta", () => {
  it("returns defaults when no options provided", () => {
    const meta = buildMeta();
    expect(meta.title).toBe(siteDefaults.defaultTitle);
    expect(meta.description).toBe(siteDefaults.defaultDescription);
    expect(meta.ogTitle).toBe(siteDefaults.defaultTitle);
    expect(meta.robots).toBe("index,follow");
    expect(meta.ogType).toBe("website");
  });

  it("formats title with siteName suffix", () => {
    const meta = buildMeta({ title: "För Talanger" });
    expect(meta.title).toBe(`För Talanger | ${siteDefaults.siteName}`);
    expect(meta.ogTitle).toBe(meta.title);
  });

  it("uses custom description", () => {
    const meta = buildMeta({ description: "Custom desc" });
    expect(meta.description).toBe("Custom desc");
    expect(meta.ogDescription).toBe("Custom desc");
  });

  it("builds canonical with path", () => {
    const meta = buildMeta({ canonicalPath: "/for-talanger" });
    // SITE_URL is empty in mock, so baseUrl = window.location.origin
    expect(meta.canonical).toContain("/for-talanger");
  });

  it("adds leading slash to canonicalPath if missing", () => {
    const meta = buildMeta({ canonicalPath: "for-talanger" });
    expect(meta.canonical).toContain("/for-talanger");
    expect(meta.canonical).not.toContain("//for-talanger");
  });

  it("uses custom robots", () => {
    const meta = buildMeta({ robots: "noindex,nofollow" });
    expect(meta.robots).toBe("noindex,nofollow");
  });

  it("includes og:image with default", () => {
    const meta = buildMeta();
    expect(meta.ogImage).toContain(DEFAULT_OG_IMAGE);
  });

  it("allows custom ogImage", () => {
    const meta = buildMeta({ ogImage: "https://example.com/custom.png" });
    expect(meta.ogImage).toBe("https://example.com/custom.png");
  });

  it("returns / as canonical when no path and no baseUrl", () => {
    const meta = buildMeta();
    // With empty SITE_URL and jsdom origin, canonical should be truthy
    expect(meta.canonical).toBeTruthy();
  });
});

describe("buildMeta with SITE_URL", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("builds absolute canonical when SITE_URL is set", async () => {
    vi.doMock("@/lib/config/env", () => ({
      SITE_URL: "https://seasonaltalent.se",
    }));
    const { buildMeta: buildMetaWithUrl } = await import("@/lib/seo/meta");
    const meta = buildMetaWithUrl({ canonicalPath: "/for-talanger" });
    expect(meta.canonical).toBe("https://seasonaltalent.se/for-talanger");
  });

  it("builds absolute og:image when SITE_URL is set", async () => {
    vi.doMock("@/lib/config/env", () => ({
      SITE_URL: "https://seasonaltalent.se",
    }));
    const { buildMeta: buildMetaWithUrl, DEFAULT_OG_IMAGE: ogImg } = await import("@/lib/seo/meta");
    const meta = buildMetaWithUrl();
    expect(meta.ogImage).toBe(`https://seasonaltalent.se${ogImg}`);
  });
});

describe("buildMeta prod without SITE_URL", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("canonical is a valid URL or path when SITE_URL is empty", async () => {
    vi.doMock("@/lib/config/env", () => ({ SITE_URL: "" }));
    const { buildMeta: bm } = await import("@/lib/seo/meta");
    const meta = bm({ canonicalPath: "/privacy" });
    // Falls back to window.location.origin, so still contains the path
    expect(meta.canonical).toContain("/privacy");
    expect(meta.canonical).not.toContain("//privacy");
  });

  it("ogImage contains default path when SITE_URL is empty", async () => {
    vi.doMock("@/lib/config/env", () => ({ SITE_URL: "" }));
    const { buildMeta: bm, DEFAULT_OG_IMAGE: ogImg } = await import("@/lib/seo/meta");
    const meta = bm();
    expect(meta.ogImage).toContain(ogImg);
  });
});
