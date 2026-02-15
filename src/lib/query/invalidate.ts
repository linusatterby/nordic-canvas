import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Invalidates all queries related to role-specific data.
 * Call this when switching roles or after login/logout to ensure fresh data.
 */
export function invalidateForRoleSwitch(queryClient: QueryClient): void {
  // Jobs and talent feeds
  queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.talentFeed.all });
  
  // Matches and chat
  queryClient.invalidateQueries({ queryKey: queryKeys.matches.all });
  queryClient.invalidateQueries({ queryKey: ["match"] });
  queryClient.invalidateQueries({ queryKey: queryKeys.chat.all });
  queryClient.invalidateQueries({ queryKey: ["threads"] });
  
  // Scheduler and bookings
  queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.all });
  queryClient.invalidateQueries({ queryKey: ["bookings"] });
  
  // Borrow system
  queryClient.invalidateQueries({ queryKey: queryKeys.borrow.all });
  queryClient.invalidateQueries({ queryKey: ["borrowRequests"] });
  queryClient.invalidateQueries({ queryKey: ["borrowOffers"] });
  
  // Circles and orgs
  queryClient.invalidateQueries({ queryKey: queryKeys.circles.all });
  queryClient.invalidateQueries({ queryKey: ["circlePartners"] });
  queryClient.invalidateQueries({ queryKey: ["circleRequests"] });
  queryClient.invalidateQueries({ queryKey: queryKeys.orgs.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.orgs.defaultId() });
  
  // Dashboard summaries
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.visibility.summary() });
  
  // Demo specific
  queryClient.invalidateQueries({ queryKey: ["demoMatches"] });
  queryClient.invalidateQueries({ queryKey: ["demoScheduler"] });
}

/**
 * Invalidates organization-specific queries.
 * Call this when switching organizations.
 */
export function invalidateForOrgSwitch(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.jobs.org() });
  queryClient.invalidateQueries({ queryKey: queryKeys.matches.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.borrow.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.circles.all });
}
