import * as React from "react";
import { AppShell } from "@/app/layout/AppShell";
import { JobCard } from "@/components/cards/JobCard";
import { EmptyState } from "@/components/delight/EmptyStates";
import { ConfettiPulse } from "@/components/delight/ConfettiPulse";
import { useToasts } from "@/components/delight/Toasts";
import { HOUSING_STATUS } from "@/lib/constants/status";

// Stub jobs data
const stubJobs = [
  {
    id: "1",
    title: "Liftskötare",
    company: "Åre Ski Resort",
    location: "Åre, Jämtland",
    period: "Dec 2025 - Apr 2026",
    housingStatus: HOUSING_STATUS.OFFERED,
    matchHint: "Bra match för dina badges",
  },
  {
    id: "2",
    title: "Receptionist",
    company: "Storhogna Högfjällshotell",
    location: "Vemdalen, Härjedalen",
    period: "Jan 2026 - Mar 2026",
    housingStatus: HOUSING_STATUS.VERIFIED,
    matchHint: undefined,
  },
  {
    id: "3",
    title: "Skidlärare",
    company: "Sälen Ski School",
    location: "Sälen, Dalarna",
    period: "Dec 2025 - Apr 2026",
    housingStatus: HOUSING_STATUS.NEEDED,
    matchHint: "Matchar din erfarenhet som skidlärare",
  },
];

export function TalentSwipeJobs() {
  const [jobs, setJobs] = React.useState(stubJobs);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const { addToast } = useToasts();

  const currentJob = jobs[currentIndex];

  const handleSwipeYes = (id: string) => {
    // Simulate mutual match (30% chance)
    const isMutualMatch = Math.random() < 0.3;
    
    if (isMutualMatch) {
      setShowConfetti(true);
      addToast({
        type: "match",
        title: "Match!",
        message: `${currentJob?.company} vill också träffa dig!`,
        action: {
          label: "Skicka meddelande",
          onClick: () => console.log("Open chat"),
        },
      });
    } else {
      addToast({
        type: "info",
        title: "Intresse skickat",
        message: `Ditt intresse för ${currentJob?.company} har skickats.`,
      });
    }

    if (currentIndex < jobs.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setJobs([]);
    }
  };

  const handleSwipeNo = (id: string) => {
    if (currentIndex < jobs.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setJobs([]);
    }
  };

  return (
    <AppShell role="talent" user={{ name: "Erik Svensson" }}>
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
              {...currentJob}
              onSwipeYes={handleSwipeYes}
              onSwipeNo={handleSwipeNo}
            />
            <p className="text-center text-xs text-muted-foreground mt-4">
              Använd piltangenter eller J/K för att swipea
            </p>
          </div>
        ) : (
          <EmptyState
            type="no-matches"
            title="Slut för idag!"
            message="Du har swipad igenom alla jobb. Kom tillbaka imorgon för fler."
          />
        )}
      </div>
    </AppShell>
  );
}

export default TalentSwipeJobs;
