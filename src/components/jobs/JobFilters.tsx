import * as React from "react";
import { MapPin, Briefcase, Calendar, Home, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/classnames";

export interface JobFilterValues {
  location: string;
  roleKey: string;
  startDate: string;
  endDate: string;
  housingOnly: boolean;
}

interface JobFiltersProps {
  values: JobFilterValues;
  onChange: (values: JobFilterValues) => void;
  onClear: () => void;
  className?: string;
}

const LOCATIONS = [
  { value: "all", label: "Alla orter" },
  { value: "Visby", label: "Visby" },
  { value: "Åre", label: "Åre" },
  { value: "Sälen", label: "Sälen" },
];

const ROLES = [
  { value: "all", label: "Alla roller" },
  { value: "Servering", label: "Servering" },
  { value: "Hotell/Frukost", label: "Hotell/Frukost" },
  { value: "Kök", label: "Kök" },
  { value: "Disk/Runner", label: "Disk/Runner" },
  { value: "Lift/Skidort", label: "Lift/Skidort" },
  { value: "Housekeeping", label: "Housekeeping" },
];

export function JobFilters({ values, onChange, onClear, className }: JobFiltersProps) {
  const hasActiveFilters =
    values.location !== "all" ||
    values.roleKey !== "all" ||
    values.startDate ||
    values.endDate ||
    values.housingOnly;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Row 1: Location and Role */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Ort
          </Label>
          <Select
            value={values.location}
            onValueChange={(v) => onChange({ ...values, location: v })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCATIONS.map((loc) => (
                <SelectItem key={loc.value} value={loc.value}>
                  {loc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            Roll
          </Label>
          <Select
            value={values.roleKey}
            onValueChange={(v) => onChange({ ...values, roleKey: v })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Period (dates) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Från
          </Label>
          <input
            type="date"
            value={values.startDate}
            onChange={(e) => onChange({ ...values, startDate: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Till
          </Label>
          <input
            type="date"
            value={values.endDate}
            onChange={(e) => onChange({ ...values, endDate: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      {/* Row 3: Housing toggle + Clear */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="housing-filter"
            checked={values.housingOnly}
            onCheckedChange={(checked) => onChange({ ...values, housingOnly: checked })}
          />
          <Label htmlFor="housing-filter" className="text-sm flex items-center gap-1 cursor-pointer">
            <Home className="h-3.5 w-3.5" />
            Endast med boende
          </Label>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Rensa filter
          </Button>
        )}
      </div>
    </div>
  );
}

export const DEFAULT_FILTERS: JobFilterValues = {
  location: "all",
  roleKey: "all",
  startDate: "",
  endDate: "",
  housingOnly: false,
};
