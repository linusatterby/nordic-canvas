import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowLeft } from "lucide-react";
import { useMatch } from "@/hooks/useMatches";
import { MatchChatView } from "@/components/chat/MatchChatView";

const quickReplies = [
  "Hej! När kan du prata?",
  "Vilka tider passar dig?",
  "Tack för matchningen!",
];

export function TalentMatchChat() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { data: match, isLoading: matchLoading } = useMatch(matchId);

  if (matchLoading) {
    return (
      <AppShell role="talent">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="talent">
      <div className="container mx-auto px-4 py-4 max-w-2xl h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/talent/matches")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-foreground">{match?.job_title}</h1>
            <p className="text-sm text-muted-foreground">{match?.org_name}</p>
          </div>
        </div>

        {/* Shared Chat View Component */}
        <MatchChatView
          matchId={matchId}
          quickReplies={quickReplies}
          emptyMessage="Säg hej först! Ingen konversation ännu."
        />
      </div>
    </AppShell>
  );
}

export default TalentMatchChat;
