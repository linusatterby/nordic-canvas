import * as React from "react";
import { AppShell } from "@/app/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/classnames";

const weekDays = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
const stubSchedule = [
  { day: 0, shifts: [{ name: "Erik S.", status: "confirmed" }] },
  { day: 1, shifts: [{ name: "Anna L.", status: "confirmed" }, { name: "Johan K.", status: "pending" }] },
  { day: 2, shifts: [] },
  { day: 3, shifts: [{ name: "Erik S.", status: "confirmed" }] },
  { day: 4, shifts: [{ name: "Ledig", status: "empty" }] },
  { day: 5, shifts: [{ name: "Anna L.", status: "confirmed" }, { name: "Erik S.", status: "confirmed" }] },
  { day: 6, shifts: [{ name: "Johan K.", status: "pending" }] },
];

export function EmployerScheduler() {
  return (
    <AppShell role="employer">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Schemaläggare</h1>
          <p className="text-sm text-muted-foreground mt-1">Vecka 50, 2025</p>
        </div>

        <Card variant="default" padding="md">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, i) => (
              <div key={day} className="text-center">
                <div className="text-xs font-medium text-muted-foreground mb-2">{day}</div>
                <div className={cn(
                  "min-h-24 rounded-lg p-2 space-y-1",
                  stubSchedule[i].shifts.length === 0 ? "bg-warn-muted border-2 border-dashed border-warn/30" : "bg-secondary"
                )}>
                  {stubSchedule[i].shifts.map((shift, j) => (
                    <Badge
                      key={j}
                      variant={shift.status === "confirmed" ? "verified" : shift.status === "pending" ? "primary" : "busy"}
                      size="sm"
                      className="w-full justify-center text-[10px]"
                    >
                      {shift.name}
                    </Badge>
                  ))}
                  {stubSchedule[i].shifts.length === 0 && (
                    <span className="text-xs text-warn">Lucka</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export default EmployerScheduler;
