import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  getThreadByMatch, 
  listMessages, 
  sendMessage, 
  subscribeToMessages,
  type MessageWithSender,
  type Message 
} from "@/lib/api/chat";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to manage chat state for a match with realtime updates
 */
export function useChat(matchId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get thread
  const threadQuery = useQuery({
    queryKey: ["thread", matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const { thread, error } = await getThreadByMatch(matchId);
      if (error) throw error;
      return thread;
    },
    enabled: !!matchId,
  });

  const threadId = threadQuery.data?.id;

  // Get messages
  const messagesQuery = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { messages, error } = await listMessages(threadId);
      if (error) throw error;
      return messages;
    },
    enabled: !!threadId,
    refetchInterval: false, // We'll use realtime instead
  });

  // Subscribe to realtime messages
  useEffect(() => {
    if (!threadId || !user) return;

    let realtimeActive = false;

    const unsubscribe = subscribeToMessages(threadId, (newMessage: Message) => {
      realtimeActive = true;
      // Clear polling if realtime is working
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      
      // Add new message to cache
      queryClient.setQueryData<MessageWithSender[]>(
        ["messages", threadId],
        (old) => {
          if (!old) return [{ ...newMessage, is_own: newMessage.sender_user_id === user.id }];
          // Avoid duplicates
          if (old.some((m) => m.id === newMessage.id)) return old;
          return [...old, { ...newMessage, is_own: newMessage.sender_user_id === user.id }];
        }
      );
    });

    // Fallback polling if realtime doesn't work within 5 seconds
    const timeoutId = setTimeout(() => {
      if (!realtimeActive && !pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
        }, 10000); // Poll every 10s
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
  }, [threadId, queryClient, user]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!threadId) throw new Error("No thread");
      const { message, error } = await sendMessage(threadId, body);
      if (error) throw error;
      return message;
    },
    onSuccess: (newMessage) => {
      if (!newMessage || !threadId) return;
      // Optimistically add message (already marked as own in API)
      queryClient.setQueryData<MessageWithSender[]>(
        ["messages", threadId],
        (old) => {
          if (!old) return [{ ...newMessage, is_own: true }];
          // Check for duplicate (might already be added by realtime)
          if (old.some((m) => m.id === newMessage.id)) return old;
          return [...old, { ...newMessage, is_own: true }];
        }
      );
    },
  });

  return {
    thread: threadQuery.data,
    messages: messagesQuery.data ?? [],
    isLoading: threadQuery.isLoading || messagesQuery.isLoading,
    error: threadQuery.error || messagesQuery.error,
    sendMessage: sendMutation.mutate,
    isSending: sendMutation.isPending,
  };
}
