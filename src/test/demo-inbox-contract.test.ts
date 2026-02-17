import { describe, it, expect } from "vitest";

/**
 * Contract test: demo inbox tabs must never be empty after seed.
 * Validates that the demo_inbox_items seed covers all 5 tabs.
 */

const REQUIRED_TABS = ["notification", "match", "offer", "message", "request"] as const;
const MIN_COUNTS: Record<string, number> = {
  notification: 4,
  match: 3,
  offer: 2,
  message: 1,
  request: 2,
};

describe("demo-inbox seed contract", () => {
  // We read the seed data definition from the edge function source
  // to verify completeness without needing a live DB connection.
  
  it("seed-test defines items for every inbox tab", async () => {
    const source = await import("fs").then(fs =>
      fs.readFileSync("supabase/functions/seed-test/index.ts", "utf-8")
    );

    for (const tab of REQUIRED_TABS) {
      const regex = new RegExp(`tab:\\s*"${tab}"`, "g");
      const matches = source.match(regex);
      expect(
        matches && matches.length >= MIN_COUNTS[tab],
        `Expected at least ${MIN_COUNTS[tab]} items with tab="${tab}" in seed-test, found ${matches?.length ?? 0}`
      ).toBe(true);
    }
  });

  it("live mode does not render demo inbox items (API guard)", async () => {
    // isDemoEffectivelyEnabled returns false when userIsDemoMode=false
    const { isDemoEffectivelyEnabled } = await import("@/lib/config/env");
    expect(isDemoEffectivelyEnabled(false)).toBe(false);
  });
});
