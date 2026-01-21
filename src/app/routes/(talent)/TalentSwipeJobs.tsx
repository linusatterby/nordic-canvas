import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, RefreshCw, Bug } from "lucide-react";
import { AppShell } from "@/app/layout/AppShell";
import { JobCard } from "@/components/cards/JobCard";
import { JobFilters, DEFAULT_FILTERS, type JobFilterValues } from "@/components/jobs/JobFilters";
import { EmptyState } from "@/components/delight/EmptyStates";
import { ConfettiPulse } from "@/components/delight/ConfettiPulse";
import { useToasts } from "@/components/delight/Toasts";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { HOUSING_STATUS } from "@/lib/constants/status";
import { useJobsFeed, useResetTalentDemoSwipes, useDemoJobsHard } from "@/hooks/useJobsFeed";
import { useSwipeTalentJob } from "@/hooks/useSwipes";
import { getMatchByJobAndTalent } from "@/lib/api/matches";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoCoachToast } from "@/hooks/useDemoCoachToast";
import { useDemoMode } from "@/hooks/useDemo";
import { shouldShowDemoDebug } from "@/lib/utils/debug";
import type { JobFilters as JobFiltersType } from "@/lib/api/jobs";

export function TalentSwipeJobs() {
  useDemoCoachToast("swipe-jobs");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [filters, setFilters] = React.useState<JobFilterValues>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = React.useState(true);
  const [showDebug, setShowDebug] = React.useState(false);
  const { addToast } = useToasts();

  // Convert UI filter values to API filter format
  const apiFilters: JobFiltersType = React.useMemo(() => ({
    location: filters.location !== "all" ? filters.location : null,
    roleKey: filters.roleKey !== "all" ? filters.roleKey : null,
    startDate: filters.startDate || null,
    endDate: filters.endDate || null,
    housingOnly: filters.housingOnly,
  }), [filters]);

  const { data: jobs, isLoading, error: feedError, refetch: refetchFeed } = useJobsFeed(apiFilters);
  const swipeMutation = useSwipeTalentJob();
  const resetSwipesMutation = useResetTalentDemoSwipes();
  const [showConfetti, setShowConfetti] = React.useState(false);

  // Use hard demo fetch as fallback when normal feed is empty in demo mode
  const shouldUseHardFetch = isDemoMode && !isLoading && (!jobs || jobs.length === 0);
  const { 
    data: hardDemoJobs, 
    error: hardDemoError, 
    refetch: refetchHardDemo,
    isLoading: isHardLoading 
  } = useDemoJobsHard(shouldUseHardFetch);

  // Determine which jobs to show - use effectiveJobs as a stack (first item = current)
  const effectiveJobs = React.useMemo(() => {
    if (jobs && jobs.length > 0) return jobs;
    if (shouldUseHardFetch && hardDemoJobs && hardDemoJobs.length > 0) {
      // Convert hard demo jobs to JobWithOrg format
      return hardDemoJobs.map(job => ({
        ...job,
        org_name: "Demo-företag",
        required_badges: null,
        housing_text: job.housing_text ?? null,
      }));
    }
    return [];
  }, [jobs, shouldUseHardFetch, hardDemoJobs]);

  // Current job is always the first in the stack (optimistic updates remove swiped jobs)
  const currentJob = effectiveJobs[0];

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

      // Job is removed optimistically by mutation - no index management needed
    } catch (err) {
      addToast({ type: "error", title: "Fel", message: "Kunde inte spara." });
    }
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleResetDemoSwipes = async () => {
    try {
      await resetSwipesMutation.mutateAsync();
      // Jobs will be refetched automatically via query invalidation
      addToast({
        type: "success",
        title: "Återställt",
        message: "Dina demo-swipes har återställts. Du kan nu swipea jobben igen.",
      });
    } catch (err) {
      addToast({ type: "error", title: "Fel", message: "Kunde inte återställa demo-swipes." });
    }
  };

  const mapHousingStatus = (offered?: boolean | null, housingText?: string | null) => {
    if (offered || housingText) return HOUSING_STATUS.OFFERED;
    return HOUSING_STATUS.NONE;
  };

  const hasActiveFilters =
    filters.location !== "all" ||
    filters.roleKey !== "all" ||
    filters.startDate ||
    filters.endDate ||
    filters.housingOnly;

  if (isLoading || isHardLoading) {
    return (
      <AppShell role="talent">
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <Skeleton className="h-8 w-48 mx-auto mb-6" />
          <Skeleton className="h-32 w-full rounded-xl mb-4" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  const formatPeriod = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
    return `${s.toLocaleDateString("sv-SE", opts)} – ${e.toLocaleDateString("sv-SE", opts)}`;
  };

  const isEmpty = !currentJob;

  return (
    <AppShell role="talent">
      <ConfettiPulse trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      <div className="container mx-auto px-4 py-6 max-w-lg">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-foreground">Hitta jobb</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Swipea för att hitta din nästa säsong
          </p>
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-3 py-2 mb-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
        >
          <span className="text-muted-foreground">
            Filter {hasActiveFilters && <span className="text-primary">• aktiva</span>}
          </span>
          {showFilters ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-4 p-3 rounded-xl bg-card border border-border animate-fade-in">
            <JobFilters
              values={filters}
              onChange={setFilters}
              onClear={handleClearFilters}
            />
          </div>
        )}

        {/* Job Card or Empty State */}
        {isEmpty ? (
          <div className="space-y-4">
            <EmptyState
              type="no-matches"
              title={
                hasActiveFilters 
                  ? "Inga jobb matchar dina filter" 
                  : isDemoMode 
                    ? "Inga demo-jobb kvar" 
                    : "Du är ikapp!"
              }
              message={
                hasActiveFilters
                  ? "Prova att ändra eller rensa filtren för att se fler jobb."
                  : isDemoMode
                    ? "Rensa filter eller återställ demo för att se fler jobb."
                    : "Uppdatera din tillgänglighet i profilen för fler matchningar."
              }
              action={
                hasActiveFilters
                  ? { label: "Rensa filter", onClick: handleClearFilters }
                  : isDemoMode
                    ? { label: "Återställ demo", onClick: handleResetDemoSwipes }
                    : { label: "Till profilen", onClick: () => navigate("/talent/profile") }
              }
            />
            
            {/* Additional actions */}
            <div className="flex flex-col gap-2">
              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => navigate("/talent/profile")}
                  className="w-full"
                >
                  Till profilen
                </Button>
              )}
              
              {isDemoMode && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleResetDemoSwipes}
                  disabled={resetSwipesMutation.isPending}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${resetSwipesMutation.isPending ? 'animate-spin' : ''}`} />
                  Återställ demo-swipes
                </Button>
              )}
            </div>

            {/* Debug Panel - only with VITE_DEMO_DEBUG=true */}
            {shouldShowDemoDebug(isDemoMode) && (
              <div className="mt-6">
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Bug className="h-3 w-3" />
                  {showDebug ? "Dölj debug" : "Visa debug-info"}
                </button>
                
                {showDebug && (
                  <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border text-xs font-mono space-y-1">
                    <p><span className="text-muted-foreground">demoMode:</span> {isDemoMode ? "true" : "false"}</p>
                    <p><span className="text-muted-foreground">normalFeedCount:</span> {jobs?.length ?? 0}</p>
                    <p><span className="text-muted-foreground">normalFeedError:</span> {feedError?.message ?? "null"}</p>
                    <p><span className="text-muted-foreground">hardDemoCount:</span> {hardDemoJobs?.length ?? 0}</p>
                    <p><span className="text-muted-foreground">hardDemoError:</span> {hardDemoError?.message ?? "null"}</p>
                    <p><span className="text-muted-foreground">effectiveJobsCount:</span> {effectiveJobs.length}</p>
                    <p><span className="text-muted-foreground">shouldUseHardFetch:</span> {shouldUseHardFetch ? "true" : "false"}</p>
                    
                    {/* Show status values from hard demo jobs */}
                    {hardDemoJobs && hardDemoJobs.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-muted-foreground mb-1">hardDemoJobs status-värden:</p>
                        {hardDemoJobs.map((job, i) => (
                          <p key={job.id} className="pl-2">
                            [{i}] {job.title?.slice(0, 20)}... → status: "{job.status}", is_demo: {String(job.is_demo)}
                          </p>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchFeed()}
                        className="text-xs"
                      >
                        Refetch normal
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchHardDemo()}
                        className="text-xs"
                      >
                        Refetch hard demo
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="animate-fade-in">
            <JobCard
              id={currentJob.id}
              title={currentJob.title}
              company={currentJob.org_name}
              location={currentJob.location ?? "Okänd plats"}
              period={formatPeriod(currentJob.start_date, currentJob.end_date)}
              housingStatus={mapHousingStatus(currentJob.housing_offered, currentJob.housing_text)}
              housingText={currentJob.housing_text}
              onSwipeYes={() => handleSwipe("yes")}
              onSwipeNo={() => handleSwipe("no")}
            />
            <p className="text-center text-xs text-muted-foreground mt-4">
              {effectiveJobs && effectiveJobs.length > 0 && (
                <span className="block mb-1">
                  {effectiveJobs.length} jobb kvar
                </span>
              )}
              Använd piltangenter eller J/K för att swipea
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default TalentSwipeJobs;
