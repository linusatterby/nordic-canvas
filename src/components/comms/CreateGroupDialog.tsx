/**
 * Dialog for creating an internal group.
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
import { Label } from "@/components/ui/label";
import { LABELS } from "@/config/labels";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
  isSubmitting: boolean;
}

export function CreateGroupDialog({ open, onOpenChange, onSubmit, isSubmitting }: Props) {
  const [name, setName] = useState("");

  async function handleSubmit() {
    if (!name.trim()) return;
    await onSubmit(name.trim());
    setName("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{LABELS.commsCreateGroup}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">{LABELS.commsGroupName}</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={LABELS.commsGroupNamePlaceholder}
              onKeyDown={(e) => e.key === "Enter" && !isSubmitting && handleSubmit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {LABELS.commsCancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
            {LABELS.commsSaveGroup}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
