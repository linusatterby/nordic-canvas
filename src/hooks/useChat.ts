import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { 
  getThreadByMatch, 
  listMessages, 
  sendMessage, 
  subscribeToMessages,
  type MessageWithSender,
  type Message 
} from "@/lib/api/chat";

/**
 * Hook to manage chat state for a match
 */
export function useChat(matchId: string | undefined) {
  const queryClient = useQueryClient();

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
  });

  // Subscribe to realtime messages
  useEffect(() => {
    if (!threadId) return;

    const unsubscribe = subscribeToMessages(threadId, (newMessage: Message) => {
      // Add new message to cache
      queryClient.setQueryData<MessageWithSender[]>(
        ["messages", threadId],
        (old) => {
          if (!old) return [{ ...newMessage, is_own: false }];
          // Avoid duplicates
          if (old.some((m) => m.id === newMessage.id)) return old;
          return [...old, { ...newMessage, is_own: false }];
        }
      );
    });

    return unsubscribe;
  }, [threadId, queryClient]);

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
      // Optimistically add message
      queryClient.setQueryData<MessageWithSender[]>(
        ["messages", threadId],
        (old) => {
          if (!old) return [{ ...newMessage, is_own: true }];
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
