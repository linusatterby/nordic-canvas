/**
 * Dialog for creating an internal message.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LABELS } from "@/config/labels";
import type { InternalGroup, CreateMessagePayload } from "@/lib/api/internalComms";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: InternalGroup[];
  orgId: string;
  onSubmit: (payload: CreateMessagePayload) => Promise<void>;
  isSubmitting: boolean;
}

export function CreateMessageDialog({
  open,
  onOpenChange,
  groups,
  orgId,
  onSubmit,
  isSubmitting,
}: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "groups">("all");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const canSubmit = title.trim() && body.trim() && (target === "all" || selectedGroups.length > 0);

  function reset() {
    setTitle("");
    setBody("");
    setTarget("all");
    setSelectedGroups([]);
  }

  async function handleSubmit() {
    await onSubmit({
      org_id: orgId,
      title: title.trim(),
      body: body.trim(),
      target,
      group_ids: target === "groups" ? selectedGroups : undefined,
    });
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{LABELS.commsNewMessage}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="msg-title">{LABELS.commsFieldTitle}</Label>
            <Input
              id="msg-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={LABELS.commsFieldTitlePlaceholder}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="msg-body">{LABELS.commsFieldBody}</Label>
            <Textarea
              id="msg-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={LABELS.commsFieldBodyPlaceholder}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>{LABELS.commsFieldTarget}</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="target"
                  checked={target === "all"}
                  onChange={() => setTarget("all")}
                  className="accent-primary"
                />
                <span className="text-sm">{LABELS.commsTargetAll}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="target"
                  checked={target === "groups"}
                  onChange={() => setTarget("groups")}
                  className="accent-primary"
                />
                <span className="text-sm">{LABELS.commsTargetGroups}</span>
              </label>
            </div>

            {target === "groups" && (
              <div className="space-y-2 pl-1 mt-2">
                {groups.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{LABELS.commsNoGroups}</p>
                ) : (
                  groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedGroups.includes(g.id)}
                        onCheckedChange={(checked) => {
                          setSelectedGroups((prev) =>
                            checked
                              ? [...prev, g.id]
                              : prev.filter((id) => id !== g.id)
                          );
                        }}
                      />
                      <span className="text-sm">{g.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {LABELS.commsCancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? LABELS.commsSending : LABELS.commsSend}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
