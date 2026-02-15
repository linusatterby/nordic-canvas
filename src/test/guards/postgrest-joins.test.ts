/**
 * Guard test: ensures all PostgREST .select() joins on `orgs` use explicit FK hints.
 *
 * Unqualified `orgs(...)` joins cause PGRST201 (ambiguous relationship) when
 * multiple tables reference `orgs`. This test scans our API layer and fails
 * if it finds any join missing an explicit hint like `orgs!<fk>(...)`.
 *
 * Scope: only files that actually contain Supabase query-builder usage.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/** Recursively list all .ts files under a directory (skip test files) */
function listTsFiles(dir: string): string[] {
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs)) return [];
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const full = path.join(abs, e.name);
    if (e.isDirectory()) {
      files.push(...listTsFiles(full));
    } else if (
      e.name.endsWith(".ts") &&
      !e.name.endsWith(".test.ts") &&
      !e.name.endsWith(".md")
    ) {
      files.push(full);
    }
  }
  return files;
}

/** Check if a file actually uses the Supabase query builder */
function isQueryFile(content: string): boolean {
  return (
    content.includes(".from(") &&
    (content.includes(".select(") || content.includes(".select`"))
  );
}

/**
 * Matches bare `orgs` joins WITHOUT an FK hint (`!`).
 * Looks for `orgs` followed by optional whitespace then `(`
 * but NOT preceded by `!` or `:`.
 */
const BARE_ORGS_JOIN = /(?<![!:])orgs\s*\(/g;

/** Lines that are clearly not PostgREST select strings */
function isNonSelectContext(line: string): boolean {
  // Skip comments, imports, exports
  if (/^\s*(\/\/|\/\*|\*|import |export )/.test(line)) return true;
  // .from("orgs") is a table query, not a join
  if (/\.from\(\s*["']orgs["']\s*\)/.test(line)) return true;
  // optional chaining like orgs?.name
  if (/orgs\?\.\w/.test(line)) return true;
  // query key builders like queryKeys.demo.orgs()
  if (/queryKeys?\.\w/.test(line)) return true;
  // variable/type declarations without .select
  if (
    /(?:const |let |var |function |return |interface |type )/.test(line) &&
    !line.includes(".select")
  )
    return true;
  // array assignment
  if (/orgs\s*[=:]\s*\[/.test(line)) return true;
  // JS array methods
  if (/\.filter\(|\.map\(|\.forEach\(|\.set\(/.test(line)) return true;
  // destructuring without select
  if (/\{.*orgs.*\}/.test(line) && !line.includes("select")) return true;
  // string literal table name in from()
  if (/from\(\s*['"]orgs['"]/.test(line)) return true;
  return false;
}

describe("PostgREST join guard: orgs must use explicit FK hint", () => {
  const scanDirs = ["src/lib/api", "src/lib/supabase", "src/hooks"];
  const allFiles = scanDirs.flatMap(listTsFiles);

  // Filter to only files that actually contain query-builder usage
  const queryFiles = allFiles.filter((f) => {
    const content = fs.readFileSync(f, "utf-8");
    return isQueryFile(content);
  });

  it("scans at least some query files", () => {
    expect(queryFiles.length).toBeGreaterThan(0);
  });

  it("no bare orgs(...) joins without FK hint in select strings", () => {
    const violations: { file: string; line: number; snippet: string }[] = [];

    for (const filePath of queryFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

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
