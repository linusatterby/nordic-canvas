import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// Guard: encourage using LABELS.* from src/config/labels.ts instead of
// hardcoding common kandidat-terms directly in UI components.
//
// This is a "soft" guard — it only checks UI-facing directories
// (src/app/routes, src/components) and flags a small set of terms
// that have a dedicated labels.ts key.

interface TermRule {
  /** Regex matching the hardcoded string literal (inside quotes) */
  pattern: RegExp;
  /** The recommended labels.ts key */
  labelKey: string;
}

const TERM_RULES: TermRule[] = [
  { pattern: /["'`]Kandidatprofil["'`]/, labelKey: "LABELS.candidateProfile" },
  { pattern: /["'`]Kandidater["'`]/, labelKey: "LABELS.candidates" },
  { pattern: /["'`]Kandidat["'`]/, labelKey: "LABELS.candidate" },
  { pattern: /["'`]Hitta kandidater["'`]/i, labelKey: "LABELS.findCandidates" },
  { pattern: /["'`]Sparade jobb["'`]/i, labelKey: "LABELS.savedJobsTitle" },
  { pattern: /["'`]Ansökningar["'`]/, labelKey: "LABELS.employerTabApplications" },
  { pattern: /["'`]Kandidatpool["'`]/, labelKey: "LABELS.employerTabPool" },
];

// Only scan UI-layer directories
const SCAN_DIRS = ["src/app/routes", "src/components"];
const SCAN_EXT = new Set([".ts", ".tsx"]);

// Files allowed to hardcode these terms (with reason)
const ALLOWED_FILES = new Set([
  // labels.ts IS the source of truth
  "src/config/labels.ts",
  // This test file references the terms in its own rules
  "src/test/guards/labels-single-source.test.ts",
]);

function collectFiles(dir: string, root: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, root));
    } else if (entry.isFile() && SCAN_EXT.has(path.extname(entry.name))) {
      results.push(rel);
    }
  }
  return results;
}

describe("Labels single-source guard", () => {
  it("UI components should use LABELS.* instead of hardcoded kandidat-terms", () => {
    const root = process.cwd();
    const files = SCAN_DIRS.flatMap((d) => collectFiles(path.join(root, d), root));
    const violations: string[] = [];

    for (const file of files) {
      if (ALLOWED_FILES.has(file)) continue;
      const content = fs.readFileSync(file, "utf-8");

      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        for (const rule of TERM_RULES) {
          if (rule.pattern.test(lines[i])) {
            violations.push(
              `  ${file}:${i + 1}  Use ${rule.labelKey}  →  ${lines[i].trim().slice(0, 100)}`
            );
          }
        }
      }
    }

    if (violations.length) {
      throw new Error(
        [
          `Found ${violations.length} hardcoded kandidat-term(s) that should use LABELS from src/config/labels.ts:`,
          "",
          ...violations,
          "",
          "Fix: import { LABELS } from '@/config/labels' and use the recommended key.",
        ].join("\n")
      );
    }
  });

  it("TERM_RULES patterns match expected strings", () => {
    expect(TERM_RULES[0].pattern.test('"Kandidatprofil"')).toBe(true);
    expect(TERM_RULES[1].pattern.test('"Kandidater"')).toBe(true);
    expect(TERM_RULES[2].pattern.test("'Kandidat'")).toBe(true);
    expect(TERM_RULES[3].pattern.test('"Hitta kandidater"')).toBe(true);
    expect(TERM_RULES[4].pattern.test('"Sparade jobb"')).toBe(true);
    expect(TERM_RULES[5].pattern.test('"Ansökningar"')).toBe(true);
    expect(TERM_RULES[6].pattern.test('"Kandidatpool"')).toBe(true);
  });

  it("does not flag non-quoted occurrences", () => {
    // Variable names, comments, etc. should not trigger
    expect(TERM_RULES[2].pattern.test("const Kandidat = 5")).toBe(false);
    expect(TERM_RULES[1].pattern.test("// Kandidater here")).toBe(false);
  });
});
