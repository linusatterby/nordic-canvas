import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { CandidateCard } from "@/components/cards/CandidateCard";
import { EmptyState } from "@/components/delight/EmptyStates";
import { ConfettiPulse } from "@/components/delight/ConfettiPulse";
import { useToasts } from "@/components/delight/Toasts";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, RefreshCw, Bug } from "lucide-react";
import { useJob } from "@/hooks/useJobsFeed";
import { useTalentFeed } from "@/hooks/useTalentFeed";
import { useDefaultOrgId } from "@/hooks/useOrgs";
import { useSwipeEmployerTalent } from "@/hooks/useSwipes";
import { getMatchByJobAndTalent } from "@/lib/api/matches";
import { useDemoCoachToast } from "@/hooks/useDemoCoachToast";
import { useDemoMode, useResetDemo } from "@/hooks/useDemo";

export function EmployerSwipeTalent() {
  useDemoCoachToast("swipe-talent");
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToasts();
  const { data: orgId } = useDefaultOrgId();
  const { isDemoMode } = useDemoMode();
  const resetDemo = useResetDemo();
  
  // Fetch job details
  const { data: job, isLoading: jobLoading, error: jobError } = useJob(jobId);
  
  // Fetch talents with demo fallback
  const { 
    data: talents, 
    isLoading: talentsLoading, 
    debug: talentDebug,
    refetch: refetchTalents,
  } = useTalentFeed(jobId, orgId ?? undefined, isDemoMode);
  
  const swipeMutation = useSwipeEmployerTalent();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [showDebug, setShowDebug] = React.useState(false);

  const currentTalent = talents?.[currentIndex];
  const isLoading = jobLoading || talentsLoading;

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

  const handleResetDemo = async () => {
    try {
      await resetDemo.mutateAsync(undefined);
      setCurrentIndex(0);
      refetchTalents();
      addToast({ type: "success", title: "Demo återställt", message: "Du kan nu swipa igen." });
    } catch (err) {
      addToast({ type: "error", title: "Fel", message: "Kunde inte återställa demo." });
    }
  };

  // No jobId provided
  if (!jobId) {
    return (
      <AppShell role="employer">
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <EmptyState
            type="no-data"
            title="Välj ett jobb"
            message="Du behöver välja ett jobb för att swipa kandidater."
            action={{ label: "Gå till Mina jobb", onClick: () => navigate("/employer/jobs") }}
          />
          
          {isDemoMode && (
            <Card className="mt-4 p-3 bg-muted/50 border-dashed">
              <p className="text-xs text-muted-foreground font-mono">
                <span className="font-semibold">Debug:</span> jobId saknas i URL
              </p>
            </Card>
          )}
        </div>
      </AppShell>
    );
  }

  // Loading state
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

  // Job not found
  if (jobError || !job) {
    return (
      <AppShell role="employer">
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <EmptyState
            type="no-data"
            title="Jobb hittades inte"
            message="Det valda jobbet kunde inte hittas eller har tagits bort."
            action={{ label: "Gå till Mina jobb", onClick: () => navigate("/employer/jobs") }}
          />
          
          {isDemoMode && (
            <Card className="mt-4 p-3 bg-muted/50 border-dashed">
              <p className="text-xs text-muted-foreground font-mono">
                <span className="font-semibold">Debug:</span> jobId={jobId}, error={jobError?.message ?? "Job not found"}
              </p>
            </Card>
          )}
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
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Kandidater</h1>
            <p className="text-sm text-muted-foreground">{job.title}</p>
          </div>
          
          {isDemoMode && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDebug(!showDebug)}
              className="text-muted-foreground"
            >
              <Bug className="h-4 w-4" />
            </Button>
          )}
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
            
            <p className="text-center text-sm text-muted-foreground mt-4">
              {currentIndex + 1} av {talents?.length ?? 0} kandidater
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <EmptyState
              type="no-matches"
              title="Inga fler kandidater"
              message={isDemoMode 
                ? "Alla demo-kandidater har granskats. Återställ demo för att börja om."
                : "Alla intresserade kandidater har granskats."
              }
              action={isDemoMode 
                ? { 
                    label: "Återställ demo", 
                    onClick: handleResetDemo,
                  }
                : { 
                    label: "Tillbaka till jobb", 
                    onClick: () => navigate("/employer/jobs"),
                  }
              }
            />
            
            {/* Debug panel for demo mode */}
            {isDemoMode && (
              <Card className="p-4 bg-muted/50 border-dashed space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">🐞 Demo Debug</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => refetchTalents()}
                    className="h-6 px-2 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refetch
                  </Button>
                </div>
                
                <div className="text-xs font-mono space-y-1">
                  <p><span className="text-muted-foreground">demoMode:</span> true</p>
                  <p><span className="text-muted-foreground">jobId:</span> {jobId}</p>
                  <p><span className="text-muted-foreground">jobTitle:</span> {job.title}</p>
                  <p><span className="text-muted-foreground">jobLocation:</span> {job.location ?? "N/A"}</p>
                  <p><span className="text-muted-foreground">jobRoleKey:</span> {job.role_key}</p>
                  <hr className="border-border my-2" />
                  <p><span className="text-muted-foreground">normalCount:</span> {talentDebug.normalCount}</p>
                  <p><span className="text-muted-foreground">hardCount:</span> {talentDebug.hardCount}</p>
                  <p><span className="text-muted-foreground">shouldUseHardFetch:</span> {String(talentDebug.shouldUseHardFetch)}</p>
                  <p><span className="text-muted-foreground">currentIndex:</span> {currentIndex}</p>
                  {talentDebug.normalError && (
                    <p className="text-destructive"><span className="text-muted-foreground">normalError:</span> {talentDebug.normalError}</p>
                  )}
                  {talentDebug.hardError && (
                    <p className="text-destructive"><span className="text-muted-foreground">hardError:</span> {talentDebug.hardError}</p>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
        
        {/* Inline debug panel when toggled */}
        {isDemoMode && showDebug && currentTalent && (
          <Card className="mt-4 p-4 bg-muted/50 border-dashed space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">🐞 Demo Debug</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetchTalents()}
                className="h-6 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refetch
              </Button>
            </div>
            
            <div className="text-xs font-mono space-y-1">
              <p><span className="text-muted-foreground">jobId:</span> {jobId}</p>
              <p><span className="text-muted-foreground">normalCount:</span> {talentDebug.normalCount}</p>
              <p><span className="text-muted-foreground">hardCount:</span> {talentDebug.hardCount}</p>
              <p><span className="text-muted-foreground">shouldUseHardFetch:</span> {String(talentDebug.shouldUseHardFetch)}</p>
              <p><span className="text-muted-foreground">currentIndex:</span> {currentIndex} / {talents?.length ?? 0}</p>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

export default EmployerSwipeTalent;
