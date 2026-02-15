import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Demo CTA routing", () => {
  const landingSrc = readFileSync(resolve("src/app/routes/(public)/Landing.tsx"), "utf-8");
  const forTalangerSrc = readFileSync(resolve("src/app/routes/(public)/ForTalanger.tsx"), "utf-8");

  it("Landing 'Testa demo som talang' calls startDemo with talent role", () => {
    expect(landingSrc).toContain('handleStartDemo("talent")');
    expect(landingSrc).toContain("Testa demo som talang");
  });

  it("Landing does NOT hardcode employer-only demo start", () => {
    // The bottom CTA should no longer default to employer
    expect(landingSrc).not.toMatch(/handleStartDemo\("employer"\)/);
  });

  it("ForTalanger talent CTA calls startDemo, not a Link to /auth", () => {
    expect(forTalangerSrc).toContain('startDemo("talent")');
    expect(forTalangerSrc).not.toMatch(/to="\/auth\?role=talent"/);
  });
});
