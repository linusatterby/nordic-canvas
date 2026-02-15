import * as React from "react";
import { Plus, Trash2, ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useCredentials, useAddCredential, useDeleteCredential } from "@/hooks/useCredentials";
import { useCredentialCatalog } from "@/hooks/useCredentialCatalog";
import { AddCredentialModal } from "./AddCredentialModal";
import { Skeleton } from "@/components/ui/Skeleton";

// Labels resolved from catalog at render time

function credentialStatus(expiresAt: string | null): "valid" | "expiring" | "expired" {
  if (!expiresAt) return "valid";
  const now = new Date();
  const exp = new Date(expiresAt);
  if (exp < now) return "expired";
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  if (exp.getTime() - now.getTime() < thirtyDays) return "expiring";
  return "valid";
}

const statusConfig = {
  valid: { label: "Giltigt", variant: "verified" as const, icon: ShieldCheck },
  expiring: { label: "Går ut snart", variant: "warn" as const, icon: Clock },
  expired: { label: "Utgånget", variant: "busy" as const, icon: AlertTriangle },
};

export function CredentialsList() {
  const { data: credentials, isLoading } = useCredentials();
  const { data: catalog } = useCredentialCatalog();
  const deleteMutation = useDeleteCredential();
  const [showModal, setShowModal] = React.useState(false);

  // Build lookup from catalog
  const catalogLabels = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of catalog ?? []) map[c.code] = c.label;
    return map;
  }, [catalog]);

  if (isLoading) {
    return (
      <Card variant="default" padding="lg">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card variant="default" padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Dina certifikat</h3>
          <Button variant="secondary" size="sm" className="gap-2" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />
            Lägg till
          </Button>
        </div>

        {(!credentials || credentials.length === 0) ? (
          <p className="text-sm text-muted-foreground">
            Du har inga certifikat ännu. Lägg till dina yrkesbevis, körkort och kursintyg.
          </p>
        ) : (
          <div className="space-y-3">
            {credentials.map((cred) => {
              const status = credentialStatus(cred.expires_at);
              const config = statusConfig[status];
              const StatusIcon = config.icon;

              return (
                <div
                  key={cred.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary"
                >
                  <StatusIcon className={`h-5 w-5 shrink-0 ${
                    status === "valid" ? "text-verified" : status === "expiring" ? "text-warn" : "text-destructive"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {cred.credential_type === "other" ? cred.label : catalogLabels[cred.credential_type] ?? cred.credential_type}
                    </p>
                    {cred.issuer && (
                      <p className="text-xs text-muted-foreground">{cred.issuer}</p>
                    )}
                  </div>
                  <Badge variant={config.variant} size="sm">
                    {config.label}
                  </Badge>
                  {cred.expires_at && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(cred.expires_at).toLocaleDateString("sv-SE")}
                    </span>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(cred.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Ta bort"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {showModal && (
        <AddCredentialModal onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
