import { useQuery } from "@tanstack/react-query";
import {
  listDemoMatchesForEmployer,
  getDemoThreadByMatch,
  listDemoMessages,
  type DemoMatchDTO,
  type DemoThreadDTO,
  type DemoMessageDTO,
} from "@/lib/api/demoMatches";

/**
 * Hook to fetch demo matches for an employer org
 */
export function useDemoMatches(orgId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ["demoMatches", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { matches, error } = await listDemoMatchesForEmployer(orgId);
      if (error) throw error;
      return matches;
    },
    enabled: enabled && !!orgId,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get demo thread by match ID
 */
export function useDemoThreadByMatch(matchId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ["demoThread", "byMatch", matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const { thread, error } = await getDemoThreadByMatch(matchId);
      if (error) throw error;
      return thread;
    },
    enabled: enabled && !!matchId,
    staleTime: 1000 * 300, // 5 minutes
  });
}

/**
 * Hook to fetch demo messages for a thread
 */
export function useDemoMessages(threadId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ["demoMessages", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { messages, error } = await listDemoMessages(threadId);
      if (error) throw error;
      return messages;
    },
    enabled: enabled && !!threadId,
    staleTime: 0, // Always fresh for chat
    refetchInterval: 5000, // Poll every 5s in demo mode
  });
}

export type { DemoMatchDTO, DemoThreadDTO, DemoMessageDTO };
