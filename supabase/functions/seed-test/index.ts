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

    // ── 4. Demo inbox items for talent view (idempotent via title + tab) ──
    // Metadata includes rich payload for read-only preview rendering
    const DEMO_INBOX_ITEMS = [
      // --- Notifications (4) ---
      {
        tab: "notification",
        title: "Ny matchning: Servis – Innerstaden Visby",
        body: "Visby Strandhotell har en ny roll som matchar dina preferenser. Kolla matchningen och svara snabbt.",
        org_name: "Visby Strandhotell",
        severity: "info",
        metadata: { cta: "Öppna matchning", ctaLabel: "Öppna matchning" },
        sort_order: 1,
      },
      {
        tab: "notification",
        title: "Erbjudande: Fjällhotellet Åre vill boka dig",
        body: "De vill säkra personal tidigt. Svara ja/nej så snart du kan.",
        org_name: "Fjällhotellet Åre",
        severity: "warning",
        metadata: { cta: "Se erbjudande", ctaLabel: "Se erbjudande" },
        sort_order: 2,
      },
      {
        tab: "notification",
        title: "Nytt meddelande från Sälen Resort & Spa",
        body: "Fråga om tillgänglighet för ett extrapass nästa helg.",
        org_name: "Sälen Resort & Spa",
        severity: "info",
        metadata: { cta: "Öppna chatten", ctaLabel: "Öppna chatten" },
        sort_order: 3,
      },
      {
        tab: "notification",
        title: "Tips: Lägg till certifikat för fler träffar",
        body: "HLR, hygien och kassavana ökar din matchscore. Uppdatera din profil på 1 minut.",
        org_name: null,
        severity: "success",
        metadata: { cta: "Gå till certifikat", ctaLabel: "Gå till certifikat" },
        sort_order: 4,
      },
      // --- Matches (3) ---
      {
        tab: "match",
        title: "Servis – Innerstaden Visby (sommar)",
        body: null,
        org_name: "Visby Strandhotell",
        status: "matched",
        metadata: {
          score: 33,
          jobTitle: "Servis – Innerstaden Visby (sommar)",
          location: "Visby",
          periodText: "Juni–Augusti 2026",
          housing: "",
          whyBullets: [
            "Rollmatch: Servis ✓",
            "Ort: Visby ✓",
            "Period: Sommar ✓",
            "Certifikat: saknas (HLR) → +0",
          ],
          reason: "Rollmatch: Servis ✓, Ort: Visby ✓, Period: Sommar ✓, Certifikat: saknas (HLR) → +0",
        },
        sort_order: 1,
      },
      {
        tab: "match",
        title: "Reception – Fjällhotellet Åre (vinter)",
        body: null,
        org_name: "Fjällhotellet Åre",
        status: "matched",
        metadata: {
          score: 58,
          jobTitle: "Reception – Fjällhotellet Åre (vinter)",
          location: "Åre",
          periodText: "December 2026 – April 2027",
          housing: "Personalboende erbjuds",
          whyBullets: [
            "Rollmatch: Reception ✓",
            "Ort: Åre ✓",
            "Boende erbjuds ✓",
            "Tillgänglighet: demo-bypass aktiv",
          ],
          reason: "Rollmatch: Reception ✓, Ort: Åre ✓, Boende erbjuds ✓, Tillgänglighet: demo-bypass aktiv",
        },
        sort_order: 2,
      },
      {
        tab: "match",
        title: "Disk/Runner – Sälen Resort & Spa (extrapass)",
        body: null,
        org_name: "Sälen Resort & Spa",
        status: "matched",
        metadata: {
          score: 46,
          jobTitle: "Disk/Runner – Sälen Resort & Spa (extrapass)",
          location: "Sälen",
          periodText: "Extrapass, kort varsel",
          housing: "",
          whyBullets: [
            "Extrapass ✓",
            "Kvällar ✓",
            "Kort varsel ✓",
            "Certifikat: hygien saknas → -",
          ],
          reason: "Extrapass ✓, Kvällar ✓, Kort varsel ✓, Certifikat: hygien saknas → -",
        },
        sort_order: 3,
      },
      // --- Offers (2) ---
      {
        tab: "offer",
        title: "Erbjudande: Reception (vinter), start 2026-12-01",
        body: "Vi kan erbjuda personalboende och introduktion på plats. Vill du gå vidare?",
        org_name: "Fjällhotellet Åre",
        status: "sent",
        metadata: {
          startDate: "2026-12-01",
          start_date: "2026-12-01",
          housingText: "Personalboende ingår",
          status: "Väntar på svar",
        },
        sort_order: 1,
      },
      {
        tab: "offer",
        title: "Erbjudande: Servis (sommar), start 2026-06-15",
        body: "Heltid under högsäsong. Möjlighet till förlängning i augusti.",
        org_name: "Visby Strandhotell",
        status: "sent",
        metadata: {
          startDate: "2026-06-15",
          start_date: "2026-06-15",
          housingText: "",
          status: "Nytt",
        },
        sort_order: 2,
      },
      // --- Messages (1 thread with 6 messages) ---
      {
        tab: "message",
        title: "Visby Strandhotell • Servis (sommar)",
        body: null,
        org_name: "Visby Strandhotell",
        status: "active",
        metadata: {
          threadTitle: "Visby Strandhotell • Servis (sommar)",
          messages: [
            { sender_type: "employer", body: "Hej! Såg din profil – du verkar passa fint hos oss i sommar. Är du öppen för Visby juni–aug?" },
            { sender_type: "talent", body: "Hej! Ja, jag är intresserad. Vilka tider och omfattning tänker ni?" },
            { sender_type: "employer", body: "Primärt kvällar + helger. 100% vecka 26–32. Kan du börja runt 15 juni?" },
            { sender_type: "talent", body: "Det låter bra. Jag kan börja 15 juni. Har ni personalboende?" },
            { sender_type: "employer", body: "Vi har boende i närheten (delat). Vi kan ta detaljer om du vill gå vidare." },
            { sender_type: "talent", body: "Toppen, jag vill gärna gå vidare. Skicka gärna nästa steg!" },
          ],
        },
        sort_order: 1,
      },
      // --- Requests (2) ---
      {
        tab: "request",
        title: "Förfrågan: Extrapass fredag 18:00–23:00",
        body: "Kan du täcka ett pass i restaurangen nu på fredag? Snabb återkoppling uppskattas.",
        org_name: "Sälen Resort & Spa",
        status: "pending",
        metadata: { options: ["Kan", "Kan inte"], actions: ["Kan", "Kan inte"] },
        sort_order: 1,
      },
      {
        tab: "request",
        title: "Förfrågan: Kort intervju (15 min) denna vecka",
        body: "Vi vill stämma av erfarenhet och upplägg. Vilken tid passar bäst?",
        org_name: "Fjällhotellet Åre",
        status: "pending",
        metadata: { options: ["Föreslå tid", "Inte aktuell"], actions: ["Föreslå tid", "Inte aktuell"] },
        sort_order: 2,
      },
    ];

    let inboxCreated = 0;
    let inboxExisting = 0;

    for (const item of DEMO_INBOX_ITEMS) {
      const { data: existing } = await sb
        .from("demo_inbox_items")
        .select("id")
        .eq("title", item.title)
        .eq("tab", item.tab)
        .eq("is_demo", true)
        .maybeSingle();

      if (existing) {
        // Update metadata for richer preview payload
        const { error: updateErr } = await sb
          .from("demo_inbox_items")
          .update({ metadata: item.metadata })
          .eq("id", existing.id);
        if (updateErr) {
          errors.push(`inbox_update "${item.title}": ${updateErr.message}`);
        }
        inboxExisting++;
      } else {
        const { error: itemErr } = await sb.from("demo_inbox_items").insert({
          ...item,
          is_demo: true,
        });
        if (itemErr) {
          errors.push(`inbox_item "${item.title}": ${itemErr.message}`);
        } else {
          inboxCreated++;
        }
      }
    }

    results._summary = {
      orgs: orgIds.filter(Boolean).length,
      jobs_created: jobsCreated,
      jobs_existing: jobsExisting,
      jobs_total: DEMO_JOBS.length,
      talent_cards: DEMO_TALENT_CARDS.length,
      inbox_created: inboxCreated,
      inbox_existing: inboxExisting,
      inbox_total: DEMO_INBOX_ITEMS.length,
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
