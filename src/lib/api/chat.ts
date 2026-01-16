import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Thread = Database["public"]["Tables"]["threads"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];

export interface MessageWithSender extends Message {
  is_own: boolean;
}

/**
 * Get thread by match ID
 */
export async function getThreadByMatch(matchId: string): Promise<{
  thread: Thread | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("threads")
    .select("*")
    .eq("match_id", matchId)
    .maybeSingle();

  return {
    thread: data,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * List messages for a thread
 */
export async function listMessages(threadId: string): Promise<{
  messages: MessageWithSender[];
  error: Error | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    return { messages: [], error: new Error(error.message) };
  }

  const messages: MessageWithSender[] = (data ?? []).map((m) => ({
    ...m,
    is_own: m.sender_user_id === user?.id,
  }));

  return { messages, error: null };
}

/**
 * Send a message to a thread
 */
export async function sendMessage(
  threadId: string,
  body: string
): Promise<{ message: Message | null; error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { message: null, error: new Error("Not authenticated") };
  }

  if (body.length < 1 || body.length > 1000) {
    return { message: null, error: new Error("Message must be 1-1000 characters") };
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      thread_id: threadId,
      sender_user_id: user.id,
      body,
    })
    .select()
    .single();

  return {
    message: data,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Subscribe to new messages on a thread (realtime)
 */
export function subscribeToMessages(
  threadId: string,
  onInsert: (message: Message) => void
) {
  const channel = supabase
    .channel(`messages:${threadId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => {
        onInsert(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
