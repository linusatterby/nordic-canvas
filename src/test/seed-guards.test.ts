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

// ── Seed payload validation ──

// Mirror the seed definitions from the edge function for validation
const DEMO_ORGS = [
  { name: "Fjällhotellet Åre", location: "Åre" },
  { name: "Visby Strandhotell", location: "Visby" },
  { name: "Sälen Resort & Spa", location: "Sälen" },
];

const DEMO_JOBS = [
  { title: "Servis – heltid", org_index: 1, listing_type: "job" },
  { title: "Kock – hotellkök", org_index: 0, listing_type: "job" },
  { title: "Receptionist – resort", org_index: 1, listing_type: "job" },
  { title: "Drift/fastighet – allround", org_index: 0, listing_type: "job" },
  { title: "Housekeeping – teamledare", org_index: 1, listing_type: "job" },
  { title: "Liftvärd", org_index: 0, listing_type: "job" },
  { title: "Bartender – afterski", org_index: 0, listing_type: "job" },
  { title: "Kök/café", org_index: 2, listing_type: "job" },
  { title: "Eventvärd – sommar", org_index: 1, listing_type: "job" },
  { title: "Servering – sommar", org_index: 1, listing_type: "job" },
  { title: "Extrapass: servis", org_index: 1, listing_type: "shift_cover" },
  { title: "Extrapass: disk/kök", org_index: 1, listing_type: "shift_cover" },
  { title: "Extrapass: hotellfrukost", org_index: 0, listing_type: "shift_cover" },
  { title: "Extrapass: event", org_index: 1, listing_type: "shift_cover" },
  { title: "Extrapass: housekeeping", org_index: 0, listing_type: "shift_cover" },
];

describe("seed payload validation", () => {
  it("contains at least 15 demo jobs", () => {
    expect(DEMO_JOBS.length).toBeGreaterThanOrEqual(15);
  });

  it("contains at least 3 demo orgs", () => {
    expect(DEMO_ORGS.length).toBeGreaterThanOrEqual(3);
  });

  it("has unique job titles (demo_key equivalent)", () => {
    const titles = DEMO_JOBS.map((j) => j.title);
    const unique = new Set(titles);
    expect(unique.size).toBe(titles.length);
  });

  it("has unique org names", () => {
    const names = DEMO_ORGS.map((o) => o.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("all org_index values reference valid orgs", () => {
    for (const job of DEMO_JOBS) {
      expect(job.org_index).toBeGreaterThanOrEqual(0);
      expect(job.org_index).toBeLessThan(DEMO_ORGS.length);
    }
  });

  it("includes both job and shift_cover listing types", () => {
    const types = new Set(DEMO_JOBS.map((j) => j.listing_type));
    expect(types.has("job")).toBe(true);
    expect(types.has("shift_cover")).toBe(true);
  });

  it("has at least 5 shift_cover (extrapass) jobs", () => {
    const shiftCoverCount = DEMO_JOBS.filter((j) => j.listing_type === "shift_cover").length;
    expect(shiftCoverCount).toBeGreaterThanOrEqual(5);
  });

  it("covers all 3 locations (Visby, Åre, Sälen)", () => {
    const locations = new Set(DEMO_ORGS.map((o) => o.location));
    expect(locations.has("Visby")).toBe(true);
    expect(locations.has("Åre")).toBe(true);
    expect(locations.has("Sälen")).toBe(true);
  });
});
