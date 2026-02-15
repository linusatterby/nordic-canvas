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

  // Tables with both demo_session_id AND created_at columns
  const tablesWithCreatedAt = [
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
    "job_posts",
    "profiles",
    "orgs",
  ];

  // Tables with demo_session_id but NO created_at (use updated_at or just session filter)
  const tablesWithoutCreatedAt = [
    "org_members",     // no created_at, no updated_at — clean by session age
    "talent_profiles", // no created_at — clean by session age
    "talent_visibility", // has updated_at but no created_at — clean by session age
  ];

  // NOTE: activity_events, matches, messages, notifications do NOT have demo_session_id
  // They are cleaned indirectly when their parent records are removed, or via is_demo flag

  const results: Record<string, number | string> = {};

  // Clean tables with created_at
  for (const table of tablesWithCreatedAt) {
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

  // Clean tables without created_at by joining on demo_sessions age
  // We delete rows whose demo_session_id refers to a session older than the cutoff
  for (const table of tablesWithoutCreatedAt) {
    try {
      // Get stale session IDs first
      const { data: staleSessions } = await sb
        .from("demo_sessions")
        .select("id")
        .lt("created_at", cutoff);

      if (staleSessions && staleSessions.length > 0) {
        const staleIds = staleSessions.map((s: { id: string }) => s.id);
        const { count, error } = await sb
          .from(table)
          .delete({ count: "exact" })
          .in("demo_session_id", staleIds);

        results[table] = error ? `error: ${error.message}` : (count ?? 0);
      } else {
        results[table] = 0;
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
