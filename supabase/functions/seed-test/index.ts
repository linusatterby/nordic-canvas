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
 * Idempotency: uses title+org_id for jobs, name for orgs, name for talent cards.
 */

// ── Demo Orgs ──
const DEMO_ORGS = [
  { name: "Fjällhotellet Åre", location: "Åre", is_demo: true },
  { name: "Visby Strandhotell", location: "Visby", is_demo: true },
  { name: "Sälen Resort & Spa", location: "Sälen", is_demo: true },
] as const;

// ── Demo Jobs (15 total) ──
// org_index references DEMO_ORGS by index
interface DemoJobSeed {
  title: string;
  org_index: number;
  role_key: string;
  location: string;
  start_date: string;
  end_date: string;
  listing_type: "job" | "shift_cover";
  housing_offered: boolean;
  housing_text: string | null;
  shift_required: boolean;
}

const DEMO_JOBS: DemoJobSeed[] = [
  // ── Tillsvidare/långtid (5) ──
  {
    title: "Servis – heltid",
    org_index: 1, // Visby
    role_key: "servitör",
    location: "Visby",
    start_date: "2026-03-01",
    end_date: "2027-03-01",
    listing_type: "job",
    housing_offered: false,
    housing_text: null,
    shift_required: false,
  },
  {
    title: "Kock – hotellkök",
    org_index: 0, // Åre
    role_key: "kock",
    location: "Åre",
    start_date: "2026-04-01",
    end_date: "2027-04-01",
    listing_type: "job",
    housing_offered: true,
    housing_text: "Personalboende ingår",
    shift_required: false,
  },
  {
    title: "Receptionist – resort",
    org_index: 1, // Visby
    role_key: "receptionist",
    location: "Visby",
    start_date: "2026-03-15",
    end_date: "2027-03-15",
    listing_type: "job",
    housing_offered: false,
    housing_text: null,
    shift_required: false,
  },
  {
    title: "Drift/fastighet – allround",
    org_index: 0, // Åre
    role_key: "drift",
    location: "Åre",
    start_date: "2026-05-01",
    end_date: "2027-05-01",
    listing_type: "job",
    housing_offered: true,
    housing_text: "Lägenhet på orten",
    shift_required: false,
  },
  {
    title: "Housekeeping – teamledare",
    org_index: 1, // Visby
    role_key: "housekeeping",
    location: "Visby",
    start_date: "2026-04-01",
    end_date: "2027-04-01",
    listing_type: "job",
    housing_offered: false,
    housing_text: null,
    shift_required: false,
  },

  // ── Säsongsjobb (5) ──
  {
    title: "Liftvärd",
    org_index: 0, // Åre
    role_key: "liftvärd",
    location: "Åre",
    start_date: "2026-12-01",
    end_date: "2027-04-30",
    listing_type: "job",
    housing_offered: true,
    housing_text: "Delat personalboende",
    shift_required: false,
  },
  {
    title: "Bartender – afterski",
    org_index: 0, // Åre
    role_key: "bartender",
    location: "Åre",
    start_date: "2027-01-01",
    end_date: "2027-03-31",
    listing_type: "job",
    housing_offered: true,
    housing_text: "Rum i personalboende",
    shift_required: false,
  },
  {
    title: "Kök/café",
    org_index: 2, // Sälen
    role_key: "kock",
    location: "Sälen",
    start_date: "2026-12-01",
    end_date: "2027-03-31",
    listing_type: "job",
    housing_offered: false,
    housing_text: null,
    shift_required: false,
  },
  {
    title: "Eventvärd – sommar",
    org_index: 1, // Visby
    role_key: "event",
    location: "Visby",
    start_date: "2026-06-01",
    end_date: "2026-08-31",
    listing_type: "job",
    housing_offered: false,
    housing_text: null,
    shift_required: false,
  },
  {
    title: "Servering – sommar",
    org_index: 1, // Visby
    role_key: "servitör",
    location: "Visby",
    start_date: "2026-06-01",
    end_date: "2026-08-31",
    listing_type: "job",
    housing_offered: true,
    housing_text: "Boende i centrala Visby",
    shift_required: false,
  },

  // ── Extrapass / shift_cover (5) ──
  {
    title: "Extrapass: servis",
    org_index: 1, // Visby
    role_key: "servitör",
    location: "Visby",
    start_date: "2026-03-01",
    end_date: "2026-12-31",
    listing_type: "shift_cover",
    housing_offered: false,
    housing_text: null,
    shift_required: true,
  },
  {
    title: "Extrapass: disk/kök",
    org_index: 1, // Visby
    role_key: "kock",
    location: "Visby",
    start_date: "2026-03-01",
    end_date: "2026-12-31",
    listing_type: "shift_cover",
    housing_offered: false,
    housing_text: null,
    shift_required: true,
  },
  {
    title: "Extrapass: hotellfrukost",
    org_index: 0, // Åre
    role_key: "servitör",
    location: "Åre",
    start_date: "2026-03-01",
    end_date: "2026-12-31",
    listing_type: "shift_cover",
    housing_offered: false,
    housing_text: null,
    shift_required: true,
  },
  {
    title: "Extrapass: event",
    org_index: 1, // Visby
    role_key: "event",
    location: "Visby",
    start_date: "2026-03-01",
    end_date: "2026-12-31",
    listing_type: "shift_cover",
    housing_offered: false,
    housing_text: null,
    shift_required: true,
  },
  {
    title: "Extrapass: housekeeping",
    org_index: 0, // Åre
    role_key: "housekeeping",
    location: "Åre",
    start_date: "2026-03-01",
    end_date: "2026-12-31",
    listing_type: "shift_cover",
    housing_offered: false,
    housing_text: null,
    shift_required: true,
  },
];

// ── Demo Talent Cards ──
const DEMO_TALENT_CARDS = [
  { name: "Anna Svensson", location: "Stockholm", role_key: "kock", skills: ["matlagning", "hygien"], is_demo: true },
  { name: "Erik Johansson", location: "Göteborg", role_key: "servitör", skills: ["service", "vin"], is_demo: true },
  { name: "Maria Lindström", location: "Malmö", role_key: "receptionist", skills: ["bokning", "språk"], is_demo: true },
];

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
    // ── 1. Demo orgs (idempotent via name lookup) ──
    const orgIds: string[] = [];

    for (const orgDef of DEMO_ORGS) {
      const { data: existing } = await sb
        .from("orgs")
        .select("id")
        .eq("name", orgDef.name)
        .eq("is_demo", true)
        .maybeSingle();

      if (existing) {
        orgIds.push(existing.id);
        results[`org_${orgDef.name}`] = { id: existing.id, status: "already_exists" };
      } else {
        const { data: inserted, error: insertErr } = await sb
          .from("orgs")
          .insert({ name: orgDef.name, location: orgDef.location, is_demo: true })
          .select("id")
          .single();
        if (insertErr) {
          errors.push(`org ${orgDef.name}: ${insertErr.message}`);
          orgIds.push(""); // placeholder
        } else {
          orgIds.push(inserted.id);
          results[`org_${orgDef.name}`] = { id: inserted.id, status: "created" };
        }
      }
    }

    // Also ensure legacy "Testföretag AB" org exists for backward compat
    const legacyOrgName = "Testföretag AB";
    const { data: legacyOrg } = await sb
      .from("orgs")
      .select("id")
      .eq("name", legacyOrgName)
      .eq("is_demo", true)
      .maybeSingle();

    let legacyOrgId: string | null = null;
    if (legacyOrg) {
      legacyOrgId = legacyOrg.id;
      results[`org_${legacyOrgName}`] = { id: legacyOrg.id, status: "already_exists" };
    } else {
      const { data: inserted, error: insertErr } = await sb
        .from("orgs")
        .insert({ name: legacyOrgName, location: "Stockholm", is_demo: true })
        .select("id")
        .single();
      if (insertErr) {
        errors.push(`org ${legacyOrgName}: ${insertErr.message}`);
      } else {
        legacyOrgId = inserted.id;
        results[`org_${legacyOrgName}`] = { id: inserted.id, status: "created" };
      }
    }

    // ── 2. Demo talent cards (idempotent via name) ──
    for (const card of DEMO_TALENT_CARDS) {
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

    // ── 3. Demo jobs — 15 global jobs (idempotent via title + org_id) ──
    let jobsCreated = 0;
    let jobsExisting = 0;

    for (const jobDef of DEMO_JOBS) {
      const orgId = orgIds[jobDef.org_index];
      if (!orgId) {
        errors.push(`job "${jobDef.title}": org at index ${jobDef.org_index} missing`);
        continue;
      }

      const { data: existing } = await sb
        .from("job_posts")
        .select("id")
        .eq("title", jobDef.title)
        .eq("org_id", orgId)
        .eq("is_demo", true)
        .maybeSingle();

      if (existing) {
        jobsExisting++;
        results[`job_${jobDef.title}`] = "already_exists";
      } else {
        const { error: jobErr } = await sb.from("job_posts").insert({
          title: jobDef.title,
          org_id: orgId,
          role_key: jobDef.role_key,
          location: jobDef.location,
          start_date: jobDef.start_date,
          end_date: jobDef.end_date,
          listing_type: jobDef.listing_type,
          housing_offered: jobDef.housing_offered,
          housing_text: jobDef.housing_text,
          shift_required: jobDef.shift_required,
          is_demo: true,
          status: "published",
        });
        if (jobErr) {
          errors.push(`job "${jobDef.title}": ${jobErr.message}`);
        } else {
          jobsCreated++;
          results[`job_${jobDef.title}`] = "created";
        }
      }
    }

    results._summary = {
      orgs: orgIds.filter(Boolean).length,
      jobs_created: jobsCreated,
      jobs_existing: jobsExisting,
      jobs_total: DEMO_JOBS.length,
      talent_cards: DEMO_TALENT_CARDS.length,
    };

    const elapsed = Date.now() - startTime;
    console.log("[seed-test] seed_completed", { elapsed, errors: errors.length, jobsCreated, jobsExisting });

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
