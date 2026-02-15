import * as React from "react";
import { AppShell } from "@/app/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/delight/EmptyStates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDefaultOrgId, useCreateOrg, useMyOrgs } from "@/hooks/useOrgs";
import { useDemoSession } from "@/contexts/DemoSessionContext";
import { useOrgBorrowRequests, useCreateBorrowRequest, useCloseBorrowRequest } from "@/hooks/useBorrow";
import {
  useAllCirclePartnersFlat,
  useCircleRequests,
  useCreateCircleRequest,
  useAcceptCircleRequest,
  useDeclineCircleRequest,
  useAvailableTalentCounts,
  useMyCircles,
  useCircleMembers,
} from "@/hooks/useCircles";
import { useToasts } from "@/components/delight/Toasts";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/Modal";
import { CircleManagementModal } from "@/components/circles/CircleManagementModal";
import {
  Plus,
  Users,
  Clock,
  MapPin,
  X,
  CheckCircle,
  Building2,
  Globe,
  Handshake,
  Send,
  Check,
  XCircle,
  Settings,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils/classnames";
import type { BorrowRequestWithOffers } from "@/lib/api/borrow";
import type { BorrowScope, Circle } from "@/lib/api/circles";
import { useDemoCoachToast } from "@/hooks/useDemoCoachToast";

const roleOptions = [
  { value: "bartender", label: "Bartender" },
  { value: "servitor", label: "Servitör" },
  { value: "kock", label: "Kock" },
  { value: "diskare", label: "Diskare" },
  { value: "event", label: "Eventpersonal" },
];

const scopeLabels: Record<BorrowScope, { label: string; icon: React.ReactNode; description: string }> = {
  internal: {
    label: "Intern pool",
    icon: <Building2 className="h-4 w-4" />,
    description: "Talanger du redan matchat med",
  },
  circle: {
    label: "Trusted Circle",
    icon: <Handshake className="h-4 w-4" />,
    description: "Partnerföretags tillgängliga talanger",
  },
  local: {
    label: "Lokalt ekosystem",
    icon: <Globe className="h-4 w-4" />,
    description: "Alla publika talanger i orten",
  },
};

export function EmployerBorrow() {
  useDemoCoachToast("borrow");
  const { addToast } = useToasts();
  const { demoSessionId } = useDemoSession();
  const { data: orgId, isLoading: orgLoading } = useDefaultOrgId();
  const { data: orgs } = useMyOrgs();
  const { data: requests, isLoading: requestsLoading } = useOrgBorrowRequests(orgId);
  // allCirclePartnersFlat kept only for CircleManagementModal's available-partner filter
  const { data: allCirclePartners } = useAllCirclePartnersFlat(orgId);
  const { data: circleRequests } = useCircleRequests(orgId);
  const { data: myCircles } = useMyCircles(orgId);
  const createMutation = useCreateBorrowRequest();
  const closeMutation = useCloseBorrowRequest();
  const createCircleMutation = useCreateCircleRequest();
  const acceptCircleMutation = useAcceptCircleRequest();
  const declineCircleMutation = useDeclineCircleRequest();

  // Talent counts for layer tabs
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const currentOrg = orgs?.find((o) => o.id === orgId);
  const defaultLocation = currentOrg?.location ?? "Visby";

  // Selected circle state
  const [selectedCircleId, setSelectedCircleId] = React.useState<string | null>(null);
  const [showCircleManagement, setShowCircleManagement] = React.useState(false);

  // Auto-select first circle when circles load
  React.useEffect(() => {
    if (myCircles && myCircles.length > 0 && !selectedCircleId) {
      setSelectedCircleId(myCircles[0].id);
    }
  }, [myCircles, selectedCircleId]);

  const selectedCircle = React.useMemo(() => {
    if (!myCircles || !selectedCircleId) return null;
    return myCircles.find((c) => c.id === selectedCircleId) ?? null;
  }, [myCircles, selectedCircleId]);

  // Fetch members for selected circle (for modal display)
  const { data: selectedCircleMembers } = useCircleMembers(selectedCircleId ?? undefined);

  const { data: talentCounts } = useAvailableTalentCounts(
    defaultLocation,
    today.toISOString(),
    tomorrow.toISOString(),
    orgId ?? undefined,
    !!orgId,
    selectedCircleId ?? undefined
  );

  const [activeTab, setActiveTab] = React.useState<"requests" | "circles">("requests");
  const [selectedScope, setSelectedScope] = React.useState<BorrowScope>("internal");
  const [showCreate, setShowCreate] = React.useState(false);
  const [showCreateOrg, setShowCreateOrg] = React.useState(false);
  const [showInvite, setShowInvite] = React.useState(false);
  const [inviteOrgId, setInviteOrgId] = React.useState("");
  const [orgName, setOrgName] = React.useState("");
  const [orgLocation, setOrgLocation] = React.useState("");
  const createOrgMutation = useCreateOrg();

  // Form state
  const [location, setLocation] = React.useState(defaultLocation);
  const [roleKey, setRoleKey] = React.useState("bartender");
  const [startDate, setStartDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("18:00");
  const [endDate, setEndDate] = React.useState("");
  const [endTime, setEndTime] = React.useState("02:00");
  const [message, setMessage] = React.useState("");

  // Update location when org changes
  React.useEffect(() => {
    if (currentOrg?.location) {
      setLocation(currentOrg.location);
    }
  }, [currentOrg?.location]);

  const resetForm = () => {
    setLocation(currentOrg?.location ?? "");
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
      await createOrgMutation.mutateAsync({ name: orgName, location: orgLocation || undefined, demoSessionId });
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

    // Validate circle selection when scope is circle
    if (selectedScope === "circle" && !selectedCircleId) {
      addToast({ type: "error", title: "Fel", message: "Välj en cirkel först." });
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
          scope: selectedScope,
          circle_id: selectedScope === "circle" ? selectedCircleId : null,
        },
      });

      setShowCreate(false);
      resetForm();
      addToast({
        type: "success",
        title: "Förfrågan skapad!",
        message: offerCount > 0 ? `${offerCount} talanger notifierade.` : "Inga tillgängliga talanger hittades.",
      });
    } catch {
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

  const handleSendInvite = async () => {
    if (!orgId || !inviteOrgId.trim()) return;
    try {
      await createCircleMutation.mutateAsync({ fromOrgId: orgId, toOrgId: inviteOrgId.trim() });
      setShowInvite(false);
      setInviteOrgId("");
      addToast({ type: "success", title: "Inbjudan skickad", message: "Väntar på svar." });
    } catch (e) {
      addToast({ type: "error", title: "Fel", message: "Kunde inte skicka inbjudan." });
    }
  };

  const handleAcceptInvite = async (requestId: string) => {
    try {
      await acceptCircleMutation.mutateAsync(requestId);
      addToast({ type: "success", title: "Accepterad", message: "Ni är nu i varandras cirkel!" });
    } catch {
      addToast({ type: "error", title: "Fel", message: "Kunde inte acceptera." });
    }
  };

  const handleDeclineInvite = async (requestId: string) => {
    try {
      await declineCircleMutation.mutateAsync(requestId);
      addToast({ type: "info", title: "Avböjd", message: "Inbjudan avböjd." });
    } catch {
      addToast({ type: "error", title: "Fel", message: "Kunde inte avböja." });
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
              Hitta tillgängliga talanger – intern, via partner eller lokalt
            </p>
          </div>
          <Button variant="primary" size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Ny förfrågan
          </Button>
        </div>

        {/* Layer Tabs Overview */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(["internal", "circle", "local"] as BorrowScope[]).map((scope) => {
            const info = scopeLabels[scope];
            const count = talentCounts?.[scope] ?? 0;
            const isActive = selectedScope === scope;
            return (
              <Card
                key={scope}
                variant={isActive ? "default" : "ghost"}
                padding="sm"
                className={cn(
                  "cursor-pointer transition-all",
                  isActive && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedScope(scope)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-muted-foreground", isActive && "text-primary")}>
                    {info.icon}
                  </span>
                  <span className="font-medium text-sm">{info.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-foreground">{count}</span>
                  <span className="text-xs text-muted-foreground">tillgängliga</span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "requests" | "circles")}>
          <TabsList className="mb-4">
            <TabsTrigger value="requests">Förfrågningar</TabsTrigger>
            <TabsTrigger value="circles">
              Trusted Circle
              {circleRequests?.incoming.filter((r) => r.status === "pending").length ? (
                <Badge variant="primary" size="sm" className="ml-2">
                  {circleRequests.incoming.filter((r) => r.status === "pending").length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          {/* Requests Tab */}
          <TabsContent value="requests">
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
          </TabsContent>

          {/* Circles Tab */}
          <TabsContent value="circles">
            <div className="space-y-6">
              {/* Circle selector + members (same source as modal) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">Dina cirkelpartners</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCircleManagement(true)}
                      className="h-7 text-xs"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Hantera
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowInvite(true)}>
                      <Send className="h-4 w-4 mr-1" />
                      Bjud in
                    </Button>
                  </div>
                </div>

                {/* Circle selector */}
                {myCircles && myCircles.length > 0 ? (
                  <>
                    <Select
                      value={selectedCircleId ?? ""}
                      onValueChange={(value) => setSelectedCircleId(value)}
                    >
                      <SelectTrigger className="bg-background mb-3">
                        <SelectValue placeholder="Välj cirkel..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {myCircles.map((circle) => (
                          <SelectItem key={circle.id} value={circle.id}>
                            {circle.name} ({circle.memberCount} {circle.memberCount === 1 ? "medlem" : "medlemmar"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedCircleMembers && selectedCircleMembers.length > 0 ? (
                      <div className="grid gap-2">
                        {selectedCircleMembers.map((member) => (
                          <Card key={member.id} variant="ghost" padding="sm">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Handshake className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <span className="font-medium text-foreground">{member.name}</span>
                                {member.location && (
                                  <p className="text-xs text-muted-foreground">{member.location}</p>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card variant="ghost" padding="md" className="text-center">
                        <p className="text-sm text-muted-foreground">
                          Inga medlemmar i denna cirkel ännu. Använd "Hantera" för att lägga till.
                        </p>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card variant="ghost" padding="md" className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Inga cirklar ännu. Skapa en cirkel och lägg till partners.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCircleManagement(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Skapa cirkel
                    </Button>
                  </Card>
                )}
              </div>

              {/* Incoming Requests */}
              {circleRequests?.incoming.filter((r) => r.status === "pending").length ? (
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Inkommande inbjudningar</h3>
                  <div className="grid gap-2">
                    {circleRequests.incoming
                      .filter((r) => r.status === "pending")
                      .map((req) => (
                        <Card key={req.id} variant="default" padding="sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-accent/10">
                                <Building2 className="h-4 w-4 text-accent-foreground" />
                              </div>
                              <div>
                                <span className="font-medium text-foreground">{req.from_org_name}</span>
                                <p className="text-xs text-muted-foreground">Vill gå med i din cirkel</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeclineInvite(req.id)}
                                disabled={declineCircleMutation.isPending}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleAcceptInvite(req.id)}
                                disabled={acceptCircleMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                </div>
              ) : null}

              {/* Outgoing Requests */}
              {circleRequests?.outgoing.filter((r) => r.status === "pending").length ? (
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Skickade inbjudningar</h3>
                  <div className="grid gap-2">
                    {circleRequests.outgoing
                      .filter((r) => r.status === "pending")
                      .map((req) => (
                        <Card key={req.id} variant="ghost" padding="sm">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <span className="font-medium text-foreground">{req.to_org_name}</span>
                              <p className="text-xs text-muted-foreground">Väntar på svar</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
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
            {/* Scope Selection */}
            <div className="space-y-2">
              <Label>Sök i</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["internal", "circle", "local"] as BorrowScope[]).map((scope) => {
                  const info = scopeLabels[scope];
                  const isActive = selectedScope === scope;
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setSelectedScope(scope)}
                      className={cn(
                        "p-2 rounded-lg border text-center transition-all",
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <div className="flex justify-center mb-1">{info.icon}</div>
                      <span className="text-xs font-medium">{info.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{scopeLabels[selectedScope].description}</p>
            </div>

            {/* Circle Selection - only visible when scope is circle */}
            {selectedScope === "circle" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Välj Trusted Circle</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCircleManagement(true)}
                    className="h-7 text-xs"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Hantera
                  </Button>
                </div>
                {myCircles && myCircles.length > 0 ? (
                  <>
                    <Select
                      value={selectedCircleId ?? ""}
                      onValueChange={(value) => setSelectedCircleId(value)}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Välj cirkel..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {myCircles.map((circle) => (
                          <SelectItem key={circle.id} value={circle.id}>
                            {circle.name} ({circle.memberCount} {circle.memberCount === 1 ? "medlem" : "medlemmar"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Endast medlemmar i den här cirkeln får förfrågan.
                    </p>
                    {/* Show members of selected circle */}
                    {selectedCircleMembers && selectedCircleMembers.length > 0 && (
                      <div className="mt-2 p-2 rounded-lg bg-muted/50">
                        <p className="text-xs font-medium text-foreground mb-1">
                          Medlemmar ({selectedCircleMembers.length}):
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedCircleMembers.slice(0, 5).map((member) => (
                            <Badge key={member.id} variant="default" size="sm" title={member.location ?? undefined}>
                              {member.name}{member.location ? ` (${member.location})` : ""}
                            </Badge>
                          ))}
                          {selectedCircleMembers.length > 5 && (
                            <Badge variant="default" size="sm">
                              +{selectedCircleMembers.length - 5}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Card variant="ghost" padding="sm" className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Du har inga cirklar ännu.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCircleManagement(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Skapa cirkel
                    </Button>
                  </Card>
                )}
              </div>
            )}

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

      {/* Invite Modal */}
      <Modal open={showInvite} onOpenChange={setShowInvite}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>Bjud in till cirkel</ModalTitle>
            <ModalDescription>
              Ange organisations-ID för att skicka en inbjudan.
            </ModalDescription>
          </ModalHeader>
          <div className="py-4">
            <Input
              placeholder="Organisation ID (UUID)"
              value={inviteOrgId}
              onChange={(e) => setInviteOrgId(e.target.value)}
            />
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowInvite(false)}>Avbryt</Button>
            <Button
              variant="primary"
              onClick={handleSendInvite}
              disabled={createCircleMutation.isPending || !inviteOrgId.trim()}
            >
              {createCircleMutation.isPending ? "Skickar..." : "Skicka inbjudan"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Circle Management Modal */}
      <CircleManagementModal
        open={showCircleManagement}
        onOpenChange={setShowCircleManagement}
        orgId={orgId ?? ""}
        circle={selectedCircle}
        onCircleCreated={(circleId) => {
          setSelectedCircleId(circleId);
          setShowCircleManagement(false);
        }}
      />
    </AppShell>
  );
}

export default EmployerBorrow;
