import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Guardrail: forbid imports from the legacy @/pages or src/pages directory.
 * All route components must live under src/app/routes/.
 */

function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")) {
      results.push(full);
    }
  }
  return results;
}

describe("No @/pages imports guardrail", () => {
  it("no source file imports from @/pages or src/pages", () => {
    const srcDir = path.resolve(__dirname, "../../");
    const files = collectTsFiles(srcDir);
    const violations: string[] = [];
    const pattern = /(?:from\s+["']@\/pages|from\s+["']\.\.?\/.*pages\/)/;

    for (const file of files) {
      // Skip this test file itself and test fixtures
      if (file.includes("no-pages-imports")) continue;
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          violations.push(`${path.relative(srcDir, file)}:${i + 1}  ${lines[i].trim()}`);
        }
      }
    }

    expect(violations, `Found imports from @/pages:\n${violations.join("\n")}`).toEqual([]);
  });

  it("src/pages directory should not exist", () => {
    const pagesDir = path.resolve(__dirname, "../../pages");
    const exists = fs.existsSync(pagesDir);
    expect(exists, "src/pages/ directory still exists — remove it").toBe(false);
  });
});
