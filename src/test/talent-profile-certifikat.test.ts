import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const PROFILE_PATH = path.resolve("src/app/routes/(talent)/TalentProfile.tsx");
const PROFILE_SRC = fs.readFileSync(PROFILE_PATH, "utf-8");

const PREFS_EDITOR_PATH = path.resolve("src/components/profile/JobPreferencesEditor.tsx");
const PREFS_SRC = fs.readFileSync(PREFS_EDITOR_PATH, "utf-8");

describe("TalentProfile - Certifikat tab", () => {
  it('renders Certifikat tab trigger, not Badges', () => {
    expect(PROFILE_SRC).toContain('"credentials">Certifikat');
    expect(PROFILE_SRC).not.toContain('"badges">Badges');
  });

  it("imports CredentialsList component", () => {
    expect(PROFILE_SRC).toContain("CredentialsList");
  });

  it("does not render a duplicate Perioder availability card", () => {
    expect(PROFILE_SRC).not.toContain('"Perioder"');
  });

  it("has no duplicate seasonal date inputs outside JobPreferencesEditor", () => {
    expect(PROFILE_SRC).not.toContain('type="date"');
  });

  it("does not render the Tillganglighet card", () => {
    expect(PROFILE_SRC).not.toContain("AvailabilityEditor");
  });

  it("has only one save action via JobPreferencesEditor", () => {
    expect(PROFILE_SRC).not.toContain("Spara tillganglighet");
  });
});

describe("JobPreferencesEditor - validation rules", () => {
  it("validates that permanent requires earliest_start", () => {
    expect(PREFS_SRC).toContain("permanent && !permanentStart");
  });

  it("validates that extra shifts require at least one weekday", () => {
    expect(PREFS_SRC).toContain("extraShifts && weekdays.length === 0");
  });

  it("validates that extra shifts require at least one timeblock", () => {
    expect(PREFS_SRC).toContain("extraShifts && timeblocks.length === 0");
  });

  it("validates at least one job mode is selected", () => {
    expect(PREFS_SRC).toContain("!permanent && !seasonal && !extraShifts");
  });
});

describe("JobPreferencesEditor - seasonal labels", () => {
  it("uses seasonal from label", () => {
    expect(PREFS_SRC).toContain("season-from");
    expect(PREFS_SRC).toMatch(/S.song fr.n/);
  });

  it("uses seasonal to label", () => {
    expect(PREFS_SRC).toContain("season-to");
    expect(PREFS_SRC).toMatch(/S.song till/);
  });
});

describe("JobPreferencesEditor - shift availability integration", () => {
  it("uses useShiftAvailability hook", () => {
    expect(PREFS_SRC).toContain("useShiftAvailability");
  });

  it("uses useReplaceShiftAvailability for saving", () => {
    expect(PREFS_SRC).toContain("useReplaceShiftAvailability");
  });

  it("timeblocks match DB constraint (morning, day, evening)", () => {
    expect(PREFS_SRC).toContain('"morning"');
    expect(PREFS_SRC).toContain('"day"');
    expect(PREFS_SRC).toContain('"evening"');
    expect(PREFS_SRC).not.toContain('"afternoon"');
    expect(PREFS_SRC).not.toContain('"night"');
  });

  it("weekdays use numeric keys 0-6", () => {
    expect(PREFS_SRC).toContain("key: 0");
    expect(PREFS_SRC).toContain("key: 6");
  });
});

describe("API files - talent namespace", () => {
  it("credentials API lives under talent/", () => {
    expect(fs.existsSync(path.resolve("src/lib/api/talent/credentials.ts"))).toBe(true);
    expect(fs.existsSync(path.resolve("src/lib/api/credentials.ts"))).toBe(false);
  });

  it("jobPreferences API lives under talent/", () => {
    expect(fs.existsSync(path.resolve("src/lib/api/talent/jobPreferences.ts"))).toBe(true);
    expect(fs.existsSync(path.resolve("src/lib/api/jobPreferences.ts"))).toBe(false);
  });

  it("shiftAvailability API exists under talent/", () => {
    expect(fs.existsSync(path.resolve("src/lib/api/talent/shiftAvailability.ts"))).toBe(true);
  });
});
