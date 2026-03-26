/**
 * Dialog for creating a new onboarding item.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { LABELS } from "@/config/labels";
import type { InternalGroup } from "@/lib/api/internalComms";
import type { CreateOnboardingPayload } from "@/lib/api/onboarding";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: InternalGroup[];
  orgId: string;
  onSubmit: (payload: CreateOnboardingPayload) => Promise<void>;
  isSubmitting: boolean;
}

const CONTENT_TYPES = [
  { value: "document", label: LABELS.onboardingTypeDocument },
  { value: "video", label: LABELS.onboardingTypeVideo },
  { value: "link", label: LABELS.onboardingTypeLink },
  { value: "checklist", label: LABELS.onboardingTypeChecklist },
];

export function CreateOnboardingDialog({ open, onOpenChange, groups, orgId, onSubmit, isSubmitting }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState("document");
  const [contentUrl, setContentUrl] = useState("");
  const [target, setTarget] = useState<"all" | "groups">("all");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setContentType("document");
    setContentUrl("");
    setTarget("all");
    setSelectedGroupIds([]);
  };

  const handleSubmit = async () => {
    await onSubmit({
      org_id: orgId,
      title,
      description,
      content_type: contentType,
      content_url: contentUrl || undefined,
      target,
      group_ids: target === "groups" ? selectedGroupIds : undefined,
    });
    reset();
  };

  const canSubmit = title.trim().length > 0 && (target === "all" || selectedGroupIds.length > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{LABELS.onboardingNewItem}</DialogTitle>
          <DialogDescription>{LABELS.onboardingSubtitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-foreground">{LABELS.onboardingFieldTitle}</label>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="T.ex. Välkommen till teamet"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-foreground">{LABELS.onboardingFieldDescription}</label>
            <textarea
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskriv innehållet..."
            />
          </div>

          {/* Content type */}
          <div>
            <label className="text-sm font-medium text-foreground">{LABELS.onboardingFieldType}</label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
            >
              {CONTENT_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>

          {/* URL */}
          <div>
            <label className="text-sm font-medium text-foreground">{LABELS.onboardingFieldUrl}</label>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Target */}
          <div>
            <label className="text-sm font-medium text-foreground">{LABELS.onboardingFieldTarget}</label>
            <div className="mt-1 flex gap-2">
              <Button
                type="button"
                variant={target === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setTarget("all")}
              >
                {LABELS.onboardingTargetAll}
              </Button>
              <Button
                type="button"
                variant={target === "groups" ? "default" : "outline"}
                size="sm"
                onClick={() => setTarget("groups")}
              >
                {LABELS.onboardingTargetGroups}
              </Button>
            </div>
          </div>

          {/* Group selection */}
          {target === "groups" && (
            <div>
              {!groups.length ? (
                <div className="text-sm text-muted-foreground">
                  <p>{LABELS.onboardingNoGroups}</p>
                  <p className="text-xs mt-1">{LABELS.onboardingNoGroupsHint}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedGroupIds.includes(g.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGroupIds((prev) => [...prev, g.id]);
                          } else {
                            setSelectedGroupIds((prev) => prev.filter((id) => id !== g.id));
                          }
                        }}
                        className="rounded border-input"
                      />
                      {g.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            {LABELS.onboardingCancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Sparar…" : LABELS.onboardingSave}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
