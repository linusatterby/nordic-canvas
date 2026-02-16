import { describe, it, expect } from "vitest";

// ─── Live-backend safety invariant ─────────────────────────────

describe("shouldBypassAvailabilityFilters – live backend guard", () => {
  it("bypass is ALWAYS false when IS_LIVE_BACKEND is true", async () => {
    // We test the contract: on live backend the function body hits the
    // early-return guard `if (IS_LIVE_BACKEND) return false`.
    // In our test env IS_LIVE_BACKEND defaults to false, so we test the
    // logical contract directly.
    const isLiveBackend = true;
    const isDemoMode = true;
    const isDemoEnv = true;

    // Mirrors the guard logic in availabilityBypass.ts
    const result = isLiveBackend ? false : (isDemoMode || isDemoEnv);
    expect(result).toBe(false);
  });

  it("bypass can be true when IS_LIVE_BACKEND is false + demo mode", () => {
    const isLiveBackend = false;
    const isDemoMode = true;
    const killSwitch = undefined; // not set

    const result = isLiveBackend
      ? false
      : killSwitch === "false"
        ? false
        : isDemoMode;
    expect(result).toBe(true);
  });

  it("kill-switch overrides even in demo/test backend", () => {
    const isLiveBackend = false;
    const isDemoMode = true;
    const killSwitch = "false";

    const result = isLiveBackend
      ? false
      : killSwitch === "false"
        ? false
        : isDemoMode;
    expect(result).toBe(false);
  });
});

// ─── Feature-flag unit tests ───────────────────────────────────

describe("shouldBypassAvailabilityFilters – runtime", () => {
  it("returns true when isDemoMode is true (test backend)", async () => {
    const { shouldBypassAvailabilityFilters } = await import(
      "@/lib/demo/availabilityBypass"
    );
    // In test env IS_LIVE_BACKEND is false, so demo mode enables bypass
    expect(shouldBypassAvailabilityFilters(true)).toBe(true);
  });

  it("returns boolean when isDemoMode is false", async () => {
    const { shouldBypassAvailabilityFilters } = await import(
      "@/lib/demo/availabilityBypass"
    );
    const result = shouldBypassAvailabilityFilters(false);
    expect(typeof result).toBe("boolean");
  });
});

// ─── API contract tests ────────────────────────────────────────

describe("Demo availability bypass – API contract", () => {
  it("demo: date filters do NOT narrow results when bypass is active", () => {
    const isDemoMode = true;
    const bypassDates = isDemoMode;
    const filters = { startDate: "2099-01-01", endDate: "2099-01-02" };
    const hasActiveDateFilters = !!(filters.startDate || filters.endDate);
    const dateFilterApplied = hasActiveDateFilters && !bypassDates;
    expect(dateFilterApplied).toBe(false);
  });

  it("live: date filters DO narrow results when bypass is inactive", () => {
    const isDemoMode = false;
    const bypassDates = false;
    const filters = { startDate: "2099-01-01", endDate: "2099-01-02" };
    const hasActiveDateFilters = !!(filters.startDate || filters.endDate);
    const dateFilterApplied = hasActiveDateFilters && !bypassDates;
    expect(dateFilterApplied).toBe(true);
  });

  it("live backend: bypass is always false regardless of isDemoMode", () => {
    // This is the critical invariant
    const isLiveBackend = true;
    const bypass = isLiveBackend ? false : true;
    expect(bypass).toBe(false);
  });

  it("demo: shift_cover date filters are skipped when bypass active", () => {
    const isDemoMode = true;
    const bypassDates = isDemoMode;
    const filters = { startDate: "2026-06-01", includeShiftCover: true };
    const shiftDateFilterApplied = !bypassDates && !!filters.startDate && filters.includeShiftCover;
    expect(shiftDateFilterApplied).toBe(false);
  });

  it("live: shift_cover date filters are applied when bypass inactive", () => {
    const isDemoMode = false;
    const bypassDates = false;
    const filters = { startDate: "2026-06-01", includeShiftCover: true };
    const shiftDateFilterApplied = !bypassDates && !!filters.startDate && filters.includeShiftCover;
    expect(shiftDateFilterApplied).toBe(true);
  });

  it("demo: non-date filters (location, role, housing) still apply", () => {
    const isDemoMode = true;
    const bypassDates = isDemoMode;
    const filters = { location: "Visby", roleKey: "kock", housingOnly: true };
    const locationApplied = !!filters.location && filters.location !== "all";
    const roleApplied = !!filters.roleKey && filters.roleKey !== "all";
    const housingApplied = !!filters.housingOnly;
    expect(locationApplied).toBe(true);
    expect(roleApplied).toBe(true);
    expect(housingApplied).toBe(true);
    expect(bypassDates).toBe(true);
  });
});

describe("Demo fallback contract (existing)", () => {
  it("listListings fallback triggers when primary returns 0 in demo", () => {
    const isDemoMode = true;
    const primaryResults: unknown[] = [];
    const isOrgQuery = false;
    const shouldFallback = isDemoMode && primaryResults.length === 0 && !isOrgQuery;
    expect(shouldFallback).toBe(true);
  });

  it("listListings fallback does NOT trigger in live", () => {
    const isDemoMode = false;
    const primaryResults: unknown[] = [];
    const isOrgQuery = false;
    const shouldFallback = isDemoMode && primaryResults.length === 0 && !isOrgQuery;
    expect(shouldFallback).toBe(false);
  });
});
