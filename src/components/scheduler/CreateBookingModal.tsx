import * as React from "react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Star } from "lucide-react";

interface TalentOption {
  user_id: string;
  full_name: string | null;
  legacy_score: number | null;
}

interface BookingSlot {
  talent_user_id: string;
  start_ts: string;
  end_ts: string;
}

interface BusyBlockSlot {
  talent_user_id: string;
  start_ts: string;
  end_ts: string;
}

interface CreateBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talents: TalentOption[];
  existingBookings: BookingSlot[];
  busyBlocks: BusyBlockSlot[];
  onSubmit: (talentUserId: string, startTs: string, endTs: string) => Promise<void>;
  isSubmitting: boolean;
}

export function CreateBookingModal({
  open,
  onOpenChange,
  talents,
  existingBookings,
  busyBlocks,
  onSubmit,
  isSubmitting,
}: CreateBookingModalProps) {
  const [selectedTalent, setSelectedTalent] = React.useState<string>("");
  const [startDate, setStartDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("09:00");
  const [endDate, setEndDate] = React.useState("");
  const [endTime, setEndTime] = React.useState("17:00");
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedTalent("");
      setStartDate("");
      setStartTime("09:00");
      setEndDate("");
      setEndTime("17:00");
      setError(null);
    }
  }, [open]);

  const validateAndSubmit = async () => {
    setError(null);

    if (!selectedTalent) {
      setError("Välj en talang");
      return;
    }

    if (!startDate || !endDate) {
      setError("Ange start- och slutdatum");
      return;
    }

    const startTs = new Date(`${startDate}T${startTime}`);
    const endTs = new Date(`${endDate}T${endTime}`);

    if (isNaN(startTs.getTime()) || isNaN(endTs.getTime())) {
      setError("Ogiltigt datum eller tid");
      return;
    }

    if (endTs <= startTs) {
      setError("Sluttid måste vara efter starttid");
      return;
    }

    // Check duration (max 16 hours)
    const durationHours = (endTs.getTime() - startTs.getTime()) / (1000 * 60 * 60);
    if (durationHours > 16) {
      setError("Maximal passlängd är 16 timmar");
      return;
    }

    // Check overlap with existing bookings for this talent
    const hasBookingConflict = existingBookings.some((b) => {
      if (b.talent_user_id !== selectedTalent) return false;
      const bStart = new Date(b.start_ts);
      const bEnd = new Date(b.end_ts);
      // Overlap: startTs < bEnd && endTs > bStart
      return startTs < bEnd && endTs > bStart;
    });

    if (hasBookingConflict) {
      setError("Krockar med en befintlig bokning för denna talang");
      return;
    }

    // Check overlap with busy blocks
    const hasBusyConflict = busyBlocks.some((b) => {
      if (b.talent_user_id !== selectedTalent) return false;
      const bStart = new Date(b.start_ts);
      const bEnd = new Date(b.end_ts);
      return startTs < bEnd && endTs > bStart;
    });

    if (hasBusyConflict) {
      setError("Talangen är upptagen under denna tid (bokad av annan arbetsgivare)");
      return;
    }

    try {
      await onSubmit(selectedTalent, startTs.toISOString(), endTs.toISOString());
      onOpenChange(false);
    } catch (e) {
      setError("Kunde inte skapa bokning");
    }
  };

  

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle>Skapa bokning</ModalTitle>
          <ModalDescription>Boka in en talang från dina matchningar.</ModalDescription>
        </ModalHeader>

        <div className="space-y-4 py-4">
          {/* Talent selector */}
          <div className="space-y-2">
            <Label>Talang</Label>
            <Select value={selectedTalent} onValueChange={setSelectedTalent}>
              <SelectTrigger>
                <SelectValue placeholder="Välj talang..." />
              </SelectTrigger>
              <SelectContent>
                {talents.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Inga matchade talanger
                  </div>
                ) : (
                  talents.map((t) => (
                    <SelectItem key={t.user_id} value={t.user_id}>
                      <div className="flex items-center gap-2">
                        <span>{t.full_name ?? "Okänd"}</span>
                        <Badge variant="primary" size="sm" className="text-[10px]">
                          <Star className="h-2 w-2" />
                          {t.legacy_score ?? 50}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Start datetime */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Startdatum</Label>
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

          {/* End datetime */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Slutdatum</Label>
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

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button variant="primary" onClick={validateAndSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Skapar..." : "Skapa bokning"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
