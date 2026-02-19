import * as React from "react";
import { MapPin, Calendar, Home, ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/classnames";
import { HOUSING_STATUS, type HousingStatus } from "@/lib/constants/status";
import { MatchScoreBadge } from "@/components/matching/MatchScoreBadge";
import { LABELS } from "@/config/labels";
import type { MatchReason } from "@/lib/api/ranking";

export interface JobCardProps {
  id: string;
  title: string;
  company: string;
  location: string;
  period: string;
  housingStatus: HousingStatus;
  housingText?: string | null;
  matchHint?: string;
  matchScore?: number;
  matchReasons?: MatchReason[];
  onSwipeYes?: (id: string) => void;
  onSwipeNo?: (id: string) => void;
  onApply?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  disabled?: boolean;
  pendingDirection?: "yes" | "no" | null;
  pendingApply?: boolean;
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
  housingText,
  matchHint,
  matchScore,
  matchReasons,
  onSwipeYes,
  onSwipeNo,
  onApply,
  onViewDetails,
  disabled = false,
  pendingDirection = null,
  pendingApply = false,
  className,
}: JobCardProps) {
  const [showHousingDetails, setShowHousingDetails] = React.useState(false);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowRight" || e.key === "j") {
      onSwipeYes?.(id);
    } else if (e.key === "ArrowLeft" || e.key === "k") {
      onSwipeNo?.(id);
    }
  };

  const hasHousing = housingStatus === HOUSING_STATUS.OFFERED || housingStatus === HOUSING_STATUS.VERIFIED || !!housingText;

  return (
    <Card
      variant="interactive"
      padding="lg"
      className={cn(
        "relative focus-within:ring-2 focus-within:ring-primary",
        disabled && "pointer-events-none",
        className
      )}
      tabIndex={disabled ? -1 : 0}
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
        {hasHousing ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => housingText && setShowHousingDetails(!showHousingDetails)}
              className={cn(
                "inline-flex items-center gap-1",
                housingText && "cursor-pointer hover:opacity-80"
              )}
              disabled={!housingText}
            >
              <Badge variant={housingBadgeVariants[housingStatus]} icon={<Home className="h-3 w-3" />}>
                {housingLabels[housingStatus]}
              </Badge>
              {housingText && (
                showHousingDetails 
                  ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  : <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
            
            {showHousingDetails && housingText && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-sm text-foreground animate-fade-in">
                <p className="text-xs font-medium text-success mb-1">Boendeinfo</p>
                <p>{housingText}</p>
              </div>
            )}
          </div>
        ) : (
          <Badge variant={housingBadgeVariants[housingStatus]} icon={<Home className="h-3 w-3" />}>
            {housingLabels[housingStatus]}
          </Badge>
        )}
      </div>

      {/* Match Score */}
      {matchScore !== undefined && matchScore > 0 && (
        <div className="mt-4">
          <MatchScoreBadge score={matchScore} reasons={matchReasons} variant="full" />
        </div>
      )}

      {/* Match Hint (legacy fallback) */}
      {!matchScore && matchHint && (
        <div className="mt-4 flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-lg px-3 py-2">
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
          aria-label={LABELS.actionSkip}
          disabled={disabled}
        >
          {pendingDirection === "no" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            LABELS.actionSkip
          )}
        </Button>
        <Button
          variant="outline"
          size="md"
          onClick={() => onSwipeYes?.(id)}
          className="flex-1"
          aria-label={LABELS.actionSave}
          disabled={disabled}
        >
          {pendingDirection === "yes" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            LABELS.actionSave
          )}
        </Button>
        {onApply && (
          <Button
            variant="primary"
            size="md"
            onClick={() => onApply(id)}
            className="flex-1"
            aria-label={LABELS.actionApply}
            disabled={disabled || pendingApply}
          >
            {pendingApply ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              LABELS.actionApply
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}
