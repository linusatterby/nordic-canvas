import * as React from "react";
import { cn } from "@/lib/utils/classnames";
import { APP_NAME, LOGO_MARK } from "@/config/brand";

interface MatildusLogoProps {
  /** Show wordmark next to icon */
  showWordmark?: boolean;
  /** Icon size class – default "h-8 w-8" */
  iconSize?: string;
  /** Additional className on the root wrapper */
  className?: string;
}

/**
 * Matildus brand logo — icon + optional wordmark.
 * Uses design-system tokens (primary / primary-foreground).
 */
export function MatildusLogo({
  showWordmark = true,
  iconSize = "h-8 w-8",
  className,
}: MatildusLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* Icon mark */}
      <span
        className={cn(
          "rounded-lg bg-primary flex items-center justify-center",
          iconSize
        )}
      >
        <span className="text-primary-foreground font-bold text-sm select-none">
          {LOGO_MARK}
        </span>
      </span>
      {showWordmark && (
        <span className="font-semibold text-lg tracking-wide select-none">
          {APP_NAME}
        </span>
      )}
    </span>
  );
}
