import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DemoMatch = Database["public"]["Tables"]["demo_matches"]["Row"];
export type DemoChatThread = Database["public"]["Tables"]["demo_chat_threads"]["Row"];
export type DemoChatMessage = Database["public"]["Tables"]["demo_chat_messages"]["Row"];

export interface DemoMatchDTO {
  id: string;
  org_id: string;
  job_post_id: string;
  demo_card_id: string | null;
  talent_user_id: string | null;
  status: string;
  created_at: string;
  is_seeded: boolean;
  is_demo: true;
  // Joined data
  job_title: string;
  job_location: string | null;
  job_start_date: string;
  job_end_date: string;
  org_name: string;
  talent_name: string | null;
  talent_legacy_score: number | null;
  last_message: string | null;
}

export interface DemoThreadDTO {
  id: string;
  org_id: string;
  demo_match_id: string | null;
  created_at: string;
  is_demo: true;
}

export interface DemoMessageDTO {
  id: string;
  thread_id: string;
  sender_type: string;
  body: string;
  created_at: string;
  is_own: boolean;
  is_demo: true;
}

/**
 * List demo matches/threads for an employer org
 */
export async function listDemoMatchesForEmployer(orgId: string): Promise<{
  matches: DemoMatchDTO[];
  error: Error | null;
}> {
  // Fetch demo matches
  const { data: matches, error: matchError } = await supabase
    .from("demo_matches")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (matchError) {
    return { matches: [], error: new Error(matchError.message) };
  }

  if (!matches || matches.length === 0) {
    return { matches: [], error: null };
  }

  // Get org name
  const { data: org } = await supabase
    .from("orgs")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();

  // Get job posts for these matches
  const jobPostIds = [...new Set(matches.map((m) => m.job_post_id))];
  const jobMap = new Map<string, { title: string; location: string | null; start_date: string; end_date: string }>();
  
  if (jobPostIds.length > 0) {
    const { data: jobs } = await supabase
      .from("job_posts")
      .select("id, title, location, start_date, end_date")
      .in("id", jobPostIds);
    
    jobs?.forEach((j) => {
      jobMap.set(j.id, { title: j.title, location: j.location, start_date: j.start_date, end_date: j.end_date });
    });
  }

  // Get demo talent cards
  const cardIds = [...new Set(matches.filter((m) => m.demo_card_id).map((m) => m.demo_card_id!))];
  const cardMap = new Map<string, { name: string; legacy_score: number | null }>();
  
  if (cardIds.length > 0) {
    const { data: cards } = await supabase
      .from("demo_talent_cards")
      .select("id, name, legacy_score")
      .in("id", cardIds);
    
    cards?.forEach((c) => {
      cardMap.set(c.id, { name: c.name, legacy_score: c.legacy_score });
    });
  }

  // Get threads + last messages
  const matchIds = matches.map((m) => m.id);
  const threadMap = new Map<string, { thread_id: string; last_message: string | null }>();

  if (matchIds.length > 0) {
    const { data: threads } = await supabase
      .from("demo_chat_threads")
      .select("id, demo_match_id")
      .in("demo_match_id", matchIds);

    if (threads && threads.length > 0) {
      const threadIds = threads.map((t) => t.id);
      const { data: messages } = await supabase
        .from("demo_chat_messages")
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
        if (t.demo_match_id) {
          threadMap.set(t.demo_match_id, {
            thread_id: t.id,
            last_message: latestByThread.get(t.id) ?? null,
          });
        }
      });
    }
  }

  const result: DemoMatchDTO[] = matches.map((m) => {
    const job = jobMap.get(m.job_post_id);
    const card = m.demo_card_id ? cardMap.get(m.demo_card_id) : null;
    const threadInfo = threadMap.get(m.id);

    return {
      id: m.id,
      org_id: m.org_id,
      job_post_id: m.job_post_id,
      demo_card_id: m.demo_card_id,
      talent_user_id: m.talent_user_id,
      status: m.status,
      created_at: m.created_at,
      is_seeded: m.is_seeded,
      is_demo: true as const,
      job_title: job?.title ?? "Demo-jobb",
      job_location: job?.location ?? null,
      job_start_date: job?.start_date ?? "",
      job_end_date: job?.end_date ?? "",
      org_name: org?.name ?? "Demo-organisation",
      talent_name: card?.name ?? "Demo-kandidat",
      talent_legacy_score: card?.legacy_score ?? 50,
      last_message: threadInfo?.last_message ?? null,
    };
  });

  return { matches: result, error: null };
}

/**
 * List demo threads for an employer org
 */
export async function listDemoThreadsForEmployer(orgId: string): Promise<{
  threads: DemoThreadDTO[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("demo_chat_threads")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return { threads: [], error: new Error(error.message) };
  }

  const threads: DemoThreadDTO[] = (data ?? []).map((t) => ({
    ...t,
    is_demo: true as const,
  }));

  return { threads, error: null };
}

/**
 * Get a demo thread by ID
 */
export async function getDemoThread(threadId: string): Promise<{
  thread: DemoThreadDTO | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("demo_chat_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();

  if (error) {
    return { thread: null, error: new Error(error.message) };
  }

  if (!data) {
    return { thread: null, error: null };
  }

  return {
    thread: { ...data, is_demo: true as const },
    error: null,
  };
}

/**
 * Get demo thread by demo_match_id
 */
export async function getDemoThreadByMatch(matchId: string): Promise<{
  thread: DemoThreadDTO | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("demo_chat_threads")
    .select("*")
    .eq("demo_match_id", matchId)
    .maybeSingle();

  if (error) {
    return { thread: null, error: new Error(error.message) };
  }

  if (!data) {
    return { thread: null, error: null };
  }

  return {
    thread: { ...data, is_demo: true as const },
    error: null,
  };
}

/**
 * List messages for a demo thread
 */
export async function listDemoMessages(threadId: string): Promise<{
  messages: DemoMessageDTO[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("demo_chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    return { messages: [], error: new Error(error.message) };
  }

  const messages: DemoMessageDTO[] = (data ?? []).map((m) => ({
    ...m,
    is_own: m.sender_type === "org", // In employer view, "org" messages are "own"
    is_demo: true as const,
  }));

  return { messages, error: null };
}

/**
 * Send a message to a demo thread
 */
export async function sendDemoMessage(
  threadId: string,
  body: string,
  senderType: "org" | "talent" = "org"
): Promise<{
  message: DemoChatMessage | null;
  error: Error | null;
}> {
  if (body.length < 1 || body.length > 1000) {
    return { message: null, error: new Error("Message must be 1-1000 characters") };
  }

  const { data, error } = await supabase
    .from("demo_chat_messages")
    .insert({
      thread_id: threadId,
      sender_type: senderType,
      body,
    })
    .select()
    .single();

  return {
    message: data,
    error: error ? new Error(error.message) : null,
  };
}
