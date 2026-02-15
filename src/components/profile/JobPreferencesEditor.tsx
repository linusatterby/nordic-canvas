import * as React from "react";
import { Briefcase, Calendar, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToasts } from "@/components/delight/Toasts";
import { useJobPreferences, useSaveJobPreferences } from "@/hooks/useJobPreferences";
import { Skeleton } from "@/components/ui/Skeleton";

const WEEKDAYS = [
  { key: "mon", label: "Mån" },
  { key: "tue", label: "Tis" },
  { key: "wed", label: "Ons" },
  { key: "thu", label: "Tor" },
  { key: "fri", label: "Fre" },
  { key: "sat", label: "Lör" },
  { key: "sun", label: "Sön" },
];

const TIMEBLOCKS = [
  { key: "morning", label: "Morgon" },
  { key: "afternoon", label: "Eftermiddag" },
  { key: "evening", label: "Kväll" },
  { key: "night", label: "Natt" },
];

interface Props {
  className?: string;
}

export function JobPreferencesEditor({ className }: Props) {
  const { data: saved, isLoading } = useJobPreferences();
  const saveMutation = useSaveJobPreferences();
  const { addToast } = useToasts();

  const [permanent, setPermanent] = React.useState(false);
  const [seasonal, setSeasonal] = React.useState(false);
  const [extraShifts, setExtraShifts] = React.useState(false);
  const [permanentStart, setPermanentStart] = React.useState("");
  const [seasonalFrom, setSeasonalFrom] = React.useState("");
  const [seasonalTo, setSeasonalTo] = React.useState("");
  const [weekdays, setWeekdays] = React.useState<string[]>([]);
  const [timeblocks, setTimeblocks] = React.useState<string[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Sync from saved data
  React.useEffect(() => {
    if (!saved) return;
    setPermanent(saved.wants_permanent);
    setSeasonal(saved.wants_seasonal);
    setExtraShifts(saved.wants_extra_shifts);
    setPermanentStart(saved.permanent_earliest_start ?? "");
    setSeasonalFrom(saved.seasonal_from ?? "");
    setSeasonalTo(saved.seasonal_to ?? "");
    setWeekdays(saved.extra_weekdays ?? []);
    setTimeblocks(saved.extra_timeblocks ?? []);
  }, [saved]);

  const toggleChip = (arr: string[], key: string, setter: (v: string[]) => void) => {
    setter(arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key]);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!permanent && !seasonal && !extraShifts) {
      e.mode = "Välj minst ett jobbläge.";
    }
    if (permanent && !permanentStart) {
      e.permanentStart = "Ange tidigast startdatum.";
    }
    if (seasonal && (!seasonalFrom || !seasonalTo)) {
      e.seasonal = "Ange från- och till-datum för säsong.";
    }
    if (extraShifts && weekdays.length === 0) {
      e.weekdays = "Välj minst en dag.";
    }
    if (extraShifts && timeblocks.length === 0) {
      e.timeblocks = "Välj minst ett tidsblock.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      await saveMutation.mutateAsync({
        wants_permanent: permanent,
        wants_seasonal: seasonal,
        wants_extra_shifts: extraShifts,
        permanent_earliest_start: permanent ? permanentStart || null : null,
        seasonal_from: seasonal ? seasonalFrom || null : null,
        seasonal_to: seasonal ? seasonalTo || null : null,
        extra_weekdays: extraShifts ? weekdays : [],
        extra_timeblocks: extraShifts ? timeblocks : [],
      });
      addToast({ type: "success", title: "Sparat!", message: "Dina jobbpreferenser har uppdaterats." });
    } catch {
      addToast({ type: "error", title: "Fel", message: "Kunde inte spara. Försök igen." });
    }
  };

  if (isLoading) {
    return (
      <Card variant="default" padding="lg" className={className}>
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  return (
    <Card variant="default" padding="lg" className={className} id="job-preferences-section">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Vad söker du?</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Välj vilka typer av jobb du är intresserad av. Du kan välja flera.
      </p>

      {errors.mode && <p className="text-sm text-destructive mb-3">{errors.mode}</p>}

      {/* Mode checkboxes */}
      <div className="space-y-4">
        {/* Permanent */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={permanent}
              onChange={(e) => setPermanent(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-foreground">Permanent anställning</span>
          </label>
          {permanent && (
            <div className="ml-7 space-y-1">
              <Label htmlFor="perm-start" className="text-xs">Tidigast startdatum</Label>
              <Input
                id="perm-start"
                type="date"
                value={permanentStart}
                onChange={(e) => setPermanentStart(e.target.value)}
                className="max-w-[200px]"
              />
              {errors.permanentStart && <p className="text-xs text-destructive">{errors.permanentStart}</p>}
            </div>
          )}
        </div>

        {/* Seasonal */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={seasonal}
              onChange={(e) => setSeasonal(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Säsongsarbete</span>
            </div>
          </label>
          {seasonal && (
            <div className="ml-7 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="season-from" className="text-xs">Från</Label>
                <Input
                  id="season-from"
                  type="date"
                  value={seasonalFrom}
                  onChange={(e) => setSeasonalFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="season-to" className="text-xs">Till</Label>
                <Input
                  id="season-to"
                  type="date"
                  value={seasonalTo}
                  onChange={(e) => setSeasonalTo(e.target.value)}
                  min={seasonalFrom || undefined}
                />
              </div>
              {errors.seasonal && <p className="text-xs text-destructive col-span-2">{errors.seasonal}</p>}
            </div>
          )}
        </div>

        {/* Extra shifts */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={extraShifts}
              onChange={(e) => setExtraShifts(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Extrapass</span>
            </div>
          </label>
          {extraShifts && (
            <div className="ml-7 space-y-3">
              {/* Weekday chips */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Dagar</p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((wd) => (
                    <button
                      key={wd.key}
                      type="button"
                      onClick={() => toggleChip(weekdays, wd.key, setWeekdays)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        weekdays.includes(wd.key)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {wd.label}
                    </button>
                  ))}
                </div>
                {errors.weekdays && <p className="text-xs text-destructive">{errors.weekdays}</p>}
              </div>

              {/* Timeblock chips */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Tider</p>
                <div className="flex flex-wrap gap-2">
                  {TIMEBLOCKS.map((tb) => (
                    <button
                      key={tb.key}
                      type="button"
                      onClick={() => toggleChip(timeblocks, tb.key, setTimeblocks)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        timeblocks.includes(tb.key)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {tb.label}
                    </button>
                  ))}
                </div>
                {errors.timeblocks && <p className="text-xs text-destructive">{errors.timeblocks}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Sparar…" : "Spara preferenser"}
        </Button>
      </div>
    </Card>
  );
}
