#!/usr/bin/env node
/**
 * CI audit: ensure SUPABASE_SERVICE_ROLE_KEY and related secrets
 * never appear in client-side source code (src/).
 *
 * Exit 0 = clean, Exit 1 = leak found.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const SRC_DIR = "src";
const FORBIDDEN_PATTERNS = [
  /SUPABASE_SERVICE_ROLE_KEY/,
  /SERVICE_ROLE_KEY/,
  /service_role/i,
  /supabase_service_role/i,
];

// Allowlisted files (e.g. comments in diagnostics mentioning "service_role")
const ALLOWLIST = [
  "AdminDiagnostics.tsx", // mentions "service_role" in UI text
];

const CODE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

async function* walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      yield* walkDir(fullPath);
    } else if (CODE_EXTS.has(extname(entry.name))) {
      yield fullPath;
    }
  }
}

let violations = 0;

for await (const filePath of walkDir(SRC_DIR)) {
  const fileName = filePath.split("/").pop();
  if (ALLOWLIST.includes(fileName)) continue;

  const content = await readFile(filePath, "utf-8");
  for (const pattern of FORBIDDEN_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      console.error(`❌ LEAK: "${match[0]}" found in ${filePath}`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\n❌ Found ${violations} secret reference(s) in src/. Fix before merging.`);
  process.exit(1);
} else {
  console.log("✅ No service_role or secret references found in src/");
  process.exit(0);
}
