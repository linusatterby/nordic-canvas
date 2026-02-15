import { describe, it, expect } from "vitest";
import { isValidReturnUrl, getSafeReturnUrl, buildLoginUrl } from "@/lib/auth/returnUrl";

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

  it("getSafeReturnUrl falls back to role-based landing", () => {
    expect(getSafeReturnUrl("https://evil.com", "talent")).toBe("/talent/swipe-jobs");
    expect(getSafeReturnUrl(null, "employer")).toBe("/employer/jobs");
    expect(getSafeReturnUrl(null, "host")).toBe("/host/housing");
  });

  it("getSafeReturnUrl falls back to / when no role", () => {
    expect(getSafeReturnUrl(null)).toBe("/");
    expect(getSafeReturnUrl("//evil.com")).toBe("/");
  });

  it("getSafeReturnUrl uses valid returnUrl when provided", () => {
    expect(getSafeReturnUrl("/employer/scheduler", "talent")).toBe("/employer/scheduler");
  });

  it("buildLoginUrl encodes returnUrl as query param", () => {
    expect(buildLoginUrl("/talent/matches")).toBe("/auth?returnUrl=%2Ftalent%2Fmatches");
    expect(buildLoginUrl("https://evil.com")).toBe("/auth");
    expect(buildLoginUrl()).toBe("/auth");
  });
});
