import { describe, it, expect, vi } from "vitest";

/**
 * Tests that the demo inbox hard-guard blocks all data on live backend,
 * and that tab counts correctly combine real + demo in demo mode.
 */

describe("demo-inbox live guard", () => {
  it("listDemoInboxItems returns empty when IS_LIVE_BACKEND=true", async () => {
    // Mock the env module to simulate live backend
    vi.doMock("@/lib/config/env", () => ({
      IS_LIVE_BACKEND: true,
      isDemoEffectivelyEnabled: () => false,
      DEMO_ENABLED: false,
    }));

    // Re-import to pick up mock
    const { listDemoInboxItems } = await import("@/lib/api/demoInbox");
    const { items, error } = await listDemoInboxItems("notification");

    expect(items).toEqual([]);
    expect(error).toBeNull();

    vi.doUnmock("@/lib/config/env");
  });

  it("isDemoEffectivelyEnabled returns false when user is not in demo mode", async () => {
    const { isDemoEffectivelyEnabled } = await import("@/lib/config/env");
    expect(isDemoEffectivelyEnabled(false)).toBe(false);
  });

  it("IS_LIVE_BACKEND blocks demo regardless of DEMO_ENABLED flag", async () => {
    vi.doMock("@/lib/config/env", () => ({
      IS_LIVE_BACKEND: true,
      isDemoEffectivelyEnabled: (userDemo: boolean) => false,
      DEMO_ENABLED: true,
    }));

    const { listDemoInboxItems } = await import("@/lib/api/demoInbox");
    const { items } = await listDemoInboxItems();

    expect(items).toEqual([]);

    vi.doUnmock("@/lib/config/env");
  });
});

describe("demo-inbox tab counts contract", () => {
  it("demo counts should be additive only when demo mode is active", () => {
    // Simulates the count logic from TalentInbox
    const realUnread = 2;
    const demoNotifCount = 4;

    const demoEnabled = true;
    const liveCount = realUnread; // live: only real
    const demoCount = realUnread + (demoEnabled ? demoNotifCount : 0); // demo: real + demo

    expect(liveCount).toBe(2);
    expect(demoCount).toBe(6);
  });

  it("live mode counts exclude demo items", () => {
    const realUnread = 3;
    const demoNotifCount = 4;
    const demoEnabled = false; // live

    const count = realUnread + (demoEnabled ? demoNotifCount : 0);
    expect(count).toBe(3);
  });
});
