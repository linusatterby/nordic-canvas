import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/delight/EmptyStates";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/Modal";
import { EmployerListingsFilters, DEFAULT_EMPLOYER_FILTERS, type EmployerListingFilterValues } from "@/components/filters/EmployerListingsFilters";
import { Plus, Briefcase, Users, MapPin, Calendar, Clock, FileEdit, Eye, XCircle, RotateCcw } from "lucide-react";
import { useDefaultOrgId, useCreateOrg } from "@/hooks/useOrgs";
import { useOrgJobs } from "@/hooks/useJobsFeed";
import { useUpdateListingStatus } from "@/hooks/useListings";
import { createJob, createListing, type ListingStatus, type ListingType } from "@/lib/api/jobs";
import { useToasts } from "@/components/delight/Toasts";
import { useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const STATUS_TABS: { value: ListingStatus | "all"; label: string }[] = [
  { value: "all", label: "Alla" },
  { value: "draft", label: "Utkast" },
  { value: "published", label: "Publicerade" },
  { value: "matching", label: "Matchar" },
  { value: "closed", label: "Avslutade" },
];

const STATUS_BADGE_VARIANTS: Record<string, "default" | "primary" | "verified" | "warn"> = {
  draft: "default",
  published: "verified",
  matching: "primary",
  closed: "default",
};

export function EmployerJobs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToasts();
  const { data: orgId, isLoading: orgLoading } = useDefaultOrgId();
  
  // Status filter for tabs
  const [statusFilter, setStatusFilter] = React.useState<ListingStatus | "all">("all");
  const [uiFilters, setUiFilters] = React.useState<EmployerListingFilterValues>(DEFAULT_EMPLOYER_FILTERS);
  
  const { data: jobs, isLoading: jobsLoading } = useOrgJobs(
    orgId ?? undefined, 
    statusFilter === "all" ? undefined : statusFilter
  );
  const createOrgMutation = useCreateOrg();
  const updateStatusMutation = useUpdateListingStatus();

  const [showCreateOrg, setShowCreateOrg] = React.useState(false);
  const [orgName, setOrgName] = React.useState("");
  const [orgLocation, setOrgLocation] = React.useState("");

  const [showCreateJob, setShowCreateJob] = React.useState(false);
  const [isShiftCover, setIsShiftCover] = React.useState(false);
  const [jobTitle, setJobTitle] = React.useState("");
  const [jobRole, setJobRole] = React.useState("");
  const [jobLocation, setJobLocation] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [shiftStart, setShiftStart] = React.useState("");
  const [shiftEnd, setShiftEnd] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

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

  const handleCreateJob = async () => {
    if (!orgId || !jobTitle || !jobRole || !startDate || !endDate) return;
    
    // Validate shift fields if shift_cover
    if (isShiftCover && (!shiftStart || !shiftEnd)) {
      addToast({ type: "error", title: "Fel", message: "Ange start- och sluttid för passet." });
      return;
    }

    setIsCreating(true);
    try {
      await createListing({
        orgId,
        listingType: isShiftCover ? "shift_cover" : "job",
        title: jobTitle,
        roleKey: jobRole,
        location: jobLocation,
        startDate,
        endDate,
        shiftStart: isShiftCover ? shiftStart : undefined,
        shiftEnd: isShiftCover ? shiftEnd : undefined,
        shiftRequired: isShiftCover,
      });
      queryClient.invalidateQueries({ queryKey: ["jobs", "org", orgId] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      setShowCreateJob(false);
      resetCreateForm();
      addToast({ type: "success", title: "Klart!", message: isShiftCover ? "Pass skapat och publicerat." : "Jobb skapat och publicerat." });
    } catch {
      addToast({ type: "error", title: "Fel", message: "Kunde inte skapa." });
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setJobTitle("");
    setJobRole("");
    setJobLocation("");
    setStartDate("");
    setEndDate("");
    setShiftStart("");
    setShiftEnd("");
    setIsShiftCover(false);
  };

  const handleStatusAction = async (listingId: string, currentStatus: string) => {
    let newStatus: ListingStatus;
    
    switch (currentStatus) {
      case "draft":
        newStatus = "published";
        break;
      case "published":
      case "matching":
        newStatus = "closed";
        break;
      case "closed":
        newStatus = "published";
        break;
      default:
        return;
    }

    try {
      await updateStatusMutation.mutateAsync({ listingId, status: newStatus });
      addToast({ 
        type: "success", 
        title: "Status uppdaterad", 
        message: `Uppdrag ${newStatus === "published" ? "publicerat" : newStatus === "closed" ? "avslutat" : "uppdaterat"}.` 
      });
    } catch {
      addToast({ type: "error", title: "Fel", message: "Kunde inte uppdatera status." });
    }
  };

  const getStatusActionButton = (status: string, listingId: string) => {
    switch (status) {
      case "draft":
        return (
          <Button 
            variant="primary" 
            size="sm" 
            className="gap-1"
            onClick={(e) => { e.stopPropagation(); handleStatusAction(listingId, status); }}
            disabled={updateStatusMutation.isPending}
          >
            <Eye className="h-3 w-3" />
            Publicera
          </Button>
        );
      case "published":
      case "matching":
        return (
          <Button 
            variant="secondary" 
            size="sm" 
            className="gap-1"
            onClick={(e) => { e.stopPropagation(); handleStatusAction(listingId, status); }}
            disabled={updateStatusMutation.isPending}
          >
            <XCircle className="h-3 w-3" />
            Pausa
          </Button>
        );
      case "closed":
        return (
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1"
            onClick={(e) => { e.stopPropagation(); handleStatusAction(listingId, status); }}
            disabled={updateStatusMutation.isPending}
          >
            <RotateCcw className="h-3 w-3" />
            Återöppna
          </Button>
        );
      default:
        return null;
    }
  };

  // Filter jobs by UI filters (location, type)
  const filteredJobs = React.useMemo(() => {
    if (!jobs) return [];
    
    return jobs.filter((job) => {
      // Location filter
      if (uiFilters.location && job.location) {
        if (!job.location.toLowerCase().includes(uiFilters.location.toLowerCase())) {
          return false;
        }
      }
      
      // Type filter
      if (uiFilters.listingType !== "all") {
        const jobType = (job as { listing_type?: string }).listing_type || "job";
        if (jobType !== uiFilters.listingType) {
          return false;
        }
      }
      
      return true;
    });
  }, [jobs, uiFilters]);

  if (orgLoading) {
    return (
      <AppShell role="employer">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!orgId) {
    return (
      <AppShell role="employer">
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <EmptyState
            type="no-data"
            title="Ingen organisation"
            message="Skapa en organisation för att börja publicera jobb."
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
      <div className="container mx-auto px-4 py-8 max-w-4xl overflow-x-hidden">
        {/* Header - stack on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-xl font-bold text-foreground">Annonser</h1>
          <Button variant="primary" onClick={() => setShowCreateJob(true)} className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Skapa annons
          </Button>
        </div>

        {/* Status Tabs */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ListingStatus | "all")} className="mb-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Filter bar */}
        <div className="mb-4">
          <EmployerListingsFilters
            values={uiFilters}
            onChange={setUiFilters}
            onClear={() => setUiFilters(DEFAULT_EMPLOYER_FILTERS)}
          />
        </div>

        {jobsLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : filteredJobs && filteredJobs.length > 0 ? (
          <div className="space-y-4">
            {filteredJobs.map((job) => {
              const listingType = (job as { listing_type?: string }).listing_type || "job";
              const status = job.status || "published";
              
              return (
                <Card 
                  key={job.id} 
                  variant="interactive" 
                  padding="md" 
                  onClick={() => navigate(`/employer/swipe-talent/${job.id}`)}
                >
                  {/* Mobile: stack layout, Desktop: row layout */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      listingType === "shift_cover" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-primary-muted"
                    }`}>
                      {listingType === "shift_cover" ? (
                        <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <Briefcase className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {job.start_date} - {job.end_date}
                        </span>
                      </div>
                    </div>
                    {/* Badges - wrap on mobile */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={listingType === "shift_cover" ? "warn" : "default"}>
                        {listingType === "shift_cover" ? "Pass" : "Jobb"}
                      </Badge>
                      <Badge variant={STATUS_BADGE_VARIANTS[status] || "default"}>
                        {status === "draft" ? "Utkast" : 
                         status === "published" ? "Aktiv" :
                         status === "matching" ? "Matchande" : 
                         status === "closed" ? "Avslutad" : status}
                      </Badge>
                    </div>
                    {/* Actions - stack on mobile */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {getStatusActionButton(status, job.id)}
                      <Button variant="secondary" size="sm" className="gap-1 whitespace-nowrap">
                        <Users className="h-4 w-4" />
                        <span className="hidden xs:inline">Se kandidater</span>
                        <span className="xs:hidden">Visa</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState 
            type="no-jobs" 
            title="Inga annonser ännu" 
            message="Skapa din första annons för att börja hitta talanger." 
            action={{ label: "Skapa annons", onClick: () => setShowCreateJob(true) }} 
          />
        )}

        {/* Create Job/Shift Modal */}
        <Modal open={showCreateJob} onOpenChange={setShowCreateJob}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Skapa uppdrag</ModalTitle>
              <ModalDescription>Välj typ och fyll i uppgifter.</ModalDescription>
            </ModalHeader>
            <div className="space-y-4 py-4">
              {/* Type toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Switch
                    id="shift-type"
                    checked={isShiftCover}
                    onCheckedChange={setIsShiftCover}
                  />
                  <Label htmlFor="shift-type" className="cursor-pointer">
                    {isShiftCover ? (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Clock className="h-4 w-4" />
                        Täck pass (akut)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        Jobb (säsong)
                      </span>
                    )}
                  </Label>
                </div>
              </div>

              <Input 
                placeholder={isShiftCover ? "Passets titel" : "Titel (t.ex. Liftskötare)"} 
                value={jobTitle} 
                onChange={(e) => setJobTitle(e.target.value)} 
              />
              <Input 
                placeholder="Roll (t.ex. Servering)" 
                value={jobRole} 
                onChange={(e) => setJobRole(e.target.value)} 
              />
              <Input 
                placeholder="Plats" 
                value={jobLocation} 
                onChange={(e) => setJobLocation(e.target.value)} 
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Startdatum</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Slutdatum</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              {/* Shift time fields */}
              {isShiftCover && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Pass startar</Label>
                    <Input 
                      type="datetime-local" 
                      value={shiftStart} 
                      onChange={(e) => setShiftStart(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Pass slutar</Label>
                    <Input 
                      type="datetime-local" 
                      value={shiftEnd} 
                      onChange={(e) => setShiftEnd(e.target.value)} 
                    />
                  </div>
                </div>
              )}
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={() => { setShowCreateJob(false); resetCreateForm(); }}>Avbryt</Button>
              <Button variant="primary" onClick={handleCreateJob} disabled={isCreating}>
                {isCreating ? "Skapar..." : "Skapa"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </AppShell>
  );
}

export default EmployerJobs;
