import * as React from "react";
import { LABELS } from "@/config/labels";
import { AppShell } from "@/app/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/delight/EmptyStates";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Send, Search, Info } from "lucide-react";
import { useDefaultOrgId } from "@/hooks/useOrgs";
import { useCandidatePool, useSendOutreach, useOrgOutreach } from "@/hooks/useEmployerViews";
import { useToasts } from "@/components/delight/Toasts";

/**
 * Candidate Pool view – shows only candidates who opted into visibility.
 * "Skicka förfrågan" creates an outreach record, NOT an application.
 */
export function EmployerCandidatePool() {
  const { data: orgId } = useDefaultOrgId();
  const { addToast } = useToasts();
  const [locationFilter, setLocationFilter] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");

  const filters = React.useMemo(() => ({
    location: locationFilter || undefined,
    role: roleFilter || undefined,
  }), [locationFilter, roleFilter]);

  const { data: candidates, isLoading } = useCandidatePool(filters);
  const { data: sentOutreach } = useOrgOutreach(orgId ?? undefined);
  const sendOutreachMutation = useSendOutreach();

  // Outreach modal state
  const [outreachTarget, setOutreachTarget] = React.useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [outreachMessage, setOutreachMessage] = React.useState("");
  const [outreachRole, setOutreachRole] = React.useState("");

  const alreadySent = React.useCallback((talentUserId: string) => {
    return sentOutreach?.some((o) => o.talent_user_id === talentUserId && o.status === "pending");
  }, [sentOutreach]);

  const handleSendOutreach = async () => {
    if (!orgId || !outreachTarget) return;

    try {
      await sendOutreachMutation.mutateAsync({
        orgId,
        talentUserId: outreachTarget.userId,
        message: outreachMessage || undefined,
        roleTitle: outreachRole || undefined,
      });
      addToast({
        type: "success",
        title: "Förfrågan skickad",
        message: `Förfrågan skickad till ${outreachTarget.name}. Den visas i kandidatens inkorg.`,
      });
      setOutreachTarget(null);
      setOutreachMessage("");
      setOutreachRole("");
    } catch {
      addToast({ type: "error", title: "Fel", message: "Kunde inte skicka förfrågan." });
    }
  };

  return (
    <AppShell role="employer">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">{LABELS.employerTabPool}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {LABELS.employerPoolExplainer}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrera på plats..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrera på roll..."
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        ) : candidates && candidates.length > 0 ? (
          <div className="space-y-3">
            {candidates.map((c) => {
              const sent = alreadySent(c.user_id);
              return (
                <Card key={c.user_id} variant="interactive" padding="md">
                  <div className="flex items-start gap-4">
                    <Avatar size="md" fallback={(c.full_name ?? "K").slice(0, 2)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">
                          {c.full_name ?? LABELS.candidate}
                        </h3>
                        {c.scope === "circle_only" && (
                          <Badge variant="default" size="sm">Cirkel</Badge>
                        )}
                        {c.available_for_extra_hours && (
                          <Badge variant="verified" size="sm">Extrapass</Badge>
                        )}
                        {c.is_demo && (
                          <Badge variant="warn" size="sm">DEMO</Badge>
                        )}
                      </div>
                      {c.home_base && (
                        <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {c.home_base}
                        </p>
                      )}
                      {c.desired_roles.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {c.desired_roles.slice(0, 3).map((r) => (
                            <Badge key={r} variant="default" size="sm">{r}</Badge>
                          ))}
                        </div>
                      )}
                      {c.bio && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.bio}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        variant={sent ? "ghost" : "secondary"}
                        size="sm"
                        className="gap-1"
                        disabled={!!sent || sendOutreachMutation.isPending}
                        onClick={() => setOutreachTarget({
                          userId: c.user_id,
                          name: c.full_name ?? LABELS.candidate,
                        })}
                      >
                        <Send className="h-3.5 w-3.5" />
                        {sent ? "Skickad" : "Förfrågan"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            type="no-data"
            title={LABELS.employerNoPool}
            message={LABELS.employerNoPoolHint}
          />
        )}
      </div>

      {/* Outreach Modal */}
      <Modal open={!!outreachTarget} onOpenChange={(open) => !open && setOutreachTarget(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{LABELS.requestDialogTitle}</ModalTitle>
            <ModalDescription>
              Skicka en förfrågan till {outreachTarget?.name}
            </ModalDescription>
          </ModalHeader>

          {/* Explicit disclaimer */}
          <div className="flex items-start gap-2 rounded-lg bg-secondary p-3 mx-6 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
            <span>
              Detta är <strong>inte en ansökan</strong>. Förfrågan visas i kandidatens inkorg under "Förfrågningar" och kandidaten kan välja att svara.
            </span>
          </div>

          <div className="space-y-4 p-6 pt-4">
            <Input
              placeholder="Rolltitel (valfritt)"
              value={outreachRole}
              onChange={(e) => setOutreachRole(e.target.value)}
            />
            <Textarea
              placeholder="Meddelande till kandidaten..."
              value={outreachMessage}
              onChange={(e) => setOutreachMessage(e.target.value)}
              rows={3}
            />
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setOutreachTarget(null)}>
              Avbryt
            </Button>
            <Button
              variant="primary"
              onClick={handleSendOutreach}
              disabled={sendOutreachMutation.isPending}
              className="gap-1"
            >
              <Send className="h-4 w-4" />
              Skicka förfrågan
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AppShell>
  );
}

export default EmployerCandidatePool;
