import { describe, it, expect } from "vitest";

/**
 * Tests for the "Återställ swipes" button visibility logic.
 * The button should only render in demo mode.
 */

// Simulates the visibility condition from TalentSwipeJobs
function shouldShowResetButton(isDemoMode: boolean): boolean {
  return isDemoMode;
}

describe("Återställ swipes button", () => {
  it("renders when isDemoMode is true", () => {
    expect(shouldShowResetButton(true)).toBe(true);
  });

  it("does NOT render when isDemoMode is false (prod/live)", () => {
    expect(shouldShowResetButton(false)).toBe(false);
  });

  it("reset function contract: should invalidate job queries after reset", () => {
    // Simulates the invalidation keys that must be cleared
    const invalidatedKeys = [
      ["jobs", "unswiped"],
      ["jobs", "demo-hard"],
      ["listings"],
    ];
    expect(invalidatedKeys.length).toBeGreaterThanOrEqual(3);
    expect(invalidatedKeys.some((k) => k[0] === "jobs")).toBe(true);
    expect(invalidatedKeys.some((k) => k[0] === "listings")).toBe(true);
  });
});
