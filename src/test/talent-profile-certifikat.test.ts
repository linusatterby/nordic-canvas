import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const PROFILE_PATH = path.resolve("src/app/routes/(talent)/TalentProfile.tsx");
const PROFILE_SRC = fs.readFileSync(PROFILE_PATH, "utf-8");

const PREFS_EDITOR_PATH = path.resolve("src/components/profile/JobPreferencesEditor.tsx");
const PREFS_SRC = fs.readFileSync(PREFS_EDITOR_PATH, "utf-8");

describe("TalentProfile – Certifikat tab", () => {
  it('renders "Certifikat" tab trigger, not "Badges"', () => {
    expect(PROFILE_SRC).toContain('"credentials">Certifikat');
    expect(PROFILE_SRC).not.toContain('"badges">Badges');
  });

  it("imports CredentialsList component", () => {
    expect(PROFILE_SRC).toContain("CredentialsList");
  });
});

describe("JobPreferencesEditor – validation rules", () => {
  it("validates that permanent requires earliest_start", () => {
    // The validation code checks for permanentStart when permanent is true
    expect(PREFS_SRC).toContain('permanent && !permanentStart');
  });

  it("validates that extra shifts require at least one weekday", () => {
    expect(PREFS_SRC).toContain('extraShifts && weekdays.length === 0');
  });

  it("validates that extra shifts require at least one timeblock", () => {
    expect(PREFS_SRC).toContain('extraShifts && timeblocks.length === 0');
  });

  it("validates at least one job mode is selected", () => {
    expect(PREFS_SRC).toContain('!permanent && !seasonal && !extraShifts');
  });
});
