import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { JobCard } from "@/components/cards/JobCard";
import { EmptyState } from "@/components/delight/EmptyStates";
import { ConfettiPulse } from "@/components/delight/ConfettiPulse";
import { useToasts } from "@/components/delight/Toasts";
import { Skeleton } from "@/components/ui/Skeleton";
import { HOUSING_STATUS } from "@/lib/constants/status";
import { useJobsFeed } from "@/hooks/useJobsFeed";
import { useSwipeTalentJob } from "@/hooks/useSwipes";
import { getMatchByJobAndTalent } from "@/lib/api/matches";
import { useAuth } from "@/contexts/AuthContext";

export function TalentSwipeJobs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: jobs, isLoading, error } = useJobsFeed();
  const swipeMutation = useSwipeTalentJob();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const { addToast } = useToasts();

  const currentJob = jobs?.[currentIndex];

  const handleSwipe = async (direction: "yes" | "no") => {
    if (!currentJob || !user) return;

    try {
      await swipeMutation.mutateAsync({ jobId: currentJob.id, direction });

      if (direction === "yes") {
        // Check for mutual match
        const { match } = await getMatchByJobAndTalent(currentJob.id, user.id);
        if (match) {
          setShowConfetti(true);
          addToast({
            type: "match",
            title: "Match!",
            message: `${currentJob.org_name} vill också träffa dig!`,
            action: {
              label: "Öppna chatten",
              onClick: () => navigate(`/talent/matches/${match.id}`),
            },
          });
        } else {
          addToast({
            type: "info",
            title: "Intresse skickat",
            message: `Ditt intresse för ${currentJob.org_name} har skickats.`,
          });
        }
      }

      // Move to next job
      if (jobs && currentIndex < jobs.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(jobs?.length ?? 0);
      }
    } catch (err) {
      addToast({ type: "error", title: "Fel", message: "Kunde inte spara." });
    }
  };

  const mapHousingStatus = (offered?: boolean | null) => {
    if (offered) return HOUSING_STATUS.OFFERED;
    return HOUSING_STATUS.NONE;
  };

  if (isLoading) {
    return (
      <AppShell role="talent">
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <Skeleton className="h-8 w-48 mx-auto mb-6" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  const formatPeriod = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
    return `${s.toLocaleDateString("sv-SE", opts)} - ${e.toLocaleDateString("sv-SE", opts)}`;
  };

  return (
    <AppShell role="talent">
      <ConfettiPulse trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-foreground">Hitta jobb</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Swipea för att hitta din nästa säsong
          </p>
        </div>

        {currentJob ? (
          <div className="animate-fade-in">
            <JobCard
              id={currentJob.id}
              title={currentJob.title}
              company={currentJob.org_name}
              location={currentJob.location ?? "Okänd plats"}
              period={formatPeriod(currentJob.start_date, currentJob.end_date)}
              housingStatus={mapHousingStatus(currentJob.housing_offered)}
              onSwipeYes={() => handleSwipe("yes")}
              onSwipeNo={() => handleSwipe("no")}
            />
            <p className="text-center text-xs text-muted-foreground mt-4">
              Använd piltangenter eller J/K för att swipea
            </p>
          </div>
        ) : (
          <EmptyState
            type="no-matches"
            title="Du är ikapp!"
            message="Ändra filter eller uppdatera din tillgänglighet för fler matchningar."
            action={{ label: "Till profilen", onClick: () => navigate("/talent/profile") }}
          />
        )}
      </div>
    </AppShell>
  );
}

export default TalentSwipeJobs;
