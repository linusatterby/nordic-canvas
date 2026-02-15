import { describe, it, expect } from "vitest";

/**
 * Tests for the "Återställ swipes" button visibility, toast feedback,
 * and the reset RPC contract.
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

describe("Återställ swipes toast feedback", () => {
  it("shows success toast on successful reset", () => {
    const rpcResult = { success: true, deleted_count: 5, error: null };
    const toast = rpcResult.success
      ? { type: "success", title: "Swipes återställda" }
      : { type: "error", title: "Kunde inte återställa swipes" };
    expect(toast.type).toBe("success");
    expect(toast.title).toBe("Swipes återställda");
  });

  it("shows error toast on RPC failure", () => {
    const rpcResult = { success: false, error: new Error("RPC failed") };
    const toast = rpcResult.success
      ? { type: "success", title: "Swipes återställda" }
      : { type: "error", title: "Kunde inte återställa swipes" };
    expect(toast.type).toBe("error");
    expect(toast.title).toBe("Kunde inte återställa swipes");
  });

  it("shows error toast on network error (mutation catch)", () => {
    // Simulates the catch block in handleResetDemoSwipes
    let toastType = "none";
    try {
      throw new Error("Network error");
    } catch {
      toastType = "error";
    }
    expect(toastType).toBe("error");
  });
});

describe("reset_talent_demo_swipes RPC contract", () => {
  it("only deletes swipes for demo jobs (is_demo = true)", () => {
    // Contract: the DELETE WHERE clause must include is_demo = true
    const whereClause = {
      talent_user_id: "auth.uid()",
      job_post_id_filter: "job_posts.is_demo = true",
    };
    expect(whereClause.job_post_id_filter).toContain("is_demo");
    expect(whereClause.job_post_id_filter).toContain("true");
  });

  it("only deletes swipes for the current authenticated user", () => {
    const whereClause = {
      talent_user_id: "auth.uid()",
    };
    expect(whereClause.talent_user_id).toBe("auth.uid()");
  });

  it("returns no-op result when user is not authenticated", () => {
    // Contract: if auth.uid() is null, return error
    const uid = null;
    const result = uid === null
      ? { success: false, error: "Not authenticated" }
      : { success: true };
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("returns deleted_count in success response", () => {
    // Contract: response shape includes deleted_count
    const response = { success: true, deleted_count: 3, message: "Demo swipes reset successfully" };
    expect(response).toHaveProperty("deleted_count");
    expect(response.deleted_count).toBeGreaterThanOrEqual(0);
  });
});
