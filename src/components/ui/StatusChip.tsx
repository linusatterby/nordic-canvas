import { Badge } from "@/components/ui/Badge";
import { LABELS } from "@/config/labels";
import type { JobCardStatus } from "@/components/cards/JobCard";

/**
 * Presentational chip for candidate↔job state.
 * Single source of truth for SAVED / APPLIED visual signals.
 */
export function StatusChip({ status }: { status: JobCardStatus }) {
  if (status === "saved") {
    return <Badge variant="default" size="sm">{LABELS.chipSaved}</Badge>;
  }
  if (status === "applied") {
    return <Badge variant="primary" size="sm">{LABELS.chipApplied}</Badge>;
  }
  return null;
}
