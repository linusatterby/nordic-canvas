/**
 * Employer onboarding management page.
 */
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { LABELS } from "@/config/labels";
import { useOnboardingItems, useCreateOnboardingItem } from "@/hooks/useOnboarding";
import { useGroups } from "@/hooks/useInternalComms";
import { useMyOrgs, useDemoOrgId } from "@/hooks/useOrgs";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoMembership } from "@/hooks/useDemoMembership";
import { CreateOnboardingDialog } from "@/components/onboarding/CreateOnboardingDialog";
import { BookOpen, Plus, Users, FileText, Video, Link as LinkIcon, ListChecks } from "lucide-react";
import { toast } from "sonner";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  document: <FileText className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  link: <LinkIcon className="h-4 w-4" />,
  checklist: <ListChecks className="h-4 w-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  document: LABELS.onboardingTypeDocument,
  video: LABELS.onboardingTypeVideo,
  link: LABELS.onboardingTypeLink,
  checklist: LABELS.onboardingTypeChecklist,
};

export default function EmployerOnboarding() {
  const { isDemoMode } = useAuth();
  const { data: orgs, isLoading: orgsLoading } = useMyOrgs();
  const { data: demoOrgId, isLoading: demoOrgLoading } = useDemoOrgId();
  const orgId = orgs?.[0]?.id ?? (isDemoMode ? demoOrgId : undefined) ?? undefined;
  const demoReady = useDemoMembership(orgId, isDemoMode);
  const effectiveOrgId = demoReady ? orgId : undefined;
  const { data: items, isLoading } = useOnboardingItems(effectiveOrgId);
  const { data: groups } = useGroups(effectiveOrgId);
  const createMutation = useCreateOnboardingItem(effectiveOrgId);

  const [showCreate, setShowCreate] = useState(false);

  const stillInitializing = isDemoMode && (orgsLoading || demoOrgLoading || !demoReady);

  if (!orgId && !stillInitializing) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{LABELS.onboardingTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">{LABELS.onboardingSubtitle}</p>
        </div>
        <Card className="p-8 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{LABELS.onboardingNoOrg}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{LABELS.onboardingTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">{LABELS.onboardingSubtitle}</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {LABELS.onboardingNewItem}
        </Button>
      </div>

      {isLoading || stillInitializing ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !items?.length ? (
        <Card className="p-8 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{LABELS.onboardingEmpty}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{LABELS.onboardingEmptyHint}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {TYPE_ICONS[item.content_type] ?? <FileText className="h-4 w-4" />}
                    <h3 className="font-semibold text-foreground truncate">{item.title}</h3>
                    <Badge variant="outline" size="sm">
                      {TYPE_LABELS[item.content_type] ?? item.content_type}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 ml-6">{item.description}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Users className="h-3 w-3" />
                    {item.target === "all"
                      ? LABELS.onboardingTargetAll
                      : item.group_names?.join(", ") ?? LABELS.onboardingTargetGroups}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(item.created_at).toLocaleDateString("sv-SE")}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateOnboardingDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        groups={groups ?? []}
        orgId={orgId ?? ""}
        onSubmit={async (payload) => {
          await createMutation.mutateAsync(payload);
          setShowCreate(false);
          toast.success("Innehåll skapat");
        }}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
