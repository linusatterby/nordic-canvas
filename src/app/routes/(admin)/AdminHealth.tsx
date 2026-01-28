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
import { useAdminHealth, type HealthCheck } from "@/hooks/useAdminHealth";
import { logAdminAudit } from "@/lib/api/adminHealth";

const AUDIT_LOG_KEY = "adminHealthAuditLogEnabled";

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

  const { data: checks, isLoading, refetch, isFetching } = useAdminHealth(auditEnabled);

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

          {/* Info Section */}
          <Card className="mt-6">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Om Health Checks</p>
                  <ul className="space-y-1">
                    <li>• Auth Session: Verifierar att du är inloggad</li>
                    <li>• RLS: Testar att Row Level Security fungerar</li>
                    <li>• RPC: Verifierar att viktiga databasfunktioner svarar</li>
                    <li>• Events: Kontrollerar aktivitets- och notifikationssystem</li>
                    <li>• Offers: Verifierar erbjudandesystemet</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </RoleGate>
    </AppShell>
  );
}
