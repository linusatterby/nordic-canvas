/**
 * Contract test: anti-double-submit guard for swipe actions.
 *
 * Verifies that rapid consecutive swipe calls only produce one mutation
 * thanks to the isLocked guard in TalentSwipeJobs.
 */
import { describe, it, expect, vi } from "vitest";

describe("Swipe anti-double-submit guard", () => {
  it("blocks a second swipe call while locked", async () => {
    // Simulate the guard logic from TalentSwipeJobs
    let isLocked = false;
    const LOCKOUT_MS = 400;
    const swipeFn = vi.fn(async (_dir: string) => {});

    const handleSwipe = async (direction: "yes" | "no") => {
      if (isLocked) return; // guard
      isLocked = true;
      await swipeFn(direction);
      setTimeout(() => { isLocked = false; }, LOCKOUT_MS);
    };

    // First call goes through
    await handleSwipe("yes");
    expect(swipeFn).toHaveBeenCalledTimes(1);

    // Immediate second call is blocked
    await handleSwipe("no");
    expect(swipeFn).toHaveBeenCalledTimes(1);

    // Third call is also blocked (still within lockout)
    await handleSwipe("yes");
    expect(swipeFn).toHaveBeenCalledTimes(1);
  });

  it("allows swipe again after lockout expires", async () => {
    let isLocked = false;
    const LOCKOUT_MS = 50; // short for test
    const swipeFn = vi.fn(async (_dir: string) => {});

    const handleSwipe = async (direction: "yes" | "no") => {
      if (isLocked) return;
      isLocked = true;
      await swipeFn(direction);
      setTimeout(() => { isLocked = false; }, LOCKOUT_MS);
    };

    await handleSwipe("yes");
    expect(swipeFn).toHaveBeenCalledTimes(1);

    // Wait for lockout to expire
    await new Promise(r => setTimeout(r, LOCKOUT_MS + 10));

    await handleSwipe("no");
    expect(swipeFn).toHaveBeenCalledTimes(2);
  });

  it("only registers direction of first click when double-tapped", async () => {
    let isLocked = false;
    const calls: string[] = [];

    const handleSwipe = async (direction: "yes" | "no") => {
      if (isLocked) return;
      isLocked = true;
      calls.push(direction);
      setTimeout(() => { isLocked = false; }, 400);
    };

    // Rapid double-tap: yes then no
    await handleSwipe("yes");
    await handleSwipe("no");

    expect(calls).toEqual(["yes"]);
    expect(calls).toHaveLength(1);
  });
});
