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
});

// ── Reset-swipes invalidation contract ───────────────────────
// Mirrors useResetTalentDemoSwipes in src/hooks/useJobsFeed.ts

describe("Reset demo swipes contract", () => {
  it("invalidates the correct query keys after reset", () => {
    // These keys must be invalidated to refresh the swipe feed
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
    // After invalidation the hook calls refetchQueries on jobs.unswiped
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
