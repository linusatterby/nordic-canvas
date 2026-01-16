import * as React from "react";
import { AppShell } from "@/app/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/delight/EmptyStates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDefaultOrgId, useCreateOrg } from "@/hooks/useOrgs";
import { useOrgBorrowRequests, useCreateBorrowRequest, useCloseBorrowRequest } from "@/hooks/useBorrow";
import { useToasts } from "@/components/delight/Toasts";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/Modal";
import { Plus, Users, Clock, MapPin, X, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils/classnames";
import type { BorrowRequestWithOffers } from "@/lib/api/borrow";

const roleOptions = [
  { value: "bartender", label: "Bartender" },
  { value: "servitor", label: "Servitör" },
  { value: "kock", label: "Kock" },
  { value: "diskare", label: "Diskare" },
  { value: "event", label: "Eventpersonal" },
];

export function EmployerBorrow() {
  const { addToast } = useToasts();
  const { data: orgId, isLoading: orgLoading } = useDefaultOrgId();
  const { data: requests, isLoading: requestsLoading } = useOrgBorrowRequests(orgId);
  const createMutation = useCreateBorrowRequest();
  const closeMutation = useCloseBorrowRequest();

  const [showCreate, setShowCreate] = React.useState(false);
  const [showCreateOrg, setShowCreateOrg] = React.useState(false);
  const [orgName, setOrgName] = React.useState("");
  const [orgLocation, setOrgLocation] = React.useState("");
  const createOrgMutation = useCreateOrg();

  // Form state
  const [location, setLocation] = React.useState("");
  const [roleKey, setRoleKey] = React.useState("bartender");
  const [startDate, setStartDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("18:00");
  const [endDate, setEndDate] = React.useState("");
  const [endTime, setEndTime] = React.useState("02:00");
  const [message, setMessage] = React.useState("");

  const resetForm = () => {
    setLocation("");
    setRoleKey("bartender");
    setStartDate("");
    setStartTime("18:00");
    setEndDate("");
    setEndTime("02:00");
    setMessage("");
  };

  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    try {
      await createOrgMutation.mutateAsync({ name: orgName, location: orgLocation || undefined });
      setShowCreateOrg(false);
      addToast({ type: "success", title: "Klart!", message: "Organisation skapad." });
    } catch {
      addToast({ type: "error", title: "Fel", message: "Kunde inte skapa organisation." });
    }
  };

  const handleCreateRequest = async () => {
    if (!orgId || !location.trim() || !startDate || !endDate) {
      addToast({ type: "error", title: "Fel", message: "Fyll i alla obligatoriska fält." });
      return;
    }

    const startTs = new Date(`${startDate}T${startTime}`).toISOString();
    const endTs = new Date(`${endDate}T${endTime}`).toISOString();

    try {
      const { offerCount } = await createMutation.mutateAsync({
        orgId,
        payload: {
          location,
          role_key: roleKey,
          start_ts: startTs,
          end_ts: endTs,
          message: message.trim() || undefined,
        },
      });

      setShowCreate(false);
      resetForm();
      addToast({
        type: "success",
        title: "Förfrågan skapad!",
        message: offerCount > 0 ? `${offerCount} talanger notifierade.` : "Inga tillgängliga talanger hittades.",
      });
    } catch (e) {
      addToast({ type: "error", title: "Fel", message: "Kunde inte skapa förfrågan." });
    }
  };

  const handleCloseRequest = async (requestId: string) => {
    if (!orgId) return;
    try {
      await closeMutation.mutateAsync({ requestId, orgId });
      addToast({ type: "success", title: "Stängd", message: "Förfrågan stängd." });
    } catch {
      addToast({ type: "error", title: "Fel", message: "Kunde inte stänga förfrågan." });
    }
  };

  const getStatusBadge = (request: BorrowRequestWithOffers) => {
    if (request.status === "filled") {
      return <Badge variant="verified" size="sm">Tillsatt</Badge>;
    }
    if (request.status === "closed") {
      return <Badge variant="busy" size="sm">Stängd</Badge>;
    }
    const pendingCount = request.offers.filter((o) => o.status === "pending").length;
    if (pendingCount > 0) {
      return <Badge variant="primary" size="sm">{pendingCount} väntar</Badge>;
    }
    return <Badge variant="busy" size="sm">Inga svar</Badge>;
  };

  // Loading state
  if (orgLoading) {
    return (
      <AppShell role="employer">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  // No org state
  if (!orgId) {
    return (
      <AppShell role="employer">
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <EmptyState
            type="no-data"
            title="Ingen organisation"
            message="Skapa en organisation för att börja låna personal."
            action={{ label: "Skapa organisation", onClick: () => setShowCreateOrg(true) }}
          />
          <Modal open={showCreateOrg} onOpenChange={setShowCreateOrg}>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Skapa organisation</ModalTitle>
                <ModalDescription>Fyll i uppgifter om din organisation.</ModalDescription>
              </ModalHeader>
              <div className="space-y-4 py-4">
                <Input placeholder="Organisationsnamn" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                <Input placeholder="Plats (valfritt)" value={orgLocation} onChange={(e) => setOrgLocation(e.target.value)} />
              </div>
              <ModalFooter>
                <Button variant="secondary" onClick={() => setShowCreateOrg(false)}>Avbryt</Button>
                <Button variant="primary" onClick={handleCreateOrg} disabled={createOrgMutation.isPending}>Skapa</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="employer">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Låna personal</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Hitta tillgängliga talanger för snabba pass
            </p>
          </div>
          <Button variant="primary" size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Ny förfrågan
          </Button>
        </div>

        {/* Requests list */}
        {requestsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : !requests || requests.length === 0 ? (
          <Card variant="default" padding="lg" className="text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Inga förfrågningar</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Skapa en förfrågan för att hitta tillgänglig personal snabbt.
            </p>
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              Skapa förfrågan
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <Card key={req.id} variant="default" padding="md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-foreground">
                        {roleOptions.find((r) => r.value === req.role_key)?.label ?? req.role_key}
                      </span>
                      {getStatusBadge(req)}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {req.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(req.start_ts), "d MMM HH:mm", { locale: sv })} –{" "}
                        {format(new Date(req.end_ts), "d MMM HH:mm", { locale: sv })}
                      </span>
                    </div>

                    {req.message && (
                      <p className="text-sm text-muted-foreground mt-2 italic">"{req.message}"</p>
                    )}

                    {req.status === "filled" && req.accepted_talent_name && (
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-foreground font-medium">
                          {req.accepted_talent_name} accepterade
                        </span>
                      </div>
                    )}

                    {req.status === "open" && req.offers.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-1">Skickat till:</p>
                      <div className="flex flex-wrap gap-1">
                          {req.offers.slice(0, 5).map((o) => (
                            <Badge key={o.id} variant="default" size="sm">
                              {o.talent_name ?? "Talang"}
                            </Badge>
                          ))}
                          {req.offers.length > 5 && (
                            <Badge variant="default" size="sm">+{req.offers.length - 5}</Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {req.status === "open" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCloseRequest(req.id)}
                      disabled={closeMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      <Modal open={showCreate} onOpenChange={setShowCreate}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Ny förfrågan</ModalTitle>
            <ModalDescription>
              Beskriv vad du behöver så hittar vi tillgängliga talanger.
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ort *</Label>
              <Input
                placeholder="t.ex. Stockholm"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Roll *</Label>
              <select
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2",
                  "text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                )}
                value={roleKey}
                onChange={(e) => setRoleKey(e.target.value)}
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Startdatum *</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Starttid</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Slutdatum *</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Sluttid</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Meddelande (valfritt)</Label>
              <Textarea
                placeholder="Beskriv jobbet kort..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Avbryt
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateRequest}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Skapar..." : "Skapa förfrågan"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AppShell>
  );
}

export default EmployerBorrow;
