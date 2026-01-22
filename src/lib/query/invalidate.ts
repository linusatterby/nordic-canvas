import { QueryClient } from "@tanstack/react-query";

/**
 * Invalidates all queries related to role-specific data.
 * Call this when switching roles or after login/logout to ensure fresh data.
 */
export function invalidateForRoleSwitch(queryClient: QueryClient): void {
  // Jobs and talent feeds
  queryClient.invalidateQueries({ queryKey: ["jobs"] });
  queryClient.invalidateQueries({ queryKey: ["talentFeed"] });
  
  // Matches and chat
  queryClient.invalidateQueries({ queryKey: ["matches"] });
  queryClient.invalidateQueries({ queryKey: ["match"] });
  queryClient.invalidateQueries({ queryKey: ["chat"] });
  queryClient.invalidateQueries({ queryKey: ["threads"] });
  
  // Scheduler and bookings
  queryClient.invalidateQueries({ queryKey: ["scheduler"] });
  queryClient.invalidateQueries({ queryKey: ["bookings"] });
  
  // Borrow system
  queryClient.invalidateQueries({ queryKey: ["borrow"] });
  queryClient.invalidateQueries({ queryKey: ["borrowRequests"] });
  queryClient.invalidateQueries({ queryKey: ["borrowOffers"] });
  
  // Circles and orgs
  queryClient.invalidateQueries({ queryKey: ["circles"] });
  queryClient.invalidateQueries({ queryKey: ["circlePartners"] });
  queryClient.invalidateQueries({ queryKey: ["circleRequests"] });
  queryClient.invalidateQueries({ queryKey: ["orgs"] });
  queryClient.invalidateQueries({ queryKey: ["defaultOrgId"] });
  
  // Dashboard summaries
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["visibility"] });
  
  // Demo specific
  queryClient.invalidateQueries({ queryKey: ["demoMatches"] });
  queryClient.invalidateQueries({ queryKey: ["demoScheduler"] });
}

/**
 * Invalidates organization-specific queries.
 * Call this when switching organizations.
 */
export function invalidateForOrgSwitch(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ["jobs", "org"] });
  queryClient.invalidateQueries({ queryKey: ["matches"] });
  queryClient.invalidateQueries({ queryKey: ["scheduler"] });
  queryClient.invalidateQueries({ queryKey: ["borrow"] });
  queryClient.invalidateQueries({ queryKey: ["circles"] });
}
