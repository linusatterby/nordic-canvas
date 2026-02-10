import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/delight/EmptyStates";
import { MessageCircle, Calendar, MapPin, Send, Sparkles } from "lucide-react";
import { useMatches } from "@/hooks/useMatches";

export function TalentMatches() {
  const navigate = useNavigate();
  const { data: matches, isLoading } = useMatches("talent");

  const formatPeriod = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
    return `${s.toLocaleDateString("sv-SE", opts)} - ${e.toLocaleDateString("sv-SE", opts)}`;
  };

  if (isLoading) {
    return (
      <AppShell role="talent">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-6 space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-[18px] border border-border/60 bg-card p-5 shadow-card">
                <div className="flex items-start gap-4">
                  <Skeleton variant="circle" className="h-12 w-12" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-2/5" />
                    <div className="flex gap-2 pt-1">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-20 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="talent">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Dina matchningar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Arbetsgivare du har matchat med
          </p>
        </div>

        {matches && matches.length > 0 ? (
          <div className="space-y-4">
            {matches.map((match) => {
              const hasNoMessages = !match.last_message;
              
              return (
                <Card key={match.id} variant="interactive" padding="md">
                  <div className="flex items-start gap-4">
                    <Avatar size="lg" fallback={match.org_name.slice(0, 2)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{match.job_title}</h3>
                        {match.is_demo && (
                          <Badge variant="warn" size="sm">DEMO</Badge>
                        )}
                        <Badge
                          variant={match.status === "chatting" ? "verified" : "primary"}
                          size="sm"
                        >
                          {match.status === "chatting" ? "Aktiv chatt" : "Matchad"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{match.org_name}</p>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {match.job_location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {match.job_location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatPeriod(match.job_start_date, match.job_end_date)}
                        </span>
                      </div>

                      {match.last_message ? (
                        <p className="text-sm text-muted-foreground mt-3 truncate">
                          {match.last_message}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 mt-3 text-sm text-primary bg-primary-muted rounded-lg px-3 py-2">
                          <Sparkles className="h-4 w-4" />
                          <span>Ny matchning – skriv en hälsning!</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        className="gap-1"
                        onClick={() => navigate(`/talent/matches/${match.id}`)}
                      >
                        {hasNoMessages ? (
                          <>
                            <Send className="h-4 w-4" />
                            Skriv
                          </>
                        ) : (
                          <>
                            <MessageCircle className="h-4 w-4" />
                            Chatta
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            type="no-matches"
            title="Inga matchningar ännu"
            message="Fortsätt swipea för att hitta din nästa säsong!"
            action={{ label: "Börja swipea", onClick: () => navigate("/talent/swipe-jobs") }}
          />
        )}
      </div>
    </AppShell>
  );
}

export default TalentMatches;
