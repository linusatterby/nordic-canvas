/**
 * Guard test: ensures all PostgREST .select() joins on `orgs` use explicit FK hints.
 *
 * Unqualified `orgs(...)` joins cause PGRST201 (ambiguous relationship) when
 * multiple tables reference `orgs`. This test scans our API layer and fails
 * if it finds any join missing an explicit hint like `orgs!<fk>(...)` or `orgs:<col>(...)`.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/** Recursively list all .ts files under a directory */
function listTsFiles(dir: string): string[] {
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs)) return [];
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const full = path.join(abs, e.name);
    if (e.isDirectory()) {
      files.push(...listTsFiles(full));
    } else if (e.name.endsWith(".ts") && !e.name.endsWith(".test.ts")) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Matches bare `orgs` joins WITHOUT an FK hint (`!`) or column hint (`:`).
 *
 * Good:  orgs!job_posts_org_id_fkey ( name )
 * Good:  orgs:org_id (name)
 * Bad:   orgs ( name )
 * Bad:   orgs(name)
 * Bad:   , orgs ( * )
 *
 * We look for the word `orgs` followed by optional whitespace then `(`
 * but NOT preceded by `!` or `:`.
 */
const BARE_ORGS_JOIN = /(?<![!:])orgs\s*\(/g;

/** Lines that are clearly JS/TS code, not PostgREST select strings */
function isNonSelectContext(line: string): boolean {
  // Skip: variable declarations, function signatures, TS types, imports, comments, .from("orgs"), .delete/insert
  if (/^\s*(\/\/|\/\*|\*|import |export )/.test(line)) return true;
  if (/\.from\(\s*["']orgs["']\s*\)/.test(line)) return true;
  if (/orgs\?\.\w/.test(line)) return true; // optional chaining like orgs?.name
  if (/queryKeys?\.\w/.test(line)) return true; // query key builders like queryKeys.demo.orgs()
  if (/const |let |var |function |return |interface |type /.test(line) && !line.includes(".select")) return true;
  if (/orgs\s*[=:]\s*\[/.test(line)) return true; // array assignment
  if (/\.filter\(|\.map\(|\.forEach\(|\.set\(/.test(line)) return true;
  if (/\{.*orgs.*\}/.test(line) && !line.includes("select")) return true; // destructuring
  return false;
}

describe("PostgREST join guard: orgs must use explicit FK hint", () => {
  const scanDirs = ["src/lib/api", "src/lib/supabase", "src/hooks"];
  const allFiles = scanDirs.flatMap(listTsFiles);

  it("scans at least some API files", () => {
    expect(allFiles.length).toBeGreaterThan(0);
  });

  it("no bare orgs(...) joins without FK/column hint in select strings", () => {
    const violations: { file: string; line: number; snippet: string }[] = [];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      // We specifically look inside template literals / strings that are likely .select() args
      // Strategy: scan line-by-line for bare `orgs(` pattern
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (isNonSelectContext(line)) continue;
        
        BARE_ORGS_JOIN.lastIndex = 0;
        if (BARE_ORGS_JOIN.test(line)) {
          const rel = path.relative(process.cwd(), filePath);
          violations.push({
            file: rel,
            line: i + 1,
            snippet: line.trim().slice(0, 80),
          });
        }
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map((v) => `  ${v.file}:${v.line}  →  ${v.snippet}`)
        .join("\n");
      expect.fail(
        `Found ${violations.length} unqualified orgs(...) join(s). ` +
          `Use orgs!<fk_name>(...) instead:\n${msg}`
      );
    }
  });
});
