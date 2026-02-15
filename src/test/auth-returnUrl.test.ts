import { describe, it, expect } from "vitest";
import { isValidReturnUrl, isAllowedReturnPath, getSafeReturnUrl, buildLoginUrl } from "@/lib/auth/returnUrl";

describe("returnUrl validation", () => {
  it("accepts valid internal paths", () => {
    expect(isValidReturnUrl("/talent/dashboard")).toBe(true);
    expect(isValidReturnUrl("/employer/jobs")).toBe(true);
    expect(isValidReturnUrl("/settings/account")).toBe(true);
    expect(isValidReturnUrl("/")).toBe(true);
  });

  it("rejects external URLs (open redirect)", () => {
    expect(isValidReturnUrl("https://evil.com")).toBe(false);
    expect(isValidReturnUrl("http://evil.com")).toBe(false);
    expect(isValidReturnUrl("//evil.com")).toBe(false);
    expect(isValidReturnUrl("/%2fevil.com")).toBe(false);
  });

  it("rejects null/undefined/empty", () => {
    expect(isValidReturnUrl(null)).toBe(false);
    expect(isValidReturnUrl(undefined)).toBe(false);
    expect(isValidReturnUrl("")).toBe(false);
  });
});

describe("returnUrl allowlist", () => {
  it("allows known app-area paths", () => {
    expect(isAllowedReturnPath("/talent/matches")).toBe(true);
    expect(isAllowedReturnPath("/employer/scheduler")).toBe(true);
    expect(isAllowedReturnPath("/host/housing")).toBe(true);
    expect(isAllowedReturnPath("/admin/health")).toBe(true);
    expect(isAllowedReturnPath("/settings/profile")).toBe(true);
  });

  it("rejects paths outside allowed prefixes", () => {
    expect(isAllowedReturnPath("/")).toBe(false);
    expect(isAllowedReturnPath("/auth")).toBe(false);
    expect(isAllowedReturnPath("/privacy")).toBe(false);
    expect(isAllowedReturnPath("/for-talanger")).toBe(false);
    expect(isAllowedReturnPath("/random-page")).toBe(false);
  });

  it("rejects external URLs even if structurally valid-looking", () => {
    expect(isAllowedReturnPath("//evil.com/talent/x")).toBe(false);
    expect(isAllowedReturnPath("https://evil.com")).toBe(false);
  });

  it("handles query params and hashes correctly", () => {
    expect(isAllowedReturnPath("/talent/matches?tab=active")).toBe(true);
    expect(isAllowedReturnPath("/employer/jobs#details")).toBe(true);
  });
});

describe("getSafeReturnUrl with allowlist", () => {
  it("uses returnUrl when it matches allowlist", () => {
    expect(getSafeReturnUrl("/employer/scheduler", "talent")).toBe("/employer/scheduler");
  });

  it("falls back to role-based landing for disallowed paths", () => {
    expect(getSafeReturnUrl("/", "talent")).toBe("/talent/swipe-jobs");
    expect(getSafeReturnUrl("/auth", "employer")).toBe("/employer/jobs");
    expect(getSafeReturnUrl("/privacy", "host")).toBe("/host/housing");
  });

  it("falls back to / when no role and disallowed path", () => {
    expect(getSafeReturnUrl(null)).toBe("/");
    expect(getSafeReturnUrl("//evil.com")).toBe("/");
    expect(getSafeReturnUrl("/auth")).toBe("/");
  });

  it("rejects external URLs and falls back", () => {
    expect(getSafeReturnUrl("https://evil.com", "talent")).toBe("/talent/swipe-jobs");
  });
});

describe("buildLoginUrl with allowlist", () => {
  it("encodes allowed returnUrl as query param", () => {
    expect(buildLoginUrl("/talent/matches")).toBe("/auth?returnUrl=%2Ftalent%2Fmatches");
    expect(buildLoginUrl("/settings/account")).toBe("/auth?returnUrl=%2Fsettings%2Faccount");
  });

  it("omits returnUrl for disallowed or missing paths", () => {
    expect(buildLoginUrl("https://evil.com")).toBe("/auth");
    expect(buildLoginUrl("/")).toBe("/auth");
    expect(buildLoginUrl("/auth")).toBe("/auth");
    expect(buildLoginUrl()).toBe("/auth");
  });
});
