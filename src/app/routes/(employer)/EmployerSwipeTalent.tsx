import * as React from "react";
import { LABELS } from "@/config/labels";
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
import { useCandidateScores } from "@/hooks/useRanking";
import { useStableRankedStack } from "@/hooks/useStableRankedStack";
import { getMatchByJobAndTalent } from "@/lib/api/matches";
import { useDemoCoachToast } from "@/hooks/useDemoCoachToast";
import { useDemoMode, useResetDemo } from "@/hooks/useDemo";
import { shouldShowDemoDebug } from "@/lib/utils/debug";
import type { CandidateCardDTO } from "@/lib/api/talent";

// Unified ID helper for candidates
function getCandidateId(candidate: CandidateCardDTO): string {
  if (candidate.type === "demo_card" && candidate.demo_card_id) {
    return `demo:${candidate.demo_card_id}`;
  }
  return `talent:${candidate.user_id}`;
}

// Candidate with unified id for stable stack
interface StackableCandidate extends CandidateCardDTO {
  id: string; // unified id
}

export function EmployerSwipeTalent() {
  useDemoCoachToast("swipe-talent");
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToasts();
  const { data: orgId } = useDefaultOrgId();
  const { isDemoMode } = useDemoMode();
  const resetDemo = useResetDemo();
  
  // Fetch job details
  const { data: jobResult, isLoading: jobLoading, error: jobQueryError } = useJob(jobId);
  
  // Extract job from result
  const job = jobResult?.job ?? null;
  const jobError = jobResult?.error ?? jobQueryError ?? null;
  const jobReason = jobResult?.reason;
  
  // Fetch talents with demo fallback
  const { 
    data: rawTalents, 
    isLoading: talentsLoading, 
    debug: talentDebug,
    refetch: refetchTalents,
  } = useTalentFeed(jobId, orgId ?? undefined, isDemoMode);
  
  const swipeMutation = useSwipeEmployerTalent();
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [showDebug, setShowDebug] = React.useState(false);
  const [seenCount, setSeenCount] = React.useState(0);

  // Convert raw talents to stackable format with unified id
  const stackableItems = React.useMemo((): StackableCandidate[] => {
    return (rawTalents ?? []).map(t => ({
      ...t,
      id: getCandidateId(t),
    }));
  }, [rawTalents]);

  // Extract IDs for batch scoring (max 12)
  const { talentUserIds, demoCardIds } = React.useMemo(() => {
    const talents: string[] = [];
    const demos: string[] = [];
    
    stackableItems.slice(0, 12).forEach(t => {
      if (t.type === "demo_card" && t.demo_card_id) {
        demos.push(t.demo_card_id);
      } else if (t.user_id) {
        talents.push(t.user_id);
      }
    });
    
    return { talentUserIds: talents, demoCardIds: demos };
  }, [stackableItems]);

  // Fetch scores in batch (graceful: returns empty map on error)
  const { data: rawScoresMap } = useCandidateScores(
    orgId,
    jobId,
    talentUserIds,
    demoCardIds,
    !!orgId && !!jobId && (talentUserIds.length > 0 || demoCardIds.length > 0)
  );

  // Convert score map keys to unified id format
  const scoresMap = React.useMemo(() => {
    if (!rawScoresMap) return undefined;
    const converted = new Map<string, { score: number; reasons?: any[] }>();
    rawScoresMap.forEach((data, candidateId) => {
      // The RPC returns candidate_id which could be talent or demo card id
      // We need to match it with our unified format
      stackableItems.forEach(item => {
        const rawId = item.type === "demo_card" ? item.demo_card_id : item.user_id;
        if (rawId === candidateId) {
          converted.set(item.id, data);
        }
      });
    });
    return converted;
  }, [rawScoresMap, stackableItems]);

  // Create stable context key for ranking lock
  const contextKey = React.useMemo(() => {
    return `employer:${orgId ?? "none"}:${jobId ?? "none"}:${isDemoMode ? "demo" : "real"}`;
  }, [orgId, jobId, isDemoMode]);

  // Use stable ranked stack - locks order once scores arrive
  const { ordered: talents, removeTop, reset: resetStack, debug: stackDebug } = useStableRankedStack({
    items: stackableItems,
    scores: scoresMap,
    contextKey,
    topN: 12,
  });

  // Always show first talent in the stack (optimistic updates remove swiped ones)
  const currentTalent = talents?.[0];
  const remainingCount = talents?.length ?? 0;
  const isLoading = jobLoading || talentsLoading;

  const handleSwipe = async (direction: "yes" | "no") => {
    if (!currentTalent || !orgId || !jobId) return;

    // Optimistically remove from stack immediately
    removeTop();

    try {
      // Handle both real talents and demo cards
      if (currentTalent.type === "demo_card" && currentTalent.demo_card_id) {
        await swipeMutation.mutateAsync({
          orgId,
          jobId,
          demoCardId: currentTalent.demo_card_id,
          type: "demo_card",
          direction,
        });
        
        // Demo cards don't create real matches, just show success
        if (direction === "yes") {
          addToast({
            type: "success",
            title: "Intresse registrerat",
            message: `Du gillade ${currentTalent.full_name ?? "kandidaten"}!`,
          });
        }
      } else if (currentTalent.user_id) {
        await swipeMutation.mutateAsync({
          orgId,
          jobId,
          talentUserId: currentTalent.user_id,
          type: "real",
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
      }

      // Increment seen count
      setSeenCount((prev) => prev + 1);
    } catch {
      // On error, reset the stack to restore the card
      resetStack();
      addToast({ type: "error", title: "Fel", message: "Kunde inte spara." });
    }
  };

  const handleResetDemo = async () => {
    try {
      await resetDemo.mutateAsync(undefined);
      setSeenCount(0);
      resetStack();
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
          
          {shouldShowDemoDebug(isDemoMode) && (
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
    const errorMessage = jobReason === "forbidden" 
      ? "Du saknar behörighet att se detta jobb."
      : jobReason === "rls_blocked"
      ? "Jobbet kunde inte laddas på grund av säkerhetsinställningar."
      : "Det valda jobbet kunde inte hittas eller har tagits bort.";
    
    return (
      <AppShell role="employer">
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <EmptyState
            type="no-data"
            title={jobReason === "forbidden" ? "Ingen åtkomst" : "Jobb hittades inte"}
            message={errorMessage}
            action={{ label: "Gå till Mina jobb", onClick: () => navigate("/employer/jobs") }}
          />
          
          {shouldShowDemoDebug(isDemoMode) && (
            <Card className="mt-4 p-3 bg-muted/50 border-dashed">
              <p className="text-xs text-muted-foreground font-mono">
                <span className="font-semibold">Debug:</span><br />
                jobId={jobId}<br />
                reason={jobReason ?? "unknown"}<br />
                error={jobError?.message ?? "No job returned"}<br />
                orgId={orgId ?? "null"}
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
          
          {shouldShowDemoDebug(isDemoMode) && (
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
            {/* Show DEMO badge for demo cards */}
            {currentTalent.type === "demo_card" && (
              <div className="flex justify-center mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  DEMO
                </span>
              </div>
            )}
            
            <CandidateCard
              id={currentTalent.user_id ?? currentTalent.demo_card_id ?? "unknown"}
              name={currentTalent.full_name ?? "Anonym"}
              role={currentTalent.role_key ?? LABELS.candidate}
              legacyScore={currentTalent.legacy_score_cached ?? 50}
              badges={currentTalent.badges.map((b) => ({
                label: b.label ?? b.badge_key,
                variant: b.verified ? "verified" : "primary",
              }))}
              availability={currentTalent.availability_snippet}
              hasVideoPitch={currentTalent.has_video}
              matchScore={currentTalent.match_score}
              matchReasons={currentTalent.match_reasons}
              onSwipeYes={() => handleSwipe("yes")}
              onSwipeNo={() => handleSwipe("no")}
              disabled={swipeMutation.isPending}
            />
            
            {/* Show location for demo cards */}
            {currentTalent.type === "demo_card" && currentTalent.location && (
              <p className="text-center text-xs text-muted-foreground mt-2">
                📍 {currentTalent.location}
              </p>
            )}
            
            <p className="text-center text-sm text-muted-foreground mt-4">
              {seenCount > 0 ? `${seenCount} granskade, ` : ""}{remainingCount} kvar
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
            
            {/* Debug panel for demo mode - only with VITE_DEMO_DEBUG=true */}
            {shouldShowDemoDebug(isDemoMode) && (
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
                  <p><span className="text-muted-foreground">seenCount:</span> {seenCount}</p>
                  <hr className="border-border my-2" />
                  <p><span className="text-muted-foreground">realCount:</span> {talentDebug.realCount}</p>
                  <p><span className="text-muted-foreground">demoCardCount:</span> {talentDebug.demoCardCount}</p>
                  <p className="text-xs opacity-70">tables: {talentDebug.tables?.demoCards}, {talentDebug.tables?.demoSwipes}</p>
                  <hr className="border-border my-2" />
                  <p><span className="text-muted-foreground">stackLocked:</span> {stackDebug?.locked ? "true" : "false"}</p>
                  <p><span className="text-muted-foreground">stackSize:</span> {stackDebug?.size ?? 0}</p>
                  <p><span className="text-muted-foreground">removedCount:</span> {stackDebug?.removedCount ?? 0}</p>
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
        
        {/* Inline debug panel when toggled - only with VITE_DEMO_DEBUG=true */}
        {shouldShowDemoDebug(isDemoMode) && showDebug && currentTalent && (
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
              <p><span className="text-muted-foreground">seen / remaining:</span> {seenCount} / {remainingCount}</p>
              <p><span className="text-muted-foreground">realCount:</span> {talentDebug.realCount}</p>
              <p><span className="text-muted-foreground">demoCardCount:</span> {talentDebug.demoCardCount}</p>
              <hr className="border-border my-2" />
              <p><span className="text-muted-foreground">stackLocked:</span> {stackDebug?.locked ? "true" : "false"}</p>
              <p><span className="text-muted-foreground">stackSize:</span> {stackDebug?.size ?? 0}</p>
              <p><span className="text-muted-foreground">removedCount:</span> {stackDebug?.removedCount ?? 0}</p>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

export default EmployerSwipeTalent;
