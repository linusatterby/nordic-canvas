import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/delight/EmptyStates";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/Modal";
import { Plus, Briefcase, Users, MapPin, Calendar } from "lucide-react";
import { useDefaultOrgId, useCreateOrg } from "@/hooks/useOrgs";
import { useOrgJobs } from "@/hooks/useJobsFeed";
import { createJob } from "@/lib/api/jobs";
import { useToasts } from "@/components/delight/Toasts";
import { useQueryClient } from "@tanstack/react-query";

export function EmployerJobs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToasts();
  const { data: orgId, isLoading: orgLoading } = useDefaultOrgId();
  const { data: jobs, isLoading: jobsLoading } = useOrgJobs(orgId ?? undefined);
  const createOrgMutation = useCreateOrg();

  const [showCreateOrg, setShowCreateOrg] = React.useState(false);
  const [orgName, setOrgName] = React.useState("");
  const [orgLocation, setOrgLocation] = React.useState("");

  const [showCreateJob, setShowCreateJob] = React.useState(false);
  const [jobTitle, setJobTitle] = React.useState("");
  const [jobRole, setJobRole] = React.useState("");
  const [jobLocation, setJobLocation] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
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
    setIsCreating(true);
    try {
      await createJob({
        orgId,
        title: jobTitle,
        roleKey: jobRole,
        location: jobLocation,
        startDate,
        endDate,
      });
      queryClient.invalidateQueries({ queryKey: ["jobs", "org", orgId] });
      setShowCreateJob(false);
      setJobTitle("");
      setJobRole("");
      setJobLocation("");
      setStartDate("");
      setEndDate("");
      addToast({ type: "success", title: "Klart!", message: "Jobb skapat och publicerat." });
    } catch {
      addToast({ type: "error", title: "Fel", message: "Kunde inte skapa jobb." });
    } finally {
      setIsCreating(false);
    }
  };

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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">Mina jobb</h1>
          <Button variant="primary" onClick={() => setShowCreateJob(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Skapa jobb
          </Button>
        </div>

        {jobsLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : jobs && jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} variant="interactive" padding="md" onClick={() => navigate(`/employer/swipe-talent/${job.id}`)}>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary-muted flex items-center justify-center">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{job.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{job.start_date} - {job.end_date}</span>
                    </div>
                  </div>
                  <Badge variant={job.status === "published" ? "verified" : "default"}>{job.status === "published" ? "Aktiv" : job.status}</Badge>
                  <Button variant="secondary" size="sm" className="gap-1"><Users className="h-4 w-4" />Se kandidater</Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState type="no-data" title="Inga jobb ännu" message="Skapa ditt första jobb för att börja hitta talanger." action={{ label: "Skapa jobb", onClick: () => setShowCreateJob(true) }} />
        )}

        <Modal open={showCreateJob} onOpenChange={setShowCreateJob}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Skapa jobb</ModalTitle>
              <ModalDescription>Fyll i uppgifter om tjänsten.</ModalDescription>
            </ModalHeader>
            <div className="space-y-4 py-4">
              <Input placeholder="Titel (t.ex. Liftskötare)" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              <Input placeholder="Roll-nyckel (t.ex. lift_operator)" value={jobRole} onChange={(e) => setJobRole(e.target.value)} />
              <Input placeholder="Plats" value={jobLocation} onChange={(e) => setJobLocation(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <Input type="date" placeholder="Startdatum" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <Input type="date" placeholder="Slutdatum" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setShowCreateJob(false)}>Avbryt</Button>
              <Button variant="primary" onClick={handleCreateJob} disabled={isCreating}>Skapa</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </AppShell>
  );
}

export default EmployerJobs;
