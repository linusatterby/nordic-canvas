import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { TALENT_DEMO_CTA, EMPLOYER_DEMO_CTA, DEMO_CTAS } from "@/lib/constants/demoCta";

/**
 * Contract tests for demo CTA routing.
 *
 * These ensure that:
 * 1. CTA config is self-consistent (role ↔ label ↔ pathPrefix)
 * 2. Pages use the shared config, not hardcoded strings
 * 3. No demo CTA ever links to /auth (demo bypasses auth)
 */

const DEMO_PAGE_FILES = [
  "src/app/routes/(public)/Landing.tsx",
  "src/app/routes/(public)/ForTalanger.tsx",
];

const pageSources = DEMO_PAGE_FILES.map((f) => ({
  file: f,
  src: readFileSync(resolve(f), "utf-8"),
}));

describe("Demo CTA config integrity", () => {
  it("TALENT_DEMO_CTA has correct role and pathPrefix", () => {
    expect(TALENT_DEMO_CTA.role).toBe("talent");
    expect(TALENT_DEMO_CTA.pathPrefix).toBe("/talent");
    expect(TALENT_DEMO_CTA.label).toContain("kandidat");
  });

  it("EMPLOYER_DEMO_CTA has correct role and pathPrefix", () => {
    expect(EMPLOYER_DEMO_CTA.role).toBe("employer");
    expect(EMPLOYER_DEMO_CTA.pathPrefix).toBe("/employer");
    expect(EMPLOYER_DEMO_CTA.label).toContain("arbetsgivare");
  });

  it("all CTA configs have matching role↔pathPrefix", () => {
    for (const cta of DEMO_CTAS) {
      expect(cta.pathPrefix).toBe(`/${cta.role}`);
    }
  });
});

describe("Landing uses shared CTA config", () => {
  const landing = pageSources.find((p) => p.file.includes("Landing"))!;

  it("imports TALENT_DEMO_CTA from shared config", () => {
    expect(landing.src).toContain("TALENT_DEMO_CTA");
    expect(landing.src).toMatch(/from ["']@\/lib\/constants\/demoCta["']/);
  });

  it("calls startDemo with TALENT_DEMO_CTA.role, not a hardcoded string", () => {
    expect(landing.src).toContain("TALENT_DEMO_CTA.role");
    // No hardcoded handleStartDemo("talent") or handleStartDemo("employer")
    expect(landing.src).not.toMatch(/handleStartDemo\(["']talent["']\)/);
    expect(landing.src).not.toMatch(/handleStartDemo\(["']employer["']\)/);
  });
});

describe("ForTalanger uses shared CTA config", () => {
  const ft = pageSources.find((p) => p.file.includes("ForTalanger"))!;

  it("imports TALENT_DEMO_CTA from shared config", () => {
    expect(ft.src).toContain("TALENT_DEMO_CTA");
    expect(ft.src).toMatch(/from ["']@\/lib\/constants\/demoCta["']/);
  });

  it("calls startDemo with TALENT_DEMO_CTA.role", () => {
    expect(ft.src).toContain("TALENT_DEMO_CTA.role");
  });
});

describe("Guard: no demo CTA links to /auth", () => {
  for (const { file, src } of pageSources) {
    const shortName = file.split("/").pop();

    it(`${shortName} does not contain demo CTA linking to /auth?role=`, () => {
      // /auth/signup and /auth/login for real signup are fine,
      // but /auth?role= was the old broken demo pattern
      expect(src).not.toMatch(/to="\/auth\?role=/);
    });
  }
});
