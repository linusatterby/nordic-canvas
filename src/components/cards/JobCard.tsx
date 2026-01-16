import * as React from "react";
import { MapPin, Calendar, Home, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/classnames";
import { HOUSING_STATUS, type HousingStatus } from "@/lib/constants/status";

export interface JobCardProps {
  id: string;
  title: string;
  company: string;
  location: string;
  period: string;
  housingStatus: HousingStatus;
  matchHint?: string;
  onSwipeYes?: (id: string) => void;
  onSwipeNo?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  className?: string;
}

const housingBadgeVariants: Record<HousingStatus, "verified" | "warn" | "primary" | "default"> = {
  [HOUSING_STATUS.OFFERED]: "verified",
  [HOUSING_STATUS.VERIFIED]: "verified",
  [HOUSING_STATUS.NEEDED]: "warn",
  [HOUSING_STATUS.NONE]: "default",
};

const housingLabels: Record<HousingStatus, string> = {
  [HOUSING_STATUS.OFFERED]: "Boende erbjuds",
  [HOUSING_STATUS.VERIFIED]: "Verifierat boende",
  [HOUSING_STATUS.NEEDED]: "Söker boende",
  [HOUSING_STATUS.NONE]: "Inget boende",
};

export function JobCard({
  id,
  title,
  company,
  location,
  period,
  housingStatus,
  matchHint,
  onSwipeYes,
  onSwipeNo,
  onViewDetails,
  className,
}: JobCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "j") {
      onSwipeYes?.(id);
    } else if (e.key === "ArrowLeft" || e.key === "k") {
      onSwipeNo?.(id);
    }
  };

  return (
    <Card
      variant="interactive"
      padding="lg"
      className={cn("relative focus-within:ring-2 focus-within:ring-primary", className)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="article"
      aria-label={`Jobb: ${title} på ${company}`}
    >
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{company}</p>
      </div>

      {/* Details */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>{location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 shrink-0" />
          <span>{period}</span>
        </div>
      </div>

      {/* Housing Status */}
      <div className="mt-4">
        <Badge variant={housingBadgeVariants[housingStatus]} icon={<Home className="h-3 w-3" />}>
          {housingLabels[housingStatus]}
        </Badge>
      </div>

      {/* Match Hint */}
      {matchHint && (
        <div className="mt-4 flex items-center gap-2 text-sm text-primary bg-primary-muted rounded-lg px-3 py-2">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>{matchHint}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6">
        <Button
          variant="secondary"
          size="md"
          onClick={() => onSwipeNo?.(id)}
          className="flex-1"
          aria-label="Skippa jobb"
        >
          Skippa
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={() => onSwipeYes?.(id)}
          className="flex-1"
          aria-label="Intresserad av jobb"
        >
          Intresserad
        </Button>
      </div>
    </Card>
  );
}
