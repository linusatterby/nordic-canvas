import { supabase } from "@/integrations/supabase/client";
import { debugWarn } from "@/lib/utils/debug";

export interface HealthCheck {
  name: string;
  status: "pass" | "fail" | "warn" | "loading";
  reason: string;
  category: string;
}

/**
 * Log admin audit event (fails silently)
 */
export async function logAdminAudit(
  action: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { error } = await supabase.rpc("log_admin_audit", {
      p_action: action,
      p_metadata: metadata as unknown as Record<string, never>,
    });
    if (error) {
      debugWarn("[AdminHealth] Audit log failed:", error.message);
    }
  } catch (err) {
    debugWarn("[AdminHealth] Audit log error:", err);
  }
}

/**
 * Run all health checks and return results
 */
export async function runHealthChecks(auditEnabled: boolean): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  // 1. Auth/Session check
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    checks.push({
      name: "Auth Session",
      status: session ? "pass" : "warn",
      reason: session ? `Logged in as ${session.user.email}` : "No active session",
      category: "auth",
    });
  } catch (err) {
    checks.push({
      name: "Auth Session",
      status: "fail",
      reason: err instanceof Error ? err.message : "Unknown error",
      category: "auth",
    });
  }

  // 2. RLS: Can select demo orgs
  try {
    const { data, error } = await supabase
      .from("orgs")
      .select("id, name")
      .eq("is_demo", true)
      .limit(1);
    
    checks.push({
      name: "RLS: Demo Orgs Readable",
      status: error ? "fail" : data && data.length > 0 ? "pass" : "warn",
      reason: error ? error.message : data && data.length > 0 ? `Found ${data.length} demo org(s)` : "No demo orgs found",
      category: "rls",
    });
  } catch (err) {
    checks.push({
      name: "RLS: Demo Orgs Readable",
      status: "fail",
      reason: err instanceof Error ? err.message : "Unknown error",
      category: "rls",
    });
  }

  // 3. RLS: Can list published listings
  try {
    const { data, error } = await supabase
      .from("job_posts")
      .select("id")
      .eq("status", "published")
      .limit(5);
    
    checks.push({
      name: "RLS: Published Listings Readable",
      status: error ? "fail" : "pass",
      reason: error ? error.message : `Found ${data?.length ?? 0} published listings`,
      category: "rls",
    });
  } catch (err) {
    checks.push({
      name: "RLS: Published Listings Readable",
      status: "fail",
      reason: err instanceof Error ? err.message : "Unknown error",
      category: "rls",
    });
  }

  // 4. RPC: get_job_posts_field_map
  try {
    const { data, error } = await supabase.rpc("get_job_posts_field_map");
    checks.push({
      name: "RPC: get_job_posts_field_map",
      status: error ? "fail" : data ? "pass" : "warn",
      reason: error ? error.message : "Field map loaded successfully",
      category: "rpc",
    });
  } catch (err) {
    checks.push({
      name: "RPC: get_job_posts_field_map",
      status: "fail",
      reason: err instanceof Error ? err.message : "Unknown error",
      category: "rpc",
    });
  }

  // 5. RPC: get_unread_notification_count
  try {
    const { data, error } = await supabase.rpc("get_unread_notification_count");
    checks.push({
      name: "RPC: get_unread_notification_count",
      status: error ? "fail" : "pass",
      reason: error ? error.message : `Unread count: ${data ?? 0}`,
      category: "rpc",
    });
  } catch (err) {
    checks.push({
      name: "RPC: get_unread_notification_count",
      status: "fail",
      reason: err instanceof Error ? err.message : "Unknown error",
      category: "rpc",
    });
  }

  // 6. RPC: healthcheck_events
  try {
    const { data, error } = await supabase.rpc("healthcheck_events", { p_minutes: 10 });
    const eventData = data as {
      activity_counts?: Record<string, number>;
      notification_counts?: Record<string, number>;
      offer_counts?: Record<string, number>;
      duplicate_count?: number;
    } | null;
    
    const duplicates = eventData?.duplicate_count ?? 0;
    const activityTotal = Object.values(eventData?.activity_counts ?? {}).reduce((a, b) => a + b, 0);
    const notifTotal = Object.values(eventData?.notification_counts ?? {}).reduce((a, b) => a + b, 0);
    
    checks.push({
      name: "Events: Activity (10min)",
      status: error ? "fail" : "pass",
      reason: error ? error.message : `${activityTotal} activity events, ${notifTotal} notifications`,
      category: "events",
    });

    checks.push({
      name: "Events: Dedupe Check",
      status: error ? "fail" : duplicates > 0 ? "warn" : "pass",
      reason: error ? error.message : duplicates > 0 ? `${duplicates} duplicate dedup_keys found!` : "No duplicates",
      category: "events",
    });

    // Show offer counts
    const offerCounts = eventData?.offer_counts ?? {};
    checks.push({
      name: "Offers: Status Distribution",
      status: "pass",
      reason: Object.entries(offerCounts).map(([k, v]) => `${k}: ${v}`).join(", ") || "No offers",
      category: "offers",
    });
  } catch (err) {
    checks.push({
      name: "Events: Healthcheck",
      status: "fail",
      reason: err instanceof Error ? err.message : "Unknown error",
      category: "events",
    });
  }

  // 7. Offers: Can list org offers (requires org membership)
  try {
    const { data, error } = await supabase
      .from("offers")
      .select("id, status")
      .limit(5);
    
    // This will fail with RLS if user isn't in an org, which is expected
    checks.push({
      name: "Offers: Readable",
      status: error ? (error.message.includes("RLS") ? "warn" : "fail") : "pass",
      reason: error ? error.message : `Found ${data?.length ?? 0} offers (org-scoped)`,
      category: "offers",
    });
  } catch (err) {
    checks.push({
      name: "Offers: Readable",
      status: "fail",
      reason: err instanceof Error ? err.message : "Unknown error",
      category: "offers",
    });
  }

  // Log audit event if enabled
  if (auditEnabled) {
    const summary = {
      pass: checks.filter(c => c.status === "pass").length,
      warn: checks.filter(c => c.status === "warn").length,
      fail: checks.filter(c => c.status === "fail").length,
    };
    await logAdminAudit("health_check_run", { resultsSummary: summary });
  }

  return checks;
}
