/**
 * Staff onboarding view (kandidat/personal).
 */
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { LABELS } from "@/config/labels";
import { useOnboardingForUser, useOnboardingProgress, useCompleteOnboarding } from "@/hooks/useOnboarding";
import { useMyOrgs, useDemoOrgId } from "@/hooks/useOrgs";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoMembership } from "@/hooks/useDemoMembership";
import { BookOpen, FileText, Video, Link as LinkIcon, ListChecks, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { OnboardingItem } from "@/lib/api/onboarding";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  document: <FileText className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  link: <LinkIcon className="h-4 w-4" />,
  checklist: <ListChecks className="h-4 w-4" />,
};

export default function TalentOnboarding() {
  const { isDemoMode } = useAuth();
  const { data: orgs, isLoading: orgsLoading } = useMyOrgs();
  const { data: demoOrgId, isLoading: demoOrgLoading } = useDemoOrgId();
  const orgId = orgs?.[0]?.id ?? (isDemoMode ? demoOrgId : undefined) ?? undefined;
  const demoReady = useDemoMembership(orgId, isDemoMode);
  const effectiveOrgId = demoReady ? orgId : undefined;
  const { data: items, isLoading } = useOnboardingForUser(effectiveOrgId);
  const { data: progress } = useOnboardingProgress(effectiveOrgId);
  const completeMutation = useCompleteOnboarding(effectiveOrgId);

  const stillInitializing = isDemoMode && (orgsLoading || demoOrgLoading || !demoReady);

  const progressMap = new Map(
    (progress ?? []).map((p) => [p.item_id, p.status])
  );

  const isCompleted = (itemId: string) => progressMap.get(itemId) === "completed";

  const handleComplete = async (itemId: string) => {
    try {
      await completeMutation.mutateAsync(itemId);
      toast.success(LABELS.onboardingCompleted);
    } catch {
      toast.error("Kunde inte uppdatera status");
    }
  };

  if (!orgId && !stillInitializing) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{LABELS.onboardingStaffTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">{LABELS.onboardingStaffSubtitle}</p>
        </div>
        <Card className="p-8 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{LABELS.onboardingNoOrgTalent}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{LABELS.onboardingStaffTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">{LABELS.onboardingStaffSubtitle}</p>
      </div>

      {isLoading || stillInitializing ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : !items?.length ? (
        <Card className="p-8 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{LABELS.onboardingStaffEmpty}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item: OnboardingItem) => {
            const done = isCompleted(item.id);
            return (
              <Card key={item.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {TYPE_ICONS[item.content_type] ?? <FileText className="h-4 w-4" />}
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <Badge variant={done ? "verified" : "outline"} size="sm">
                        {done ? LABELS.onboardingCompleted : LABELS.onboardingNotStarted}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      {item.content_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => window.open(item.content_url!, "_blank")}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {LABELS.onboardingOpenContent}
                        </Button>
                      )}
                      {!done && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleComplete(item.id)}
                          disabled={completeMutation.isPending}
                        >
                          {LABELS.onboardingMarkComplete}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
