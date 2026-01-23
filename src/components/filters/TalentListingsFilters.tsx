import * as React from "react";
import { MapPin, Briefcase, Home, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/classnames";

export interface TalentListingFilterValues {
  location: string;
  role: string;
  housingOnly: boolean;
  includeShiftCover: boolean;
  startDate: string;
  endDate: string;
}

interface TalentListingsFiltersProps {
  values: TalentListingFilterValues;
  onChange: (values: TalentListingFilterValues) => void;
  onClear: () => void;
  className?: string;
}

export const DEFAULT_TALENT_FILTERS: TalentListingFilterValues = {
  location: "",
  role: "",
  housingOnly: false,
  includeShiftCover: false,
  startDate: "",
  endDate: "",
};

export function TalentListingsFilters({ 
  values, 
  onChange, 
  onClear, 
  className 
}: TalentListingsFiltersProps) {
  const hasActiveFilters =
    values.location !== "" ||
    values.role !== "" ||
    values.housingOnly ||
    values.includeShiftCover ||
    values.startDate ||
    values.endDate;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Row 1: Location and Role inputs */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Ort
          </Label>
          <Input
            placeholder="Visby, Åre..."
            value={values.location}
            onChange={(e) => onChange({ ...values, location: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            Roll
          </Label>
          <Input
            placeholder="Servis, Bartender..."
            value={values.role}
            onChange={(e) => onChange({ ...values, role: e.target.value })}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Row 2: Toggles */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="housing-filter"
            checked={values.housingOnly}
            onCheckedChange={(checked) => onChange({ ...values, housingOnly: checked })}
          />
          <Label htmlFor="housing-filter" className="text-sm flex items-center gap-1 cursor-pointer">
            <Home className="h-3.5 w-3.5" />
            Endast boende
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="shift-filter"
            checked={values.includeShiftCover}
            onCheckedChange={(checked) => onChange({ ...values, includeShiftCover: checked })}
          />
          <Label htmlFor="shift-filter" className="text-sm flex items-center gap-1 cursor-pointer">
            <Clock className="h-3.5 w-3.5" />
            Visa pass
          </Label>
        </div>
      </div>

      {/* Row 3: Date filters (shown when shifts enabled) */}
      {values.includeShiftCover && (
        <div className="grid grid-cols-2 gap-2 animate-fade-in">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Från datum</Label>
            <Input
              type="date"
              value={values.startDate}
              onChange={(e) => onChange({ ...values, startDate: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Till datum</Label>
            <Input
              type="date"
              value={values.endDate}
              onChange={(e) => onChange({ ...values, endDate: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
        </div>
      )}

      {/* Clear button */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Rensa filter
          </Button>
        </div>
      )}
    </div>
  );
}
