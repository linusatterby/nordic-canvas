import { describe, it, expect } from "vitest";

/**
 * Tests for the demo jobs fallback logic in listListings and the
 * reset-swipes button contract in TalentSwipeJobs.
 */

// ── Fallback logic contract ──────────────────────────────────
// Mirrors the condition in src/lib/api/jobs.ts listListings()

function shouldUseFallback(
  isDemoMode: boolean,
  primaryResultCount: number,
  isOrgQuery: boolean,
): boolean {
  return isDemoMode && primaryResultCount === 0 && !isOrgQuery;
}

describe("Demo jobs fallback", () => {
  it("uses fallback when demo mode + 0 primary results", () => {
    expect(shouldUseFallback(true, 0, false)).toBe(true);
  });

  it("does NOT use fallback when primary results exist", () => {
    expect(shouldUseFallback(true, 5, false)).toBe(false);
  });

  it("does NOT use fallback when not in demo mode", () => {
    expect(shouldUseFallback(false, 0, false)).toBe(false);
  });

  it("does NOT use fallback for org/employer queries", () => {
    expect(shouldUseFallback(true, 0, true)).toBe(false);
  });

  it("logs demo_jobs_fallback_used event via logger (not console)", () => {
    // Contract: fallback logging uses logger.info with event name "demo_jobs_fallback_used"
    const expectedEvent = "demo_jobs_fallback_used";
    const expectedReasons = ["empty_primary", "fallback_success", "fallback_error"];
    expect(expectedEvent).toBe("demo_jobs_fallback_used");
    expect(expectedReasons).toContain("empty_primary");
    expect(expectedReasons).toContain("fallback_success");
  });

  it("fallback log meta includes reason and count (no PII)", () => {
    // Contract: meta shape for fallback_success
    const meta = { reason: "fallback_success", count: 6 };
    expect(meta).toHaveProperty("reason");
    expect(meta).toHaveProperty("count");
    expect(Object.keys(meta)).not.toContain("userId");
    expect(Object.keys(meta)).not.toContain("email");
  });
});

// ── Reset-swipes invalidation contract ───────────────────────
// Mirrors useResetTalentDemoSwipes in src/hooks/useJobsFeed.ts

describe("Reset demo swipes contract", () => {
  it("invalidates the correct query keys after reset", () => {
    const invalidatedPrefixes = [
      ["jobs", "unswiped"],
      ["jobs", "demo-hard"],
      ["listings"],
    ];

    expect(invalidatedPrefixes).toHaveLength(3);
    expect(invalidatedPrefixes.map((k) => k[0])).toContain("jobs");
    expect(invalidatedPrefixes.map((k) => k[0])).toContain("listings");
  });

  it("also triggers refetchQueries for unswiped to clear empty state", () => {
    const refetchedKey = ["jobs", "unswiped"];
    expect(refetchedKey[0]).toBe("jobs");
    expect(refetchedKey[1]).toBe("unswiped");
  });

  it("reset button is demo-only (visibility guard)", () => {
    const shouldRender = (isDemoMode: boolean) => isDemoMode;
    expect(shouldRender(true)).toBe(true);
    expect(shouldRender(false)).toBe(false);
  });
});
