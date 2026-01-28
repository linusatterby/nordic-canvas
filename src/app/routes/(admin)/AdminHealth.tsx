import * as React from "react";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Server, 
  Database,
  FileText,
  Activity,
  RefreshCw,
  XCircle,
  ScrollText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getEnvStatus, getProductionWarnings } from "@/lib/config/env";
import { AppShell } from "@/app/layout/AppShell";
import { RoleGate } from "@/components/auth/RoleGate";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { debugWarn } from "@/lib/utils/debug";

const AUDIT_LOG_KEY = "adminHealthAuditLogEnabled";

interface HealthCheck {
  name: string;
  status: "pass" | "fail" | "warn" | "loading";
  reason: string;
  category: string;
}

function StatusIcon({ status }: { status: HealthCheck["status"] }) {
  switch (status) {
    case "pass":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "fail":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "warn":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "loading":
      return <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />;
  }
}

function StatusBadge({ value, label }: { value: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant={value ? "default" : "outline"}>
        {value ? "Aktivt" : "Av"}
      </Badge>
    </div>
  );
}

function HealthCheckItem({ check }: { check: HealthCheck }) {
  const badgeVariant = check.status === "pass" ? "verified" : check.status === "warn" ? "warn" : "outline";
  
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <StatusIcon status={check.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{check.name}</span>
          <Badge 
            variant={badgeVariant} 
            size="sm"
          >
            {check.status.toUpperCase()}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{check.reason}</p>
      </div>
    </div>
  );
}

// Log admin audit event (fails silently)
async function logAdminAudit(action: string, metadata: Record<string, unknown> = {}) {
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

// Hook to run all health checks
function useHealthChecks(auditEnabled: boolean) {
  return useQuery({
    queryKey: ["admin", "healthchecks"],
    queryFn: async (): Promise<HealthCheck[]> => {
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
    },
    staleTime: 0, // Always refetch
    refetchOnWindowFocus: false,
  });
}

export default function AdminHealth() {
  const envStatus = getEnvStatus();
  const warnings = getProductionWarnings();
  
  // Audit log toggle (persisted in localStorage)
  const [auditEnabled, setAuditEnabled] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(AUDIT_LOG_KEY) === 'true';
    }
    return false;
  });

  const handleAuditToggle = (checked: boolean) => {
    setAuditEnabled(checked);
    localStorage.setItem(AUDIT_LOG_KEY, String(checked));
  };

  // Log page open if audit is enabled
  React.useEffect(() => {
    if (auditEnabled) {
      logAdminAudit("health_opened", { 
        env: envStatus.IS_PROD ? "production" : "development",
        demoDebug: envStatus.DEMO_DEBUG_ENABLED,
      });
    }
  }, [auditEnabled, envStatus.IS_PROD, envStatus.DEMO_DEBUG_ENABLED]);

  const { data: checks, isLoading, refetch, isFetching } = useHealthChecks(auditEnabled);

  const groupedChecks = React.useMemo(() => {
    if (!checks) return {};
    return checks.reduce((acc, check) => {
      if (!acc[check.category]) acc[check.category] = [];
      acc[check.category].push(check);
      return acc;
    }, {} as Record<string, HealthCheck[]>);
  }, [checks]);

  const passCount = checks?.filter(c => c.status === "pass").length ?? 0;
  const failCount = checks?.filter(c => c.status === "fail").length ?? 0;
  const warnCount = checks?.filter(c => c.status === "warn").length ?? 0;

  const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    auth: { label: "Autentisering", icon: <Shield className="h-4 w-4" /> },
    rls: { label: "Row Level Security", icon: <Database className="h-4 w-4" /> },
    rpc: { label: "RPC Functions", icon: <Server className="h-4 w-4" /> },
    events: { label: "Events & Notifications", icon: <Activity className="h-4 w-4" /> },
    offers: { label: "Erbjudanden", icon: <FileText className="h-4 w-4" /> },
  };

  return (
    <AppShell role="employer">
      <RoleGate allow={["employer"]}>
        <div className="container max-w-3xl py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Health Checks</h1>
                <p className="text-muted-foreground text-sm">
                  Systemstatus och produktionsberedskap
                </p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={isFetching ? "h-4 w-4 mr-2 animate-spin" : "h-4 w-4 mr-2"} />
              Kör om
            </Button>
          </div>

          {/* Audit Log Toggle */}
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ScrollText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="audit-toggle" className="text-sm font-medium cursor-pointer">
                      Logga health-check (admin audit)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Opt-in: Sparar när du öppnar eller kör checks
                    </p>
                  </div>
                </div>
                <Checkbox
                  id="audit-toggle"
                  checked={auditEnabled}
                  onCheckedChange={handleAuditToggle}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-green-600">{passCount}</div>
                <div className="text-xs text-muted-foreground">PASS</div>
              </CardContent>
            </Card>
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{warnCount}</div>
                <div className="text-xs text-muted-foreground">WARN</div>
              </CardContent>
            </Card>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-destructive">{failCount}</div>
                <div className="text-xs text-muted-foreground">FAIL</div>
              </CardContent>
            </Card>
          </div>

          {/* Warnings Section */}
          {warnings.length > 0 && (
            <Card className="mb-6 border-amber-500/50 bg-amber-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                  Env Varningar ({warnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {warnings.map((warning, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Health Checks by Category */}
          {isLoading ? (
            <Card className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            Object.entries(groupedChecks).map(([category, categoryChecks]) => (
              <Card key={category} className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {categoryLabels[category]?.icon}
                    {categoryLabels[category]?.label ?? category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryChecks.map((check, i) => (
                    <HealthCheckItem key={i} check={check} />
                  ))}
                </CardContent>
              </Card>
            ))
          )}

          {/* Environment Status */}
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="h-5 w-5" />
                Miljövariabler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Miljö</span>
                <Badge variant={envStatus.IS_PROD ? "warn" : "outline"}>
                  {envStatus.IS_PROD ? "PRODUKTION" : "UTVECKLING"}
                </Badge>
              </div>
              <StatusBadge value={envStatus.DEMO_ENABLED} label="VITE_DEMO_ENABLED" />
              <StatusBadge value={envStatus.DEMO_DEBUG_ENABLED} label="VITE_DEMO_DEBUG" />
              <StatusBadge value={envStatus.ALLOW_DEMO_SEED} label="VITE_ALLOW_DEMO_SEED" />
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="h-5 w-5" />
                Produktionsrekommendationer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <strong>Leaked Password Protection</strong>
                    <p className="text-muted-foreground">
                      Aktivera i Lovable Cloud → Auth-inställningar.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <strong>E-postbekräftelse</strong>
                    <p className="text-muted-foreground">
                      Överväg att inaktivera auto-confirm i produktion.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <strong>Demo-funktioner</strong>
                    <p className="text-muted-foreground">
                      Sätt <code className="bg-muted px-1 rounded">VITE_DEMO_ENABLED=false</code> i produktion.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </RoleGate>
    </AppShell>
  );
}
