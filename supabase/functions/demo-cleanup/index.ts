import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function: demo-cleanup
 * Deletes demo data older than 48 hours across all session-isolated tables.
 * Intended to run on a schedule (pg_cron every 48h) or ad-hoc.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate secret to prevent unauthorized calls
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  // Accept either CRON_SECRET or service_role key
  if (
    cronSecret &&
    authHeader !== `Bearer ${cronSecret}` &&
    authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
  ) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceRoleKey);

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // Tables with demo_session_id to clean up (ordered to respect FK constraints)
  const tables = [
    "demo_chat_messages",
    "demo_release_offers",
    "demo_shift_bookings",
    "demo_matches",
    "demo_chat_threads",
    "candidate_interactions",
    "employer_demo_talent_swipes",
    "borrow_offers",
    "borrow_requests",
    "talent_job_swipes",
    "talent_visibility",
    "talent_profiles",
    "messages",
    "matches",
    "job_posts",
    "org_members",
    "profiles",
    "orgs",
    "notifications",
    "activity_events",
  ];

  const results: Record<string, number | string> = {};

  for (const table of tables) {
    try {
      const { count, error } = await sb
        .from(table)
        .delete({ count: "exact" })
        .not("demo_session_id", "is", null)
        .lt("created_at", cutoff);

      if (error) {
        results[table] = `error: ${error.message}`;
      } else {
        results[table] = count ?? 0;
      }
    } catch (err) {
      results[table] = `error: ${(err as Error).message}`;
    }
  }

  // Clean up stale demo_sessions themselves
  try {
    const { count, error } = await sb
      .from("demo_sessions")
      .delete({ count: "exact" })
      .lt("created_at", cutoff);

    results["demo_sessions"] = error ? `error: ${error.message}` : (count ?? 0);
  } catch (err) {
    results["demo_sessions"] = `error: ${(err as Error).message}`;
  }

  console.log("[demo-cleanup] Results:", JSON.stringify(results));

  return new Response(JSON.stringify({ ok: true, cleaned: results, cutoff }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
