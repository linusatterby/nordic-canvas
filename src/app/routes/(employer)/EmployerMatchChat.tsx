import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowLeft, FileText } from "lucide-react";
import { useMatch } from "@/hooks/useMatches";
import { useDefaultOrgId } from "@/hooks/useOrgs";
import { useOrgOffers } from "@/hooks/useOffers";
import { MatchChatView } from "@/components/chat/MatchChatView";
import { OfferComposerModal } from "@/components/offers";

const quickReplies = [
  "Hej! Tack för din ansökan.",
  "Vilka tider passar dig?",
  "Kan vi boka ett samtal?",
];

export function EmployerMatchChat() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { data: orgId } = useDefaultOrgId();
  const { data: match, isLoading: matchLoading } = useMatch(matchId);
  const { data: orgOffers } = useOrgOffers(orgId);
  
  const [offerModalOpen, setOfferModalOpen] = React.useState(false);

  // Check if offer already sent (anti-spam UI guard)
  const hasActiveOffer = orgOffers?.some(
    (o) => 
      (o.match_id === matchId || o.talent_user_id === match?.talent_user_id) && 
      ["sent", "accepted"].includes(o.status)
  );

  if (matchLoading) {
    return (
      <AppShell role="employer">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="employer">
      <div className="container mx-auto px-4 py-4 max-w-2xl h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/employer/matches")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-semibold text-foreground">{match?.talent_name ?? "Talang"}</h1>
              <p className="text-sm text-muted-foreground">{match?.job_title}</p>
            </div>
          </div>
          
          {/* Send Offer Button */}
          <Button
            variant={hasActiveOffer ? "ghost" : "secondary"}
            size="sm"
            className="gap-1"
            disabled={hasActiveOffer}
            onClick={() => setOfferModalOpen(true)}
            title={hasActiveOffer ? "Ett erbjudande är redan skickat" : undefined}
          >
            <FileText className="h-4 w-4" />
            {hasActiveOffer ? "Erbjudande skickat" : "Skicka erbjudande"}
          </Button>
        </div>

        {/* Shared Chat View Component */}
        <MatchChatView
          matchId={matchId}
          quickReplies={quickReplies}
          emptyMessage="Säg hej till talangen!"
        />
      </div>

      {/* Offer Composer Modal */}
      {orgId && match && (
        <OfferComposerModal
          open={offerModalOpen}
          onClose={() => setOfferModalOpen(false)}
          orgId={orgId}
          talentUserId={match.talent_user_id ?? ""}
          matchId={matchId}
          listingId={match.job_post_id}
          prefill={{
            role_title: match.job_title,
            location: match.job_location,
            start_date: match.job_start_date,
            end_date: match.job_end_date,
          }}
        />
      )}
    </AppShell>
  );
}

export default EmployerMatchChat;
