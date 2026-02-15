#!/usr/bin/env node
/**
 * CI guardrail: fail if JS bundle exceeds size thresholds.
 *
 * Reads dist/assets/*.js and checks:
 *   - total JS size < BUNDLE_MAX_TOTAL_KB (default 2500)
 *   - largest single chunk < BUNDLE_MAX_CHUNK_KB (default 800)
 *
 * Usage:
 *   node scripts/audit-bundle.mjs          # uses defaults
 *   BUNDLE_MAX_TOTAL_KB=3000 node scripts/audit-bundle.mjs
 */

import { readdirSync, statSync } from "fs";
import { join } from "path";

const DIST_ASSETS = join(process.cwd(), "dist", "assets");
const MAX_TOTAL_KB = Number(process.env.BUNDLE_MAX_TOTAL_KB || 2500);
const MAX_CHUNK_KB = Number(process.env.BUNDLE_MAX_CHUNK_KB || 800);

let files;
try {
  files = readdirSync(DIST_ASSETS);
} catch {
  console.error("❌ dist/assets not found — run `npx vite build` first");
  process.exit(1);
}

const jsFiles = files
  .filter((f) => f.endsWith(".js"))
  .map((f) => {
    const fullPath = join(DIST_ASSETS, f);
    const sizeKB = statSync(fullPath).size / 1024;
    return { name: f, sizeKB };
  })
  .sort((a, b) => b.sizeKB - a.sizeKB);

const totalKB = jsFiles.reduce((sum, f) => sum + f.sizeKB, 0);
const largest = jsFiles[0];

console.log(`\n📦 Bundle audit (thresholds: total=${MAX_TOTAL_KB}KB, chunk=${MAX_CHUNK_KB}KB)`);
console.log(`   Total JS: ${totalKB.toFixed(1)} KB across ${jsFiles.length} chunks`);
if (largest) {
  console.log(`   Largest:  ${largest.name} — ${largest.sizeKB.toFixed(1)} KB`);
}

// Show top 5
console.log("\n   Top chunks:");
jsFiles.slice(0, 5).forEach((f) => {
  console.log(`     ${f.sizeKB.toFixed(1).padStart(8)} KB  ${f.name}`);
});

let failed = false;

if (totalKB > MAX_TOTAL_KB) {
  console.error(`\n❌ FAIL: Total JS ${totalKB.toFixed(1)} KB exceeds ${MAX_TOTAL_KB} KB`);
  failed = true;
}

if (largest && largest.sizeKB > MAX_CHUNK_KB) {
  console.error(`❌ FAIL: Chunk "${largest.name}" ${largest.sizeKB.toFixed(1)} KB exceeds ${MAX_CHUNK_KB} KB`);
  failed = true;
}

if (failed) {
  console.error("\n💡 Fix: lazy-load heavy routes, split large libs, or raise thresholds via env vars.\n");
  process.exit(1);
}

console.log("\n✅ Bundle size OK\n");
