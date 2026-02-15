#!/usr/bin/env node
/**
 * CLI wrapper for the seed-test edge function.
 *
 * Usage:
 *   node scripts/seed-test.mjs
 *
 * Requires env vars:
 *   VITE_SUPABASE_URL (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_BACKEND_ENV (must be "test", default)
 *
 * Guards: exits with code 1 if BACKEND_ENV is "live".
 */

const backendEnv = process.env.VITE_BACKEND_ENV || process.env.BACKEND_ENV || "test";

if (backendEnv === "live") {
  console.error("❌ BLOCKED: BACKEND_ENV=live – seed scripts cannot run against live.");
  console.error("   Set VITE_BACKEND_ENV=test to run seed.");
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error("❌ Missing SUPABASE_URL or VITE_SUPABASE_URL");
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY");
  console.error("   Get it from Lovable Cloud → Cloud View → Project Settings");
  process.exit(1);
}

const url = `${supabaseUrl}/functions/v1/seed-test`;

console.log(`🌱 Running seed against ${backendEnv} environment...`);
console.log(`   URL: ${supabaseUrl}`);

try {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  });

  const body = await res.json();

  if (!res.ok) {
    console.error(`❌ Seed failed (HTTP ${res.status}):`, body);
    process.exit(1);
  }

  if (body.ok) {
    console.log(`✅ Seed completed in ${body.elapsed_ms}ms`);
    console.log("   Results:", JSON.stringify(body.results, null, 2));
  } else {
    console.error("❌ Seed returned errors:", body.errors);
    process.exit(1);
  }
} catch (err) {
  console.error("❌ Seed request failed:", err.message);
  process.exit(1);
}
