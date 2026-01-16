import * as React from "react";
import { cn } from "@/lib/utils/classnames";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "verified" | "delight" | "warn";
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, showLabel = false, size = "md", variant = "default", ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    const sizeClasses = {
      sm: "h-1.5",
      md: "h-2.5",
      lg: "h-4",
    };
    
    const variantClasses = {
      default: "bg-primary",
      verified: "bg-verified",
      delight: "bg-delight",
      warn: "bg-warn",
    };

    return (
      <div className={cn("relative w-full", className)} ref={ref} {...props}>
        <div
          className={cn(
            "w-full overflow-hidden rounded-pill bg-secondary",
            sizeClasses[size]
          )}
        >
          <div
            className={cn(
              "h-full rounded-pill transition-all duration-slow ease-out",
              variantClasses[variant]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <span className="absolute right-0 top-0 -translate-y-full pb-1 text-xs font-medium text-muted-foreground">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
