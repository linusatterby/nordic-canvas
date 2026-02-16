import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Guard: no remnants of the old brand name "Seasonal Talent" anywhere
 * in source code or config (case-insensitive).
 *
 * Allowed exceptions:
 *  - this test file itself
 *  - CHANGELOG / migration notes
 *  - .git internals
 *  - node_modules
 */

const OLD_BRAND_RE = /seasonal\s+talent/i;

const EXCLUDED_DIRS = new Set(["node_modules", ".git", "dist", ".next", "supabase/migrations"]);
const EXCLUDED_FILES = new Set([
  "src/test/guards/no-old-brand.test.ts", // this file
]);

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(process.cwd(), full);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(rel) && !EXCLUDED_DIRS.has(entry.name)) {
        results.push(...collectFiles(full));
      }
    } else if (entry.isFile()) {
      results.push(rel);
    }
  }
  return results;
}

describe("No old brand name remnants", () => {
  it("should not contain 'Seasonal Talent' anywhere in repo", () => {
    const root = process.cwd();
    const files = collectFiles(root);
    const violations: string[] = [];

    for (const file of files) {
      if (EXCLUDED_FILES.has(file)) continue;
      // Only check text-ish files
      if (/\.(ts|tsx|js|jsx|css|html|md|json|toml|yml|yaml|svg)$/.test(file)) {
        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (OLD_BRAND_RE.test(lines[i])) {
            violations.push(`${file}:${i + 1}  →  ${lines[i].trim().slice(0, 120)}`);
          }
        }
      }
    }

    if (violations.length) {
      throw new Error(
        `Found ${violations.length} remnants of old brand name:\n${violations.join("\n")}`
      );
    }
  });
});
