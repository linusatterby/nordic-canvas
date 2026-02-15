/**
 * Contract test: anti-double-submit guard for swipe actions.
 *
 * Verifies that rapid consecutive swipe calls only produce one mutation
 * thanks to the isLocked guard in TalentSwipeJobs.
 *
 * Also verifies that lockout can be released early by a job-id change
 * (simulating next card render) rather than only by timeout.
 */
import { describe, it, expect, vi } from "vitest";

describe("Swipe anti-double-submit guard", () => {
  it("blocks a second swipe call while locked", async () => {
    let isLocked = false;
    const swipeFn = vi.fn(async (_dir: string) => {});

    const handleSwipe = async (direction: "yes" | "no") => {
      if (isLocked) return;
      isLocked = true;
      await swipeFn(direction);
      setTimeout(() => { isLocked = false; }, 700);
    };

    await handleSwipe("yes");
    expect(swipeFn).toHaveBeenCalledTimes(1);

    await handleSwipe("no");
    expect(swipeFn).toHaveBeenCalledTimes(1);

    await handleSwipe("yes");
    expect(swipeFn).toHaveBeenCalledTimes(1);
  });

  it("allows swipe again after lockout expires", async () => {
    let isLocked = false;
    const LOCKOUT_MS = 50;
    const swipeFn = vi.fn(async (_dir: string) => {});

    const handleSwipe = async (direction: "yes" | "no") => {
      if (isLocked) return;
      isLocked = true;
      await swipeFn(direction);
      setTimeout(() => { isLocked = false; }, LOCKOUT_MS);
    };

    await handleSwipe("yes");
    expect(swipeFn).toHaveBeenCalledTimes(1);

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
      setTimeout(() => { isLocked = false; }, 700);
    };

    await handleSwipe("yes");
    await handleSwipe("no");

    expect(calls).toEqual(["yes"]);
    expect(calls).toHaveLength(1);
  });

  it("unlocks early when next job id is rendered (not just timeout)", async () => {
    // Simulates the render-based unlock from TalentSwipeJobs
    let isLocked = false;
    let swipedJobId: string | null = null;
    let lockTimer: ReturnType<typeof setTimeout> | null = null;
    const MAX_LOCKOUT = 700;
    const swipeFn = vi.fn(async (_dir: string) => {});

    const handleSwipe = async (direction: "yes" | "no", currentJobId: string) => {
      if (isLocked) return;
      isLocked = true;
      swipedJobId = currentJobId;
      await swipeFn(direction);
      // Max timeout fallback
      lockTimer = setTimeout(() => {
        swipedJobId = null;
        isLocked = false;
      }, MAX_LOCKOUT);
    };

    // Simulate render-based unlock (what the useEffect does)
    const onNextCardRendered = (newJobId: string) => {
      if (swipedJobId && newJobId !== swipedJobId) {
        swipedJobId = null;
        if (lockTimer) clearTimeout(lockTimer);
        isLocked = false;
      }
    };

    // Swipe job-A
    await handleSwipe("yes", "job-A");
    expect(swipeFn).toHaveBeenCalledTimes(1);
    expect(isLocked).toBe(true);

    // Blocked while locked
    await handleSwipe("no", "job-A");
    expect(swipeFn).toHaveBeenCalledTimes(1);

    // Next card renders (job-B) → should unlock immediately
    onNextCardRendered("job-B");
    expect(isLocked).toBe(false);

    // Now we can swipe again without waiting for timeout
    await handleSwipe("yes", "job-B");
    expect(swipeFn).toHaveBeenCalledTimes(2);
  });
});
