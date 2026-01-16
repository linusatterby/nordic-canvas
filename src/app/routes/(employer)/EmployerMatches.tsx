import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/delight/EmptyStates";
import { MessageCircle, Calendar, MapPin } from "lucide-react";
import { useMatches } from "@/hooks/useMatches";
import { useDefaultOrgId } from "@/hooks/useOrgs";

export function EmployerMatches() {
  const navigate = useNavigate();
  const { data: orgId } = useDefaultOrgId();
  const { data: matches, isLoading } = useMatches("employer", orgId);

  const formatPeriod = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
    return `${s.toLocaleDateString("sv-SE", opts)} - ${e.toLocaleDateString("sv-SE", opts)}`;
  };

  if (isLoading) {
    return (
      <AppShell role="employer">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="employer">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Matchningar</h1>
          <p className="text-sm text-muted-foreground mt-1">Talanger som matchat med dina jobb</p>
        </div>

        {matches && matches.length > 0 ? (
          <div className="space-y-4">
            {matches.map((match) => (
              <Card key={match.id} variant="interactive" padding="md">
                <div className="flex items-start gap-4">
                  <Avatar size="lg" fallback={(match.talent_name ?? "T").slice(0, 2)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{match.talent_name ?? "Talang"}</h3>
                      <Badge variant={match.status === "chatting" ? "verified" : "primary"} size="sm">
                        {match.status === "chatting" ? "Aktiv chatt" : "Matchad"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{match.job_title}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {match.job_location && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{match.job_location}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatPeriod(match.job_start_date, match.job_end_date)}
                      </span>
                    </div>
                    {match.last_message && <p className="text-sm text-muted-foreground mt-3 truncate">{match.last_message}</p>}
                  </div>
                  <Button variant="primary" size="sm" className="gap-1 shrink-0" onClick={() => navigate(`/employer/matches/${match.id}`)}>
                    <MessageCircle className="h-4 w-4" />Chatta
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState type="no-matches" action={{ label: "Hitta talanger", onClick: () => navigate("/employer/jobs") }} />
        )}
      </div>
    </AppShell>
  );
}

export default EmployerMatches;
