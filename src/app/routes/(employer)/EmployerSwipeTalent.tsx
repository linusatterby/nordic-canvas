import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { CandidateCard } from "@/components/cards/CandidateCard";
import { EmptyState } from "@/components/delight/EmptyStates";
import { ConfettiPulse } from "@/components/delight/ConfettiPulse";
import { useToasts } from "@/components/delight/Toasts";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { useJob } from "@/hooks/useJobsFeed";
import { useTalentFeed } from "@/hooks/useTalentFeed";
import { useDefaultOrgId } from "@/hooks/useOrgs";
import { useSwipeEmployerTalent } from "@/hooks/useSwipes";
import { getMatchByJobAndTalent } from "@/lib/api/matches";

export function EmployerSwipeTalent() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToasts();
  const { data: orgId } = useDefaultOrgId();
  const { data: job } = useJob(jobId);
  const { data: talents, isLoading } = useTalentFeed(jobId, orgId ?? undefined);
  const swipeMutation = useSwipeEmployerTalent();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [showConfetti, setShowConfetti] = React.useState(false);

  const currentTalent = talents?.[currentIndex];

  const handleSwipe = async (direction: "yes" | "no") => {
    if (!currentTalent || !orgId || !jobId) return;

    try {
      await swipeMutation.mutateAsync({
        orgId,
        jobId,
        talentUserId: currentTalent.user_id,
        direction,
      });

      if (direction === "yes") {
        const { match } = await getMatchByJobAndTalent(jobId, currentTalent.user_id);
        if (match) {
          setShowConfetti(true);
          addToast({
            type: "match",
            title: "Match!",
            message: `${currentTalent.full_name ?? "Kandidaten"} är intresserad!`,
            action: {
              label: "Öppna chatten",
              onClick: () => navigate(`/employer/matches/${match.id}`),
            },
          });
        }
      }

      if (talents && currentIndex < talents.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(talents?.length ?? 0);
      }
    } catch {
      addToast({ type: "error", title: "Fel", message: "Kunde inte spara." });
    }
  };

  if (isLoading) {
    return (
      <AppShell role="employer">
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <Skeleton className="h-8 w-48 mx-auto mb-6" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="employer">
      <ConfettiPulse trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/employer/jobs")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Kandidater</h1>
            {job && <p className="text-sm text-muted-foreground">{job.title}</p>}
          </div>
        </div>

        {currentTalent ? (
          <div className="animate-fade-in">
            <CandidateCard
              id={currentTalent.user_id}
              name={currentTalent.full_name ?? "Anonym"}
              role="Kandidat"
              legacyScore={currentTalent.legacy_score_cached ?? 50}
              badges={currentTalent.badges.map((b) => ({
                label: b.label ?? b.badge_key,
                variant: b.verified ? "verified" : "primary",
              }))}
              availability={currentTalent.availability_snippet}
              hasVideoPitch={currentTalent.has_video}
              onSwipeYes={() => handleSwipe("yes")}
              onSwipeNo={() => handleSwipe("no")}
            />
          </div>
        ) : (
          <EmptyState
            type="no-matches"
            title="Inga fler kandidater"
            message="Alla intresserade kandidater har granskats."
            action={{ label: "Tillbaka till jobb", onClick: () => navigate("/employer/jobs") }}
          />
        )}
      </div>
    </AppShell>
  );
}

export default EmployerSwipeTalent;
