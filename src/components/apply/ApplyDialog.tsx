/**
 * Apply dialog — drawer on desktop, bottom sheet on mobile.
 *
 * Uses the candidate↔job state machine hooks for save/submit.
 * No direct Supabase imports.
 */

import * as React from "react";
import { X, ChevronLeft, FileText, CheckCircle2, MessageSquare, Send, Bookmark } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { useIsMobile } from "@/hooks/use-mobile";
import { useApplyStepper, type ApplyStep } from "@/features/apply/useApplyStepper";
import { useCredentials } from "@/hooks/useCredentials";
import { useSaveJob, useSubmitApplication } from "@/hooks/useCandidateJobState";
import { useToasts } from "@/components/delight/Toasts";
import { LABELS } from "@/config/labels";
import { cn } from "@/lib/utils/classnames";
import type { ApplicationPayload } from "@/lib/api/candidateJobState";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ApplyDialogProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  orgName: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApplyDialog({ open, onClose, jobId, jobTitle, orgName }: ApplyDialogProps) {
  const isMobile = useIsMobile();
  const stepper = useApplyStepper();
  const { data: credentials } = useCredentials();
  const saveJobMutation = useSaveJob();
  const submitMutation = useSubmitApplication();
  const { addToast } = useToasts();

  // Pre-select latest credential on mount
  const didPreselect = React.useRef(false);
  React.useEffect(() => {
    if (!didPreselect.current && credentials && credentials.length > 0) {
      stepper.setSelectedDocuments([credentials[0].id]);
      didPreselect.current = true;
    }
  }, [credentials]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset on open
  React.useEffect(() => {
    if (open) {
      stepper.reset();
      didPreselect.current = false;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveInstead = async () => {
    try {
      await saveJobMutation.mutateAsync(jobId);
      addToast({ type: "info", title: LABELS.chipSaved, message: `${orgName} – ${jobTitle}` });
      onClose();
    } catch {
      addToast({ type: "error", title: "Fel", message: "Kunde inte spara jobbet." });
    }
  };

  const handleSubmit = async () => {
    const payload: ApplicationPayload = {
      documentIds: stepper.draft.selectedDocumentIds,
      answers: stepper.draft.answers,
    };
    try {
      await submitMutation.mutateAsync({ jobId, payload });
      addToast({ type: "success", title: LABELS.chipApplied, message: `Din ansökan till ${orgName} har skickats.` });
      onClose();
    } catch {
      addToast({ type: "error", title: "Fel", message: "Kunde inte skicka ansökan." });
    }
  };

  const stepLabels: Record<ApplyStep, string> = {
    questions: "Frågor",
    documents: "Dokument",
    review: "Granska & skicka",
  };

  const progressPercent = (stepper.stepNumber / stepper.totalSteps) * 100;

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      direction={isMobile ? "bottom" : "right"}
    >
      <DrawerContent
        className={cn(
          isMobile
            ? "max-h-[92vh]"
            : "ml-auto h-full w-full max-w-md rounded-l-xl rounded-t-none inset-y-0 right-0 left-auto"
        )}
        aria-label={LABELS.applyDialogTitle}
      >
        {/* Header */}
        <DrawerHeader className="relative border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-base font-semibold truncate">
                {LABELS.applyDialogTitle}
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground truncate mt-0.5">
                {jobTitle} – {orgName}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <button
                className="shrink-0 ml-2 p-1.5 rounded-md hover:bg-muted transition-colors"
                aria-label="Stäng"
              >
                <X className="h-4 w-4" />
              </button>
            </DrawerClose>
          </div>

          {/* Step indicator */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Steg {stepper.stepNumber} av {stepper.totalSteps}: {stepLabels[stepper.currentStep]}</span>
            </div>
            <Progress value={progressPercent} className="h-1" />
          </div>
        </DrawerHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {stepper.currentStep === "questions" && (
            <StepQuestions />
          )}
          {stepper.currentStep === "documents" && (
            <StepDocuments
              credentials={credentials ?? []}
              selectedIds={stepper.draft.selectedDocumentIds}
              onToggle={stepper.toggleDocument}
            />
          )}
          {stepper.currentStep === "review" && (
            <StepReview
              jobTitle={jobTitle}
              orgName={orgName}
              selectedDocs={credentials?.filter(c => stepper.draft.selectedDocumentIds.includes(c.id)) ?? []}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 space-y-2">
          <div className="flex items-center gap-2">
            {stepper.stepNumber > 1 && (
              <Button variant="ghost" size="sm" onClick={stepper.back} className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                {LABELS.applyDialogBack}
              </Button>
            )}
            <div className="flex-1" />
            {stepper.currentStep !== "review" ? (
              <Button variant="primary" size="sm" onClick={stepper.next}>
                Nästa
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="gap-1"
              >
                <Send className="h-4 w-4" />
                {LABELS.applyDialogSend}
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveInstead}
            disabled={saveJobMutation.isPending}
            className="w-full text-muted-foreground gap-1"
          >
            <Bookmark className="h-4 w-4" />
            {LABELS.applyDialogSaveInstead}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Step: Questions
// ---------------------------------------------------------------------------

function StepQuestions() {
  return (
    <div className="text-center py-8 space-y-3">
      <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto" />
      <p className="text-sm text-muted-foreground">
        Inga extra frågor för detta jobb.
      </p>
      <p className="text-xs text-muted-foreground">
        Gå vidare för att välja dokument.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Documents
// ---------------------------------------------------------------------------

interface StepDocumentsProps {
  credentials: Array<{ id: string; credential_type: string; label: string | null; issuer: string | null }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
}

function StepDocuments({ credentials, selectedIds, onToggle }: StepDocumentsProps) {
  if (!credentials.length) {
    return (
      <div className="text-center py-8 space-y-3">
        <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">
          Du har inga dokument uppladdade ännu.
        </p>
        <p className="text-xs text-muted-foreground">
          Du kan fortfarande skicka ansökan utan dokument.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">
        Välj vilka dokument du vill bifoga med din ansökan.
      </p>
      {credentials.map((cred) => {
        const selected = selectedIds.includes(cred.id);
        return (
          <button
            key={cred.id}
            type="button"
            onClick={() => onToggle(cred.id)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
              selected
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-muted/50"
            )}
          >
            <div className={cn(
              "shrink-0 h-5 w-5 rounded border flex items-center justify-center transition-colors",
              selected ? "bg-primary border-primary" : "border-muted-foreground/40"
            )}>
              {selected && <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {cred.label || cred.credential_type}
              </p>
              {cred.issuer && (
                <p className="text-xs text-muted-foreground truncate">{cred.issuer}</p>
              )}
            </div>
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Review
// ---------------------------------------------------------------------------

interface StepReviewProps {
  jobTitle: string;
  orgName: string;
  selectedDocs: Array<{ id: string; credential_type: string; label: string | null }>;
}

function StepReview({ jobTitle, orgName, selectedDocs }: StepReviewProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Din ansökan</h4>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tjänst</span>
            <span className="text-foreground font-medium">{jobTitle}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Arbetsgivare</span>
            <span className="text-foreground font-medium">{orgName}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Bifogade dokument</h4>
        {selectedDocs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Inga dokument valda.</p>
        ) : (
          <div className="space-y-1">
            {selectedDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 text-sm">
                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-foreground">{doc.label || doc.credential_type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
        <p className="text-xs text-primary">
          När du skickar din ansökan får arbetsgivaren tillgång till din profil och valda dokument.
        </p>
      </div>
    </div>
  );
}
