import * as React from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToasts } from "@/components/delight/Toasts";
import { updateMyProfile } from "@/lib/api/profile";
import { useAuth } from "@/contexts/AuthContext";

interface AvailabilityEditorProps {
  className?: string;
}

export function AvailabilityEditor({ className }: AvailabilityEditorProps) {
  const { profile, refreshProfile } = useAuth();
  const { addToast } = useToasts();
  const [isLoading, setIsLoading] = React.useState(false);

  // Get profile values with type assertion for new fields
  const profileWithDates = profile as typeof profile & {
    available_from?: string | null;
    available_to?: string | null;
  };

  const [availableFrom, setAvailableFrom] = React.useState<string>(
    profileWithDates?.available_from ?? ""
  );
  const [availableTo, setAvailableTo] = React.useState<string>(
    profileWithDates?.available_to ?? ""
  );

  // Update local state when profile changes
  React.useEffect(() => {
    setAvailableFrom(profileWithDates?.available_from ?? "");
    setAvailableTo(profileWithDates?.available_to ?? "");
  }, [profileWithDates?.available_from, profileWithDates?.available_to]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await updateMyProfile({
        available_from: availableFrom || null,
        available_to: availableTo || null,
      });

      if (error) {
        addToast({
          type: "error",
          title: "Kunde inte spara",
          message: error.message,
        });
        return;
      }

      await refreshProfile();
      addToast({
        type: "success",
        title: "Sparat!",
        message: "Din tillgänglighet har uppdaterats.",
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "Fel",
        message: "Något gick fel. Försök igen.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges =
    availableFrom !== (profileWithDates?.available_from ?? "") ||
    availableTo !== (profileWithDates?.available_to ?? "");

  return (
    <Card variant="default" padding="lg" className={className} id="availability-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Tillgänglighet</h3>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Ange när du är tillgänglig för säsongsarbete. Detta hjälper arbetsgivare hitta dig.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="available-from">Tillgänglig från</Label>
          <Input
            id="available-from"
            type="date"
            value={availableFrom}
            onChange={(e) => setAvailableFrom(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="available-to">Tillgänglig till</Label>
          <Input
            id="available-to"
            type="date"
            value={availableTo}
            onChange={(e) => setAvailableTo(e.target.value)}
            min={availableFrom || undefined}
            className="w-full"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={isLoading || !hasChanges}
        >
          {isLoading ? "Sparar..." : "Spara tillgänglighet"}
        </Button>
      </div>
    </Card>
  );
}
