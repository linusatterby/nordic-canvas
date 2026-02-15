import { describe, it, expect } from "vitest";

/**
 * Seed guard logic tests.
 * These test the guard rules without needing actual Supabase connections.
 */

// Simulates the guard logic from seed-test edge function and CLI script
function seedGuard(backendEnv: string): { allowed: boolean; reason?: string } {
  if (backendEnv === "live") {
    return { allowed: false, reason: "Seed blocked: BACKEND_ENV=live" };
  }
  return { allowed: true };
}

describe("seed-guards", () => {
  it("allows seed when BACKEND_ENV=test", () => {
    const result = seedGuard("test");
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("blocks seed when BACKEND_ENV=live", () => {
    const result = seedGuard("live");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("live");
  });

  it("allows seed with empty/default env (falls back to test)", () => {
    const raw = "";
    const backendEnv = raw || "test";
    const result = seedGuard(backendEnv);
    expect(result.allowed).toBe(true);
  });

  it("allows seed when BACKEND_ENV=demo-like values", () => {
    // Any non-"live" value should be allowed
    expect(seedGuard("test").allowed).toBe(true);
    expect(seedGuard("staging").allowed).toBe(true);
    expect(seedGuard("development").allowed).toBe(true);
  });
});

describe("seed idempotency logic", () => {
  it("skips insert when record already exists (simulated)", () => {
    // Simulate the idempotency check: lookup by natural key
    const existingRecords = [{ id: "abc-123", name: "Testföretag AB" }];
    const toInsert = { name: "Testföretag AB", is_demo: true };

    const existing = existingRecords.find((r) => r.name === toInsert.name);
    expect(existing).toBeDefined();
    // When existing is found, we skip insert → idempotent
    const action = existing ? "already_exists" : "created";
    expect(action).toBe("already_exists");
  });

  it("inserts when record does not exist (simulated)", () => {
    const existingRecords: { id: string; name: string }[] = [];
    const toInsert = { name: "Nytt Företag AB", is_demo: true };

    const existing = existingRecords.find((r) => r.name === toInsert.name);
    expect(existing).toBeUndefined();
    const action = existing ? "already_exists" : "created";
    expect(action).toBe("created");
  });
});
