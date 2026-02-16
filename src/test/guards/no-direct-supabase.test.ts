import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Guardrail: hooks and route components must NOT import the Supabase client directly.
 * All data access must go through src/lib/api/*.
 *
 * Allowed exceptions are listed in ALLOWED_FILES.
 */

const ALLOWED_FILES = new Set([
  "src/contexts/AuthContext.tsx",   // Auth context needs direct session access
  "src/hooks/useSession.ts",        // Session hook wraps auth listener
  "src/hooks/useScheduler.ts",      // TODO: refactor to use API layer
]);

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

const SUPABASE_IMPORT_PATTERN = /from\s+["']@\/integrations\/supabase\/client["']/;

describe("No direct Supabase imports in hooks/routes", () => {
  const root = path.resolve(__dirname, "../..");
  const scanDirs = [
    path.join(root, "hooks"),
    path.join(root, "app/routes"),
    path.join(root, "components"),
  ];

  it("hooks, routes, and components do not import supabase client directly", () => {
    const violations: string[] = [];

    for (const dir of scanDirs) {
      const files = collectTsFiles(dir);
      for (const file of files) {
        const relPath = path.relative(root, file).replace(/\\/g, "/");
        const srcPath = `src/${relPath}`;
        if (ALLOWED_FILES.has(srcPath)) continue;

        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (SUPABASE_IMPORT_PATTERN.test(lines[i])) {
            violations.push(`${srcPath}:${i + 1}  ${lines[i].trim()}`);
          }
        }
      }
    }

    expect(
      violations,
      `Direct Supabase client imports found outside API layer:\n${violations.join("\n")}\n\nMove these to src/lib/api/*.ts`
    ).toEqual([]);
  });
});
