import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/classnames";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        primary: "bg-primary-muted text-primary",
        verified: "bg-verified-muted text-verified",
        delight: "bg-delight-muted text-delight",
        warn: "bg-warn-muted text-warn",
        busy: "bg-busy-muted text-busy",
        new: "bg-primary text-primary-foreground",
        outline: "border border-border bg-transparent text-muted-foreground",
        warm: "bg-warm-accent-muted text-primary border border-primary/15",
      },
      size: {
        sm: "px-2 py-0 text-[10px]",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

function Badge({ className, variant, size, icon, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
