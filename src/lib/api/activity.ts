import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ActivityEvent = Database["public"]["Tables"]["activity_events"]["Row"];

export type ActivitySeverity = "info" | "success" | "warning" | "urgent";

export interface ActivityFilters {
  role?: "talent" | "employer";
  orgId?: string;
  eventTypes?: string[];
  limit?: number;
}

export interface ActivityItem extends ActivityEvent {
  href?: string;
  severity: ActivitySeverity;
}

/**
 * Get href for an activity event based on entity type
 */
function getActivityHref(event: ActivityEvent, role: "talent" | "employer"): string | undefined {
  const { entity_type, entity_id, metadata } = event;

  switch (entity_type) {
    case "listing":
      return role === "employer" ? "/employer/jobs" : undefined;
    case "match":
      return role === "talent" 
        ? `/talent/matches/${entity_id}` 
        : `/employer/matches/${entity_id}`;
    case "message": {
      const matchId = (metadata as Record<string, unknown>)?.match_id;
      if (matchId) {
        return role === "talent"
          ? `/talent/matches/${matchId}`
          : `/employer/matches/${matchId}`;
      }
      return undefined;
    }
    case "borrow_request":
    case "borrow_offer":
      return role === "talent" ? "/talent/dashboard" : "/employer/borrow";
    case "booking":
      return role === "talent" ? "/talent/dashboard" : "/employer/scheduler";
    case "release_offer":
      return "/employer/borrow";
    default:
      return undefined;
  }
}

/**
 * List activity events for the current user
 */
export async function listMyActivity(
  filters: ActivityFilters = {}
): Promise<{
  activities: ActivityItem[];
  error: Error | null;
}> {
  const { role = "talent", orgId, eventTypes, limit = 50 } = filters;

  let query = supabase
    .from("activity_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  // Filter by role context
  if (role === "talent") {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      query = query.eq("talent_user_id", user.id);
    }
  } else if (role === "employer" && orgId) {
    query = query.eq("org_id", orgId);
  }

  // Filter by event types if provided
  if (eventTypes && eventTypes.length > 0) {
    query = query.in("event_type", eventTypes);
  }

  const { data, error } = await query;

  if (error) {
    return { activities: [], error: new Error(error.message) };
  }

  // Enrich with hrefs and ensure severity type
  const activities: ActivityItem[] = (data ?? []).map((event) => ({
    ...event,
    href: getActivityHref(event, role),
    severity: (event.severity as ActivitySeverity) || "info",
  }));

  return { activities, error: null };
}

/**
 * Get activity icon based on event type
 */
export function getActivityIcon(eventType: string): string {
  switch (eventType) {
    case "listing_created":
      return "📋";
    case "listing_status_changed":
      return "🔄";
    case "swipe_made":
      return "👆";
    case "match_created":
      return "🎉";
    case "message_sent":
      return "💬";
    case "borrow_request_created":
      return "🤝";
    case "borrow_offer_created":
      return "📨";
    case "borrow_offer_accepted":
      return "✅";
    case "booking_created":
      return "📅";
    case "release_offer_created":
      return "🔓";
    case "release_offer_taken":
      return "✋";
    default:
      return "📌";
  }
}

/**
 * Get human-readable label for event type
 */
export function getActivityTypeLabel(eventType: string): string {
  switch (eventType) {
    case "listing_created":
      return "Uppdrag skapat";
    case "listing_status_changed":
      return "Status ändrad";
    case "swipe_made":
      return "Swipe";
    case "match_created":
      return "Matchning";
    case "message_sent":
      return "Meddelande";
    case "borrow_request_created":
      return "Låneförfrågan";
    case "borrow_offer_created":
      return "Erbjudande";
    case "borrow_offer_accepted":
      return "Accepterat";
    case "booking_created":
      return "Bokning";
    case "release_offer_created":
      return "Pass släppt";
    case "release_offer_taken":
      return "Pass taget";
    default:
      return "Händelse";
  }
}

/**
 * Get severity color class for activity styling
 */
export function getActivitySeverityClass(severity: ActivitySeverity): string {
  switch (severity) {
    case "urgent":
      return "border-l-destructive";
    case "warning":
      return "border-l-amber-500";
    case "success":
      return "border-l-emerald-500";
    case "info":
    default:
      return "border-l-muted-foreground/30";
  }
}

/**
 * Get severity dot class
 */
export function getActivitySeverityDot(severity: ActivitySeverity): string {
  switch (severity) {
    case "urgent":
      return "bg-destructive animate-pulse";
    case "warning":
      return "bg-amber-500";
    case "success":
      return "bg-emerald-500";
    case "info":
    default:
      return "bg-muted-foreground/50";
  }
}
