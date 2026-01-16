import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Match = Database["public"]["Tables"]["matches"]["Row"];

export interface MatchDTO {
  id: string;
  org_id: string;
  job_post_id: string;
  talent_user_id: string;
  status: string | null;
  created_at: string;
  // Joined data
  job_title: string;
  job_location: string | null;
  job_start_date: string;
  job_end_date: string;
  org_name: string;
  talent_name: string | null;
  last_message: string | null;
}

/**
 * List matches for the current talent user
 */
export async function listMyMatches(): Promise<{
  matches: MatchDTO[];
  error: Error | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { matches: [], error: new Error("Not authenticated") };
  }

  const { data: matches, error: matchError } = await supabase
    .from("matches")
    .select(`
      *,
      job_posts ( title, location, start_date, end_date ),
      orgs ( name )
    `)
    .eq("talent_user_id", user.id)
    .order("created_at", { ascending: false });

  if (matchError) {
    return { matches: [], error: new Error(matchError.message) };
  }

  // Get threads and last messages
  const matchIds = (matches ?? []).map((m) => m.id);
  let threadMap = new Map<string, { thread_id: string; last_message: string | null }>();

  if (matchIds.length > 0) {
    const { data: threads } = await supabase
      .from("threads")
      .select("id, match_id")
      .in("match_id", matchIds);

    if (threads && threads.length > 0) {
      const threadIds = threads.map((t) => t.id);
      const { data: messages } = await supabase
        .from("messages")
        .select("thread_id, body, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false });

      // Group by thread_id, get first (latest) message
      const latestByThread = new Map<string, string>();
      messages?.forEach((m) => {
        if (!latestByThread.has(m.thread_id)) {
          latestByThread.set(m.thread_id, m.body);
        }
      });

      threads.forEach((t) => {
        threadMap.set(t.match_id, {
          thread_id: t.id,
          last_message: latestByThread.get(t.id) ?? null,
        });
      });
    }
  }

  const result: MatchDTO[] = (matches ?? []).map((m) => {
    const job = m.job_posts as { title: string; location: string | null; start_date: string; end_date: string } | null;
    const org = m.orgs as { name: string } | null;
    const threadInfo = threadMap.get(m.id);

    return {
      id: m.id,
      org_id: m.org_id,
      job_post_id: m.job_post_id,
      talent_user_id: m.talent_user_id,
      status: m.status,
      created_at: m.created_at,
      job_title: job?.title ?? "Okänt jobb",
      job_location: job?.location ?? null,
      job_start_date: job?.start_date ?? "",
      job_end_date: job?.end_date ?? "",
      org_name: org?.name ?? "Okänd organisation",
      talent_name: null, // Not needed for talent view
      last_message: threadInfo?.last_message ?? null,
    };
  });

  return { matches: result, error: null };
}

/**
 * List matches for an org
 */
export async function listOrgMatches(orgId: string): Promise<{
  matches: MatchDTO[];
  error: Error | null;
}> {
  const { data: matches, error: matchError } = await supabase
    .from("matches")
    .select(`
      *,
      job_posts ( title, location, start_date, end_date )
    `)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (matchError) {
    return { matches: [], error: new Error(matchError.message) };
  }

  // Get talent names
  const talentIds = [...new Set((matches ?? []).map((m) => m.talent_user_id))];
  let talentMap = new Map<string, string>();

  if (talentIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", talentIds);

    profiles?.forEach((p) => {
      if (p.full_name) {
        talentMap.set(p.user_id, p.full_name);
      }
    });
  }

  // Get threads and last messages
  const matchIds = (matches ?? []).map((m) => m.id);
  let threadMap = new Map<string, { thread_id: string; last_message: string | null }>();

  if (matchIds.length > 0) {
    const { data: threads } = await supabase
      .from("threads")
      .select("id, match_id")
      .in("match_id", matchIds);

    if (threads && threads.length > 0) {
      const threadIds = threads.map((t) => t.id);
      const { data: messages } = await supabase
        .from("messages")
        .select("thread_id, body, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false });

      const latestByThread = new Map<string, string>();
      messages?.forEach((m) => {
        if (!latestByThread.has(m.thread_id)) {
          latestByThread.set(m.thread_id, m.body);
        }
      });

      threads.forEach((t) => {
        threadMap.set(t.match_id, {
          thread_id: t.id,
          last_message: latestByThread.get(t.id) ?? null,
        });
      });
    }
  }

  // Get org name
  const { data: org } = await supabase
    .from("orgs")
    .select("name")
    .eq("id", orgId)
    .single();

  const result: MatchDTO[] = (matches ?? []).map((m) => {
    const job = m.job_posts as { title: string; location: string | null; start_date: string; end_date: string } | null;
    const threadInfo = threadMap.get(m.id);

    return {
      id: m.id,
      org_id: m.org_id,
      job_post_id: m.job_post_id,
      talent_user_id: m.talent_user_id,
      status: m.status,
      created_at: m.created_at,
      job_title: job?.title ?? "Okänt jobb",
      job_location: job?.location ?? null,
      job_start_date: job?.start_date ?? "",
      job_end_date: job?.end_date ?? "",
      org_name: org?.name ?? "Okänd organisation",
      talent_name: talentMap.get(m.talent_user_id) ?? null,
      last_message: threadInfo?.last_message ?? null,
    };
  });

  return { matches: result, error: null };
}

/**
 * Get a single match
 */
export async function getMatch(matchId: string): Promise<{
  match: MatchDTO | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("matches")
    .select(`
      *,
      job_posts ( title, location, start_date, end_date ),
      orgs ( name )
    `)
    .eq("id", matchId)
    .single();

  if (error) {
    return { match: null, error: new Error(error.message) };
  }

  // Get talent name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", data.talent_user_id)
    .single();

  const job = data.job_posts as { title: string; location: string | null; start_date: string; end_date: string } | null;
  const org = data.orgs as { name: string } | null;

  return {
    match: {
      id: data.id,
      org_id: data.org_id,
      job_post_id: data.job_post_id,
      talent_user_id: data.talent_user_id,
      status: data.status,
      created_at: data.created_at,
      job_title: job?.title ?? "Okänt jobb",
      job_location: job?.location ?? null,
      job_start_date: job?.start_date ?? "",
      job_end_date: job?.end_date ?? "",
      org_name: org?.name ?? "Okänd organisation",
      talent_name: profile?.full_name ?? null,
      last_message: null,
    },
    error: null,
  };
}

/**
 * Check if a match exists for a job + talent combo
 */
export async function getMatchByJobAndTalent(
  jobId: string,
  talentUserId: string
): Promise<{
  match: Match | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("job_post_id", jobId)
    .eq("talent_user_id", talentUserId)
    .maybeSingle();

  return {
    match: data,
    error: error ? new Error(error.message) : null,
  };
}
