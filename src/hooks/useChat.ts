import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { 
  getThreadByMatch, 
  listMessages, 
  sendMessage, 
  subscribeToMessages,
  type MessageWithSender,
  type Message 
} from "@/lib/api/chat";
import {
  getDemoThreadByMatch,
  listDemoMessages,
  sendDemoMessage,
  type DemoMessageDTO,
} from "@/lib/api/demoMatches";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoMode } from "@/hooks/useDemo";

// Union message type
export interface EffectiveMessage {
  id: string;
  thread_id: string;
  body: string;
  created_at: string;
  is_own: boolean;
  is_demo: boolean;
  sender_user_id?: string;
  sender_type?: string;
}

function toEffectiveMessage(m: MessageWithSender): EffectiveMessage {
  return {
    id: m.id,
    thread_id: m.thread_id,
    body: m.body,
    created_at: m.created_at,
    is_own: m.is_own,
    is_demo: false,
    sender_user_id: m.sender_user_id,
  };
}

function demoToEffectiveMessage(m: DemoMessageDTO): EffectiveMessage {
  return {
    id: m.id,
    thread_id: m.thread_id,
    body: m.body,
    created_at: m.created_at,
    is_own: m.is_own,
    is_demo: true,
    sender_type: m.sender_type,
  };
}

/**
 * Hook to manage chat state for a match with realtime updates
 * Supports both real matches and demo matches
 */
export function useChat(matchId: string | undefined, isMatchDemo: boolean = false) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if this is a demo thread
  const shouldUseDemoChat = isMatchDemo || (isDemoMode && matchId?.startsWith("demo-"));

  // Get real thread
  const realThreadQuery = useQuery({
    queryKey: ["thread", matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const { thread, error } = await getThreadByMatch(matchId);
      if (error) throw error;
      return thread;
    },
    enabled: !!matchId && !shouldUseDemoChat,
    staleTime: 1000 * 300,
  });

  // Get demo thread
  const demoThreadQuery = useQuery({
    queryKey: ["demoThread", "byMatch", matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const { thread, error } = await getDemoThreadByMatch(matchId);
      if (error) throw error;
      return thread;
    },
    enabled: !!matchId && shouldUseDemoChat,
    staleTime: 1000 * 300,
  });

  const thread = shouldUseDemoChat ? demoThreadQuery.data : realThreadQuery.data;
  const threadId = thread?.id;
  const isDemo = shouldUseDemoChat || (thread && 'is_demo' in thread && thread.is_demo);

  // Get real messages
  const realMessagesQuery = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { messages, error } = await listMessages(threadId);
      if (error) throw error;
      return messages;
    },
    enabled: !!threadId && !isDemo,
    staleTime: 0,
    refetchInterval: false,
  });

  // Get demo messages (with polling)
  const demoMessagesQuery = useQuery({
    queryKey: ["demoMessages", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { messages, error } = await listDemoMessages(threadId);
      if (error) throw error;
      return messages;
    },
    enabled: !!threadId && isDemo,
    staleTime: 0,
    refetchInterval: 5000, // Poll every 5s for demo
  });

  // Effective messages
  const rawMessages = isDemo ? demoMessagesQuery.data : realMessagesQuery.data;
  const messages: EffectiveMessage[] = (rawMessages ?? []).map((m) =>
    isDemo ? demoToEffectiveMessage(m as DemoMessageDTO) : toEffectiveMessage(m as MessageWithSender)
  );

  // Subscribe to realtime messages (only for real threads)
  useEffect(() => {
    if (!threadId || !user || isDemo) return;

    let realtimeActive = false;

    const unsubscribe = subscribeToMessages(threadId, (newMessage: Message) => {
      realtimeActive = true;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      
      queryClient.setQueryData<MessageWithSender[]>(
        ["messages", threadId],
        (old) => {
          if (!old) return [{ ...newMessage, is_own: newMessage.sender_user_id === user.id }];
          if (old.some((m) => m.id === newMessage.id)) return old;
          return [...old, { ...newMessage, is_own: newMessage.sender_user_id === user.id }];
        }
      );
    });

    const timeoutId = setTimeout(() => {
      if (!realtimeActive && !pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
        }, 10000);
      }
    }, 5000);

    return () => {
      clearTimeout(timeoutId);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      unsubscribe();
    };
  }, [threadId, queryClient, user, isDemo]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!threadId) throw new Error("No thread");
      
      if (isDemo) {
        const { message, error } = await sendDemoMessage(threadId, body, "org");
        if (error) throw error;
        return { message, isDemo: true };
      } else {
        const { message, error } = await sendMessage(threadId, body);
        if (error) throw error;
        return { message, isDemo: false };
      }
    },
    onSuccess: (result) => {
      if (!result.message || !threadId) return;
      
      if (result.isDemo) {
        // Just invalidate demo messages to refetch
        queryClient.invalidateQueries({ queryKey: ["demoMessages", threadId] });
      } else {
        const newMessage = result.message as Message;
        queryClient.setQueryData<MessageWithSender[]>(
          ["messages", threadId],
          (old) => {
            if (!old) return [{ ...newMessage, is_own: true }];
            if (old.some((m) => m.id === newMessage.id)) return old;
            return [...old, { ...newMessage, is_own: true }];
          }
        );
      }
    },
  });

  return {
    thread,
    messages,
    isLoading: (shouldUseDemoChat ? demoThreadQuery.isLoading : realThreadQuery.isLoading) ||
               (isDemo ? demoMessagesQuery.isLoading : realMessagesQuery.isLoading),
    error: realThreadQuery.error || demoThreadQuery.error || realMessagesQuery.error || demoMessagesQuery.error,
    sendMessage: sendMutation.mutate,
    isSending: sendMutation.isPending,
    isDemo: !!isDemo,
  };
}
