import * as React from "react";
import { Info } from "lucide-react";
import { useDemoMode } from "@/hooks/useDemo";
import { shouldBypassAvailabilityFilters, DEMO_AVAILABILITY_BYPASS_LABEL } from "@/lib/demo/availabilityBypass";

/**
 * Discreet info row shown only in demo mode when availability bypass is active.
 * Place near filter bars or "Spara preferenser" buttons.
 */
export function DemoAvailabilityBypassNotice({ className }: { className?: string }) {
  const { isDemoMode } = useDemoMode();

  if (!shouldBypassAvailabilityFilters(isDemoMode)) return null;

  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs border border-[hsl(var(--c-border-subtle))] bg-[hsl(var(--c-teal-muted))] text-[hsl(var(--c-text-secondary))] ${className ?? ""}`}
    >
      <Info className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--c-teal))]" />
      <span>{DEMO_AVAILABILITY_BYPASS_LABEL}</span>
    </div>
  );
}
