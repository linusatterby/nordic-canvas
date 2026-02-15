import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function: seed-test
 *
 * Idempotent seed of baseline demo/test data.
 * Guards:
 *   - Only callable with service_role key (Authorization header)
 *   - Checks BACKEND_ENV !== "live" to prevent accidental live seeding
 *
 * Idempotency: uses upsert with natural keys (name for orgs, composite for members, etc.)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Auth guard ---
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(
      JSON.stringify({ ok: false, error: "Unauthorized – service_role required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // --- Env guard: never seed live ---
  const backendEnv = Deno.env.get("BACKEND_ENV") || "test";
  if (backendEnv === "live") {
    console.error("[seed-test] BLOCKED: BACKEND_ENV=live – seed aborted");
    return new Response(
      JSON.stringify({ ok: false, error: "Seed blocked: BACKEND_ENV=live" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const sb = createClient(supabaseUrl, serviceRoleKey);

  const results: Record<string, unknown> = {};
  const errors: string[] = [];
  const startTime = Date.now();

  console.log("[seed-test] seed_started", { backendEnv });

  try {
    // ── 1. Baseline demo org ──
    const orgName = "Testföretag AB";
    const orgLocation = "Stockholm";
    const { data: org, error: orgErr } = await sb
      .from("orgs")
      .upsert(
        { name: orgName, location: orgLocation, is_demo: true },
        { onConflict: "name", ignoreDuplicates: false },
      )
      .select("id")
      .single();

    if (orgErr) {
      // If upsert fails due to missing unique constraint, try select + insert
      const { data: existing } = await sb
        .from("orgs")
        .select("id")
        .eq("name", orgName)
        .eq("is_demo", true)
        .maybeSingle();

      if (existing) {
        results.org = { id: existing.id, status: "already_exists" };
      } else {
        const { data: inserted, error: insertErr } = await sb
          .from("orgs")
          .insert({ name: orgName, location: orgLocation, is_demo: true })
          .select("id")
          .single();
        if (insertErr) {
          errors.push(`org insert: ${insertErr.message}`);
        } else {
          results.org = { id: inserted?.id, status: "created" };
        }
      }
    } else {
      results.org = { id: org?.id, status: "upserted" };
    }

    const orgId = (results.org as { id?: string })?.id;

    // ── 2. Demo talent cards (idempotent via name check) ──
    if (orgId) {
      const baselineCards = [
        { name: "Anna Svensson", location: "Stockholm", role_key: "kock", skills: ["matlagning", "hygien"], is_demo: true },
        { name: "Erik Johansson", location: "Göteborg", role_key: "servitör", skills: ["service", "vin"], is_demo: true },
        { name: "Maria Lindström", location: "Malmö", role_key: "receptionist", skills: ["bokning", "språk"], is_demo: true },
      ];

      for (const card of baselineCards) {
        const { data: existing } = await sb
          .from("demo_talent_cards")
          .select("id")
          .eq("name", card.name)
          .eq("is_demo", true)
          .maybeSingle();

        if (existing) {
          results[`card_${card.name}`] = "already_exists";
        } else {
          const { error: cardErr } = await sb.from("demo_talent_cards").insert(card);
          if (cardErr) {
            errors.push(`card ${card.name}: ${cardErr.message}`);
          } else {
            results[`card_${card.name}`] = "created";
          }
        }
      }

      // ── 3. Baseline job posts ──
      const baselineJobs = [
        {
          title: "Kock – Sommarsäsong",
          org_id: orgId,
          role_key: "kock",
          location: "Stockholm",
          start_date: "2026-06-01",
          end_date: "2026-08-31",
          is_demo: true,
          listing_type: "job",
          status: "published",
        },
        {
          title: "Servitör – Hotell Riviera",
          org_id: orgId,
          role_key: "servitör",
          location: "Göteborg",
          start_date: "2026-06-15",
          end_date: "2026-09-15",
          is_demo: true,
          listing_type: "job",
          status: "published",
        },
      ];

      for (const job of baselineJobs) {
        const { data: existing } = await sb
          .from("job_posts")
          .select("id")
          .eq("title", job.title)
          .eq("org_id", orgId)
          .eq("is_demo", true)
          .maybeSingle();

        if (existing) {
          results[`job_${job.title}`] = "already_exists";
        } else {
          const { error: jobErr } = await sb.from("job_posts").insert(job);
          if (jobErr) {
            errors.push(`job ${job.title}: ${jobErr.message}`);
          } else {
            results[`job_${job.title}`] = "created";
          }
        }
      }
    }

    const elapsed = Date.now() - startTime;
    console.log("[seed-test] seed_completed", { elapsed, errors: errors.length });

    return new Response(
      JSON.stringify({
        ok: errors.length === 0,
        elapsed_ms: elapsed,
        results,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = (err as Error).message;
    console.error("[seed-test] seed_failed", msg);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
