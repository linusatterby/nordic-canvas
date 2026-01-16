import * as React from "react";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, getISOWeek } from "date-fns";
import { sv } from "date-fns/locale";

export interface WeekRange {
  start: string; // ISO string (inclusive)
  end: string;   // ISO string (exclusive, start of next week)
  weekNumber: number;
  year: number;
  displayStart: string;
  displayEnd: string;
}

interface WeekRangeSelectorProps {
  value: WeekRange;
  onChange: (range: WeekRange) => void;
}

export function getWeekRange(date: Date): WeekRange {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const nextWeekStart = addWeeks(weekStart, 1);
  
  return {
    start: weekStart.toISOString(),
    end: nextWeekStart.toISOString(),
    weekNumber: getISOWeek(weekStart),
    year: weekStart.getFullYear(),
    displayStart: format(weekStart, "d MMM", { locale: sv }),
    displayEnd: format(weekEnd, "d MMM", { locale: sv }),
  };
}

export function getCurrentWeekRange(): WeekRange {
  return getWeekRange(new Date());
}

export function WeekRangeSelector({ value, onChange }: WeekRangeSelectorProps) {
  const handlePrev = () => {
    const currentStart = new Date(value.start);
    onChange(getWeekRange(subWeeks(currentStart, 1)));
  };

  const handleNext = () => {
    const currentStart = new Date(value.start);
    onChange(getWeekRange(addWeeks(currentStart, 1)));
  };

  const handleToday = () => {
    onChange(getCurrentWeekRange());
  };

  const isCurrentWeek = value.weekNumber === getISOWeek(new Date()) && 
                        value.year === new Date().getFullYear();

  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" onClick={handlePrev} aria-label="Föregående vecka">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="text-center min-w-[160px]">
        <div className="font-semibold text-foreground">
          Vecka {value.weekNumber}, {value.year}
        </div>
        <div className="text-xs text-muted-foreground">
          {value.displayStart} – {value.displayEnd}
        </div>
      </div>
      
      <Button variant="ghost" size="sm" onClick={handleNext} aria-label="Nästa vecka">
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentWeek && (
        <Button variant="secondary" size="sm" onClick={handleToday} className="gap-1 ml-2">
          <CalendarDays className="h-3 w-3" />
          Idag
        </Button>
      )}
    </div>
  );
}
