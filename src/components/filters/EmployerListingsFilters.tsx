import * as React from "react";
import { MapPin, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/classnames";
import type { ListingType } from "@/lib/api/jobs";

export interface EmployerListingFilterValues {
  location: string;
  listingType: ListingType | "all";
}

interface EmployerListingsFiltersProps {
  values: EmployerListingFilterValues;
  onChange: (values: EmployerListingFilterValues) => void;
  onClear: () => void;
  className?: string;
}

export const DEFAULT_EMPLOYER_FILTERS: EmployerListingFilterValues = {
  location: "",
  listingType: "all",
};

const LISTING_TYPE_OPTIONS = [
  { value: "all", label: "Alla typer" },
  { value: "job", label: "Jobb" },
  { value: "shift_cover", label: "Pass" },
];

export function EmployerListingsFilters({
  values,
  onChange,
  onClear,
  className,
}: EmployerListingsFiltersProps) {
  const hasActiveFilters = values.location !== "" || values.listingType !== "all";

  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      {/* Location input */}
      <div className="space-y-1 flex-1 min-w-[140px]">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Ort
        </Label>
        <Input
          placeholder="Filtrera på ort..."
          value={values.location}
          onChange={(e) => onChange({ ...values, location: e.target.value })}
          className="h-9 text-sm"
        />
      </div>

      {/* Listing type dropdown */}
      <div className="space-y-1 w-32">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <Filter className="h-3 w-3" />
          Typ
        </Label>
        <Select
          value={values.listingType}
          onValueChange={(v) => onChange({ ...values, listingType: v as ListingType | "all" })}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LISTING_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Rensa
        </Button>
      )}
    </div>
  );
}
