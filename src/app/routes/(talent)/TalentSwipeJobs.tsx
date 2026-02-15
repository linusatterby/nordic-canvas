import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, RefreshCw, Bug, Briefcase, Clock } from "lucide-react";
import { AppShell } from "@/app/layout/AppShell";
import { JobCard } from "@/components/cards/JobCard";
import { TalentListingsFilters, DEFAULT_TALENT_FILTERS, type TalentListingFilterValues } from "@/components/filters/TalentListingsFilters";
import { EmptyState } from "@/components/delight/EmptyStates";
import { ConfettiPulse } from "@/components/delight/ConfettiPulse";
import { useToasts } from "@/components/delight/Toasts";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HOUSING_STATUS } from "@/lib/constants/status";
import { useListings } from "@/hooks/useListings";
import { useResetTalentDemoSwipes, useDemoJobsHard } from "@/hooks/useJobsFeed";
import { useSwipeTalentJob } from "@/hooks/useSwipes";
import { useListingScores } from "@/hooks/useRanking";
import { useStableRankedStack, hashFilters } from "@/hooks/useStableRankedStack";
import { getMatchByJobAndTalent } from "@/lib/api/matches";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoCoachToast } from "@/hooks/useDemoCoachToast";
import { useDemoMode } from "@/hooks/useDemo";
import { shouldShowDemoDebug } from "@/lib/utils/debug";
import type { ListingFilters, ListingType, ListingWithOrg } from "@/lib/api/jobs";

export function TalentSwipeJobs() {
  useDemoCoachToast("swipe-jobs");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [filters, setFilters] = React.useState<TalentListingFilterValues>(DEFAULT_TALENT_FILTERS);
  const [showFilters, setShowFilters] = React.useState(true);
  const [showDebug, setShowDebug] = React.useState(false);
  const { addToast } = useToasts();

  // Convert UI filter values to API filter format
  const apiFilters: ListingFilters = React.useMemo(() => ({
    location: filters.location || null,
    roleKey: filters.role || null,
    startDate: filters.startDate || null,
    endDate: filters.endDate || null,
    housingOnly: filters.housingOnly,
    includeShiftCover: filters.includeShiftCover,
    excludeSwipedByUserId: user?.id,
  }), [filters, user?.id]);

  const { data: listings, isLoading, error: feedError, refetch: refetchFeed } = useListings(apiFilters);
  const swipeMutation = useSwipeTalentJob();
  const resetSwipesMutation = useResetTalentDemoSwipes();
  const [showConfetti, setShowConfetti] = React.useState(false);

  // Use hard demo fetch as fallback when normal feed is empty in demo mode
  const shouldUseHardFetch = isDemoMode && !isLoading && (!listings || listings.length === 0);
  const { 
    data: hardDemoJobs, 
    error: hardDemoError, 
    refetch: refetchHardDemo,
    isLoading: isHardLoading 
  } = useDemoJobsHard(shouldUseHardFetch);

  // Build raw listings (before scoring)
  const rawListings = React.useMemo((): ListingWithOrg[] => {
    if (listings && listings.length > 0) return listings;
    if (shouldUseHardFetch && hardDemoJobs && hardDemoJobs.length > 0) {
      // Convert hard demo jobs to ListingWithOrg format
      return hardDemoJobs.map(job => ({
        ...job,
        org_name: "Demo-företag",
        required_badges: null,
        housing_text: job.housing_text ?? null,
        listing_type: "job" as ListingType,
      })) as ListingWithOrg[];
    }
    return [];
  }, [listings, shouldUseHardFetch, hardDemoJobs]);

  // Get listing IDs for batch scoring (max 12)
  const listingIds = React.useMemo(() => 
    rawListings.slice(0, 12).map(l => l.id), 
    [rawListings]
  );

  // Fetch scores in batch (graceful: returns empty map on error)
  const { data: scoresMap } = useListingScores(
    user?.id,
    listingIds,
    listingIds.length > 0
  );

  // Create stable context key for ranking lock
  const contextKey = React.useMemo(() => {
    const filterHash = hashFilters({
      location: filters.location,
      role: filters.role,
      housingOnly: filters.housingOnly,
      includeShiftCover: filters.includeShiftCover,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
    return `talent:${filterHash}:${isDemoMode ? "demo" : "real"}`;
  }, [filters, isDemoMode]);

  // Use stable ranked stack - locks order once scores arrive
  const { ordered: effectiveListings, removeTop, reset: resetStack, debug: stackDebug } = useStableRankedStack({
    items: rawListings,
    scores: scoresMap,
    contextKey,
    topN: 12,
  });

  // Current listing is always the first in the stack
  const currentListing = effectiveListings[0];

  const handleSwipe = async (direction: "yes" | "no") => {
    if (!currentListing || !user) return;

    // Optimistically remove from stack immediately
    removeTop();

    try {
      await swipeMutation.mutateAsync({ jobId: currentListing.id, direction });

      if (direction === "yes") {
        // Check for mutual match
        const { match } = await getMatchByJobAndTalent(currentListing.id, user.id);
        if (match) {
          setShowConfetti(true);
          addToast({
            type: "match",
            title: "Match!",
            message: `${currentListing.org_name} vill också träffa dig!`,
            action: {
              label: "Öppna chatten",
              onClick: () => navigate(`/talent/matches/${match.id}`),
            },
          });
        } else {
          addToast({
            type: "info",
            title: "Intresse skickat",
            message: `Ditt intresse för ${currentListing.org_name} har skickats.`,
          });
        }
      }
    } catch (err) {
      // On error, reset the stack to restore the card
      resetStack();
      addToast({ type: "error", title: "Fel", message: "Kunde inte spara." });
    }
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_TALENT_FILTERS);
  };

  const handleResetDemoSwipes = async () => {
    try {
      await resetSwipesMutation.mutateAsync();
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
    filters.location !== "" ||
    filters.role !== "" ||
    filters.housingOnly ||
    filters.includeShiftCover ||
    filters.startDate ||
    filters.endDate;

  if (isLoading || isHardLoading) {
    return (
      <AppShell role="talent">
        <div className="container mx-auto px-4 py-6 max-w-lg">
          <div className="text-center mb-4 space-y-2">
            <Skeleton className="h-6 w-32 mx-auto" />
            <Skeleton className="h-4 w-52 mx-auto" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl mb-4" />
          <div className="rounded-[18px] border border-border/60 bg-card shadow-card overflow-hidden">
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="p-5 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
            <div className="flex gap-4 p-5 pt-0 justify-center">
              <Skeleton variant="circle" className="h-14 w-14" />
              <Skeleton variant="circle" className="h-14 w-14" />
            </div>
          </div>
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

  const isEmpty = !currentListing;

  // Get listing type for badge
  const getListingTypeBadge = (listingType?: string) => {
    if (listingType === "shift_cover") {
      return (
        <Badge variant="warn" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pass
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <Briefcase className="h-3 w-3" />
        Jobb
      </Badge>
    );
  };

  return (
    <AppShell role="talent">
      <ConfettiPulse trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      <div className="container mx-auto px-4 py-6 max-w-lg">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-foreground">Hitta jobb</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Swipea för att hitta jobb som passar dig
          </p>
        </div>

        {/* Filter Toggle + Demo Reset */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
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

          {isDemoMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetDemoSwipes}
              disabled={resetSwipesMutation.isPending}
              title="För demo: visar alla jobb igen."
              className="text-xs text-muted-foreground shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${resetSwipesMutation.isPending ? 'animate-spin' : ''}`} />
              Återställ swipes
            </Button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-4 p-3 rounded-xl bg-card border border-border animate-fade-in">
            <TalentListingsFilters
              values={filters}
              onChange={setFilters}
              onClear={handleClearFilters}
            />
          </div>
        )}

        {/* Listing Card or Empty State */}
        {isEmpty ? (
          <div className="space-y-4">
            <EmptyState
              type="no-matches"
              title={
                hasActiveFilters 
                  ? "Inga uppdrag matchar dina filter"
                  : isDemoMode 
                    ? "Inga demo-jobb kvar" 
                    : "Du är ikapp!"
              }
              message={
                hasActiveFilters
                  ? "Testa att ta bort ett filter eller slå av 'Endast boende'."
                  : isDemoMode
                    ? "Rensa filter eller återställ demo för att se fler jobb."
                    : "Uppdatera 'Söker & tillgänglighet' i profilen för fler matchningar."
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

            {/* Debug Panel */}
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
                    <p><span className="text-muted-foreground">listingsCount:</span> {listings?.length ?? 0}</p>
                    <p><span className="text-muted-foreground">feedError:</span> {feedError?.message ?? "null"}</p>
                    <p><span className="text-muted-foreground">hardDemoCount:</span> {hardDemoJobs?.length ?? 0}</p>
                    <p><span className="text-muted-foreground">effectiveCount:</span> {effectiveListings.length}</p>
                    <p><span className="text-muted-foreground">shouldUseHardFetch:</span> {shouldUseHardFetch ? "true" : "false"}</p>
                    <hr className="border-border my-2" />
                    <p><span className="text-muted-foreground">stackLocked:</span> {stackDebug?.locked ? "true" : "false"}</p>
                    <p><span className="text-muted-foreground">stackSize:</span> {stackDebug?.size ?? 0}</p>
                    <p><span className="text-muted-foreground">removedCount:</span> {stackDebug?.removedCount ?? 0}</p>
                    <p><span className="text-muted-foreground">contextKey:</span> {stackDebug?.contextKey ?? "N/A"}</p>
                    
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={() => refetchFeed()} className="text-xs">
                        Refetch normal
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => refetchHardDemo()} className="text-xs">
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
            {/* Listing type badge */}
            <div className="flex justify-center mb-3">
              {getListingTypeBadge((currentListing as { listing_type?: string }).listing_type)}
            </div>
            
            <JobCard
              id={currentListing.id}
              title={currentListing.title}
              company={currentListing.org_name}
              location={currentListing.location ?? "Okänd plats"}
              period={formatPeriod(currentListing.start_date, currentListing.end_date)}
              housingStatus={mapHousingStatus(currentListing.housing_offered, currentListing.housing_text)}
              housingText={currentListing.housing_text}
              matchScore={currentListing.match_score}
              matchReasons={currentListing.match_reasons}
              onSwipeYes={() => handleSwipe("yes")}
              onSwipeNo={() => handleSwipe("no")}
            />
            <p className="text-center text-xs text-muted-foreground mt-4">
              {effectiveListings && effectiveListings.length > 0 && (
                <span className="block mb-1">
                  {effectiveListings.length} uppdrag kvar
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
