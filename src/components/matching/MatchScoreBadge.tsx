import * as React from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/classnames";
import type { MatchReason } from "@/lib/api/ranking";

export interface MatchScoreBadgeProps {
  score: number;
  reasons?: MatchReason[];
  variant?: "compact" | "full";
  className?: string;
}

/**
 * Get score color based on value
 */
function getScoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-warning";
  return "text-muted-foreground";
}

/**
 * Get background color for badge based on score
 */
function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-success/10 border-success/30";
  if (score >= 60) return "bg-primary/10 border-primary/30";
  if (score >= 40) return "bg-warning/10 border-warning/30";
  return "bg-muted/50 border-muted";
}

/**
 * Match score badge with optional expandable reasons
 */
export function MatchScoreBadge({
  score,
  reasons = [],
  variant = "compact",
  className,
}: MatchScoreBadgeProps) {
  const [expanded, setExpanded] = React.useState(false);
  
  // Filter to top 3 reasons by impact
  const topReasons = React.useMemo(() => {
    return [...reasons]
      .filter((r) => r.impact > 0)
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3);
  }, [reasons]);

  const hasReasons = topReasons.length > 0;
  const remainingCount = reasons.filter((r) => r.impact > 0).length - topReasons.length;

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border",
          getScoreBgColor(score),
          className
        )}
      >
        <Sparkles className={cn("h-3 w-3", getScoreColor(score))} />
        <span className={getScoreColor(score)}>{score}</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Score badge with expand toggle */}
      <button
        type="button"
        onClick={() => hasReasons && setExpanded(!expanded)}
        disabled={!hasReasons}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
          getScoreBgColor(score),
          hasReasons && "hover:opacity-80 cursor-pointer"
        )}
      >
        <Sparkles className={cn("h-3.5 w-3.5", getScoreColor(score))} />
        <span className={getScoreColor(score)}>Match: {score}/100</span>
        {hasReasons && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">Varför?</span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </>
        )}
      </button>

      {/* Expanded reasons */}
      {expanded && hasReasons && (
        <div className="pl-2 space-y-1 animate-fade-in">
          {topReasons.map((reason, idx) => (
            <div
              key={reason.key || idx}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <span className={cn("text-xs font-medium", getScoreColor(score))}>
                +{reason.impact}
              </span>
              <span>{reason.label}</span>
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="text-xs text-muted-foreground/70 pl-6">
              +{remainingCount} fler faktorer
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Inline match hint for cards (simplified)
 */
export function MatchHint({
  score,
  topReason,
  className,
}: {
  score?: number;
  topReason?: string;
  className?: string;
}) {
  if (!score || score < 30) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm bg-primary/10 rounded-lg px-3 py-2",
        className
      )}
    >
      <Sparkles className={cn("h-4 w-4 shrink-0", getScoreColor(score))} />
      <span className="text-foreground">
        {topReason || `${score}% match`}
      </span>
    </div>
  );
}
