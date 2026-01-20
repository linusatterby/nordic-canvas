import { Eye, EyeOff, Clock, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Switch } from "@/components/ui/switch";
import { useVisibilitySummary, useUpdateVisibilitySummary } from "@/hooks/useVisibilitySummary";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";

export function TalentCircleVisibilityCard() {
  const { data: visibility, isLoading } = useVisibilitySummary();
  const updateMutation = useUpdateVisibilitySummary();

  const isCircleOnly = visibility?.scope === "circle_only";
  const isOff = visibility?.scope === "off";
  const extraHours = visibility?.available_for_extra_hours ?? false;

  const handleExtraHoursChange = (checked: boolean) => {
    // Optimistic - mutation handles rollback on error
    updateMutation.mutate(
      {
        scope: visibility?.scope ?? "public",
        extraHours: checked,
      },
      {
        onSuccess: () => {
          toast.success(checked ? "Extra timmar aktiverat" : "Extra timmar avaktiverat");
        },
        onError: () => {
          toast.error("Kunde inte uppdatera inställning");
        },
      }
    );
  };

  const handleCircleOnlyChange = (checked: boolean) => {
    const newScope = checked ? "circle_only" : "public";
    // Optimistic - mutation handles rollback on error
    updateMutation.mutate(
      {
        scope: newScope,
        extraHours: visibility?.available_for_extra_hours ?? false,
      },
      {
        onSuccess: () => {
          toast.success(
            checked
              ? "Du syns nu bara för partnerföretag"
              : "Du syns nu för alla i orten"
          );
        },
        onError: () => {
          toast.error("Kunde inte uppdatera inställning");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card variant="default" padding="lg">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="mt-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="default" padding="lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Synlighet & Extra pass
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Styr hur arbetsgivare kan hitta dig för extra jobb
        </p>
      </CardHeader>

      <CardContent className="mt-4 space-y-4">
        {/* Extra Hours Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="font-medium text-foreground text-sm">
                Tillgänglig för extra timmar
              </span>
              <p className="text-xs text-muted-foreground">
                Arbetsgivare kan hitta dig för snabba pass
              </p>
            </div>
          </div>
          <Switch
            checked={extraHours}
            onCheckedChange={handleExtraHoursChange}
            disabled={updateMutation.isPending}
          />
        </div>

        {/* Circle Only Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              {isCircleOnly ? (
                <EyeOff className="h-4 w-4 text-accent-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-accent-foreground" />
              )}
            </div>
            <div>
              <span className="font-medium text-foreground text-sm">
                Synlig bara för Trusted Circle
              </span>
              <p className="text-xs text-muted-foreground">
                Partnerföretag ja – hela orten nej
              </p>
            </div>
          </div>
          <Switch
            checked={isCircleOnly}
            onCheckedChange={handleCircleOnlyChange}
            disabled={updateMutation.isPending || isOff}
          />
        </div>

        {/* Status indicator */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Status:</span>{" "}
            {isOff && "Osynlig för alla"}
            {isCircleOnly && extraHours && "Synlig för partnerföretag (extra pass)"}
            {isCircleOnly && !extraHours && "Synlig för partnerföretag (endast matcher)"}
            {!isCircleOnly && !isOff && extraHours && "Synlig för alla i orten (extra pass)"}
            {!isCircleOnly && !isOff && !extraHours && "Synlig för alla i orten (endast matcher)"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
