import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/delight/EmptyStates";
import { OfferComposerModal } from "@/components/offers";
import { MessageCircle, Calendar, MapPin, Send, Sparkles, FileText } from "lucide-react";
import { useMatches } from "@/hooks/useMatches";
import { useDefaultOrgId } from "@/hooks/useOrgs";
import { useOrgOffers } from "@/hooks/useOffers";

export function EmployerMatches() {
  const navigate = useNavigate();
  const { data: orgId } = useDefaultOrgId();
  const { data: matches, isLoading } = useMatches("employer", orgId);
  const { data: orgOffers } = useOrgOffers(orgId);

  // Offer composer state
  const [offerModalOpen, setOfferModalOpen] = React.useState(false);
  const [selectedMatch, setSelectedMatch] = React.useState<{
    id: string;
    talent_user_id: string;
    job_post_id?: string;
    job_title?: string;
    job_location?: string;
    job_start_date?: string;
    job_end_date?: string;
  } | null>(null);

  // Check if a match already has a sent/accepted offer
  const hasActiveOffer = (matchId: string, talentUserId: string) => {
    return orgOffers?.some(
      (o) => 
        (o.match_id === matchId || o.talent_user_id === talentUserId) && 
        ["sent", "accepted"].includes(o.status)
    );
  };

  const handleSendOffer = (match: typeof selectedMatch) => {
    setSelectedMatch(match);
    setOfferModalOpen(true);
  };

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
          <p className="text-sm text-muted-foreground mt-1">Kandidater som matchat med dina jobb</p>
        </div>

        {matches && matches.length > 0 ? (
          <div className="space-y-4">
            {matches.map((match) => {
              const hasNoMessages = !match.last_message;
              const alreadyHasOffer = hasActiveOffer(match.id, match.talent_user_id ?? "");
              
              return (
                <Card key={match.id} variant="interactive" padding="md">
                  <div className="flex items-start gap-4">
                    <Avatar size="lg" fallback={(match.talent_name ?? "T").slice(0, 2)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{match.talent_name ?? "Kandidat"}</h3>
                        {match.is_demo && (
                          <Badge variant="warn" size="sm">DEMO</Badge>
                        )}
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
                      
                      {match.last_message ? (
                        <p className="text-sm text-muted-foreground mt-3 truncate">{match.last_message}</p>
                      ) : (
                        <div className="flex items-center gap-2 mt-3 text-sm text-primary bg-primary-muted rounded-lg px-3 py-2">
                          <Sparkles className="h-4 w-4" />
                          <span>Ny matchning – skicka första meddelandet!</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="gap-1" 
                        onClick={() => navigate(`/employer/matches/${match.id}`)}
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
                      
                      {/* Send Offer Button */}
                      <div className="flex flex-col items-end gap-0.5">
                        <Button
                          variant={alreadyHasOffer ? "ghost" : "secondary"}
                          size="sm"
                          className="gap-1"
                          disabled={alreadyHasOffer}
                          onClick={() => handleSendOffer({
                            id: match.id,
                            talent_user_id: match.talent_user_id ?? "",
                            job_post_id: match.job_post_id,
                            job_title: match.job_title,
                            job_location: match.job_location,
                            job_start_date: match.job_start_date,
                            job_end_date: match.job_end_date,
                          })}
                          title={alreadyHasOffer ? "Ett erbjudande är redan aktivt" : undefined}
                        >
                          <FileText className="h-4 w-4" />
                          {alreadyHasOffer ? "Erbjudande skickat" : "Erbjudande"}
                        </Button>
                        {alreadyHasOffer && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Redan aktivt</span>
                        )}
                      </div>
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
            message="Swipea höger på kandidater du vill kontakta."
            action={{ label: "Hitta kandidater", onClick: () => navigate("/employer/swipe-talent") }} 
          />
        )}
      </div>

      {/* Offer Composer Modal */}
      {orgId && selectedMatch && (
        <OfferComposerModal
          open={offerModalOpen}
          onClose={() => {
            setOfferModalOpen(false);
            setSelectedMatch(null);
          }}
          orgId={orgId}
          talentUserId={selectedMatch.talent_user_id}
          matchId={selectedMatch.id}
          listingId={selectedMatch.job_post_id}
          prefill={{
            role_title: selectedMatch.job_title,
            location: selectedMatch.job_location,
            start_date: selectedMatch.job_start_date,
            end_date: selectedMatch.job_end_date,
          }}
        />
      )}
    </AppShell>
  );
}

export default EmployerMatches;
