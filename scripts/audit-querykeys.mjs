#!/usr/bin/env node
/**
 * QueryKey audit – ensures no inline queryKey arrays exist outside the canonical file.
 * Exit code 1 if violations found; 0 otherwise.
 *
 * Usage:  node scripts/audit-querykeys.mjs
 */

import { execSync } from "node:child_process";

const pattern = "queryKey:\\s*\\[";
const include = "--include='*.ts' --include='*.tsx'";
const exclude =
  "--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git " +
  "--exclude='queryKeys.ts' --exclude='*.test.ts' --exclude='*.test.tsx' --exclude='*.spec.ts'";

try {
  const result = execSync(
    `grep -rnE '${pattern}' src/ ${include} ${exclude}`,
    { encoding: "utf-8" },
  );

  if (result.trim()) {
    console.error("❌  Inline queryKey arrays found – use queryKeys.* from src/lib/queryKeys.ts:\n");
    console.error(result.trim());
    process.exit(1);
  }
} catch (err) {
  // grep exits 1 when no matches – that's success for us
  if (err.status === 1) {
    console.log("✅  No inline queryKey arrays found.");
    process.exit(0);
  }
  // Actual error
  console.error("Audit script error:", err.message);
  process.exit(2);
}
