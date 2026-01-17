import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { AppShell } from "@/app/layout/AppShell";
import { JobCard } from "@/components/cards/JobCard";
import { JobFilters, DEFAULT_FILTERS, type JobFilterValues } from "@/components/jobs/JobFilters";
import { EmptyState } from "@/components/delight/EmptyStates";
import { ConfettiPulse } from "@/components/delight/ConfettiPulse";
import { useToasts } from "@/components/delight/Toasts";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { HOUSING_STATUS } from "@/lib/constants/status";
import { useJobsFeed, useResetTalentDemoSwipes } from "@/hooks/useJobsFeed";
import { useSwipeTalentJob } from "@/hooks/useSwipes";
import { getMatchByJobAndTalent } from "@/lib/api/matches";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoCoachToast } from "@/hooks/useDemoCoachToast";
import { useDemoMode } from "@/hooks/useDemo";
import type { JobFilters as JobFiltersType } from "@/lib/api/jobs";

export function TalentSwipeJobs() {
  useDemoCoachToast("swipe-jobs");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [filters, setFilters] = React.useState<JobFilterValues>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = React.useState(true);
  const { addToast } = useToasts();

  // Convert UI filter values to API filter format
  const apiFilters: JobFiltersType = React.useMemo(() => ({
    location: filters.location !== "all" ? filters.location : null,
    roleKey: filters.roleKey !== "all" ? filters.roleKey : null,
    startDate: filters.startDate || null,
    endDate: filters.endDate || null,
    housingOnly: filters.housingOnly,
  }), [filters]);

  const { data: jobs, isLoading, error } = useJobsFeed(apiFilters);
  const swipeMutation = useSwipeTalentJob();
  const resetSwipesMutation = useResetTalentDemoSwipes();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [showConfetti, setShowConfetti] = React.useState(false);

  // Reset index when filters change
  React.useEffect(() => {
    setCurrentIndex(0);
  }, [filters]);

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

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleResetDemoSwipes = async () => {
    try {
      await resetSwipesMutation.mutateAsync();
      setCurrentIndex(0);
      addToast({
        type: "success",
        title: "Återställt",
        message: "Dina demo-swipes har återställts. Du kan nu swipea jobben igen.",
      });
    } catch (err) {
      addToast({ type: "error", title: "Fel", message: "Kunde inte återställa demo-swipes." });
    }
  };

  const mapHousingStatus = (offered?: boolean | null) => {
    if (offered) return HOUSING_STATUS.OFFERED;
    return HOUSING_STATUS.NONE;
  };

  const hasActiveFilters =
    filters.location !== "all" ||
    filters.roleKey !== "all" ||
    filters.startDate ||
    filters.endDate ||
    filters.housingOnly;

  if (isLoading) {
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
              title={hasActiveFilters ? "Inga jobb matchar dina filter" : "Du är ikapp!"}
              message={
                hasActiveFilters
                  ? "Prova att ändra eller rensa filtren för att se fler jobb."
                  : "Ändra filter eller uppdatera din tillgänglighet för fler matchningar."
              }
              action={
                hasActiveFilters
                  ? { label: "Rensa filter", onClick: handleClearFilters }
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
          </div>
        ) : (
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
              {jobs && jobs.length > 1 && (
                <span className="block mb-1">
                  {currentIndex + 1} av {jobs.length} jobb
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
