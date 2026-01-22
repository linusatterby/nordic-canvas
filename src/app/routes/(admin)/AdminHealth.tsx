import * as React from "react";
import { Shield, AlertTriangle, CheckCircle, Info, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getEnvStatus, getProductionWarnings } from "@/lib/config/env";
import { PublicShell } from "@/app/layout/PublicShell";

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

export default function AdminHealth() {
  const envStatus = getEnvStatus();
  const warnings = getProductionWarnings();

  return (
    <PublicShell>
      <div className="container max-w-3xl py-12">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Systemstatus</h1>
            <p className="text-muted-foreground">
              Miljökonfiguration och produktionsberedskap
            </p>
          </div>
        </div>

        {/* Warnings Section */}
        {warnings.length > 0 && (
          <Card className="mb-6 border-warning bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-warning">
                <AlertTriangle className="h-5 w-5" />
                Varningar ({warnings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {warnings.map((warning, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {warning}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {warnings.length === 0 && (
          <Card className="mb-6 border-green-500/50 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-green-600">
                <CheckCircle className="h-5 w-5" />
                Inga varningar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Konfigurationen ser bra ut för denna miljö.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Environment Status */}
        <Card className="mb-6">
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
        <Card>
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
                    Aktivera i Lovable Cloud → Auth-inställningar för att blockera 
                    komprometterade lösenord vid registrering.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <strong>E-postbekräftelse</strong>
                  <p className="text-muted-foreground">
                    Överväg att aktivera e-postbekräftelse i produktion för ökad 
                    kontosäkerhet (inaktivera auto-confirm).
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <strong>Rate Limiting</strong>
                  <p className="text-muted-foreground">
                    Lovable Cloud har inbyggd rate limiting. Kontrollera att 
                    gränserna passar era behov.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <strong>Demo-funktioner</strong>
                  <p className="text-muted-foreground">
                    Sätt <code className="bg-muted px-1 rounded">VITE_DEMO_ENABLED=false</code> och{" "}
                    <code className="bg-muted px-1 rounded">VITE_ALLOW_DEMO_SEED=false</code> för 
                    att helt stänga av demo-funktioner i produktion.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicShell>
  );
}
