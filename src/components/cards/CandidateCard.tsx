import * as React from "react";
import { Play, Star, Calendar, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/classnames";
import { MatchScoreBadge } from "@/components/matching/MatchScoreBadge";
import type { MatchReason } from "@/lib/api/ranking";

export interface CandidateCardProps {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  legacyScore: number;
  badges: Array<{ label: string; variant: "verified" | "new" | "primary" }>;
  availability: string;
  hasVideoPitch?: boolean;
  matchScore?: number;
  matchReasons?: MatchReason[];
  onSwipeYes?: (id: string) => void;
  onSwipeNo?: (id: string) => void;
  onViewVideo?: (id: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CandidateCard({
  id,
  name,
  role,
  avatarUrl,
  legacyScore,
  badges,
  availability,
  hasVideoPitch = false,
  matchScore,
  matchReasons,
  onSwipeYes,
  onSwipeNo,
  onViewVideo,
  className,
  disabled = false,
}: CandidateCardProps) {
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
      aria-label={`Kandidat: ${name}`}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar
          src={avatarUrl}
          alt={name}
          fallback={name.slice(0, 2).toUpperCase()}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-foreground truncate">{name}</h3>
            {/* Legacy Score Badge */}
            <div className="group relative">
              <Badge variant="primary" className="cursor-help">
                <Star className="h-3 w-3" />
                {legacyScore}/100
              </Badge>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-ink text-frost text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                Legacy Score – byggt på tidigare säsonger
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{role}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mt-4">
        {badges.map((badge, index) => (
          <Badge key={index} variant={badge.variant} size="sm">
            {badge.label}
          </Badge>
        ))}
      </div>

      {/* Availability */}
      <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>{availability}</span>
      </div>

      {/* Match Score */}
      {matchScore !== undefined && matchScore > 0 && (
        <div className="mt-4">
          <MatchScoreBadge score={matchScore} reasons={matchReasons} variant="full" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6">
        <Button
          variant="danger"
          size="md"
          onClick={() => onSwipeNo?.(id)}
          className="flex-1"
          aria-label="Avvisa kandidat"
          disabled={disabled}
        >
          Nej
        </Button>
        <Button
          variant="verified"
          size="md"
          onClick={() => onSwipeYes?.(id)}
          className="flex-1"
          aria-label="Godkänn kandidat"
          disabled={disabled}
        >
          Ja
        </Button>
      </div>

      {/* Video Pitch Button */}
      {hasVideoPitch && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewVideo?.(id)}
          className="w-full mt-3"
        >
          <Play className="h-4 w-4" />
          Se videopitch
        </Button>
      )}
    </Card>
  );
}
