import * as React from "react";
import { LABELS } from "@/config/labels";
import { AppShell } from "@/app/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/delight/EmptyStates";
import { Avatar } from "@/components/ui/Avatar";
import { FileText, Calendar, User } from "lucide-react";
import { useDefaultOrgId } from "@/hooks/useOrgs";
import { useEmployerApplications } from "@/hooks/useEmployerViews";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

/**
 * Employer Applications view – shows ONLY submitted (APPLIED) applications.
 * Never shows saved/draft jobs. Employer sees what candidates actively sent.
 */
export function EmployerApplications() {
  const { data: orgId, isLoading: orgLoading } = useDefaultOrgId();
  const { data: applications, isLoading } = useEmployerApplications(orgId ?? undefined);

  if (orgLoading || isLoading) {
    return (
      <AppShell role="employer">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="employer">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">{LABELS.employerTabApplications}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kandidater som aktivt ansökt till dina jobb
          </p>
        </div>

        {applications && applications.length > 0 ? (
          <div className="space-y-3">
            {applications.map((app) => (
              <Card key={app.id} variant="interactive" padding="md">
                <div className="flex items-start gap-4">
                  <Avatar size="md" fallback={(app.candidate_name ?? "K").slice(0, 2)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">
                        {app.candidate_name ?? LABELS.candidate}
                      </h3>
                      <Badge variant="primary" size="sm">{LABELS.chipApplied}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {app.job_title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(app.created_at), {
                        addSuffix: true,
                        locale: sv,
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            type="no-data"
            title={LABELS.employerNoApplications}
            message={LABELS.employerNoApplicationsHint}
          />
        )}
      </div>
    </AppShell>
  );
}

export default EmployerApplications;
