/**
 * Payroll export utilities for building CSV rows from bookings
 */

import { format, differenceInMinutes } from "date-fns";
import type { EffectiveBooking } from "@/hooks/useScheduler";

export interface PayrollRow {
  Datum: string;
  Start: string;
  Slut: string;
  Timmar: string;
  Talang: string;
  TalangID: string;
  Källa: "DEMO" | "REAL";
}

/**
 * Builds payroll rows from effective bookings
 */
export function buildPayrollRows(bookings: EffectiveBooking[]): PayrollRow[] {
  return bookings
    .slice()
    .sort((a, b) => new Date(a.start_ts).getTime() - new Date(b.start_ts).getTime())
    .map((booking) => {
      const startDate = new Date(booking.start_ts);
      const endDate = new Date(booking.end_ts);
      const minutes = differenceInMinutes(endDate, startDate);
      const hours = (minutes / 60).toFixed(2);

      return {
        Datum: format(startDate, "yyyy-MM-dd"),
        Start: format(startDate, "HH:mm"),
        Slut: format(endDate, "HH:mm"),
        Timmar: hours,
        Talang: booking.talent_name ?? "Okänd",
        TalangID: booking.talent_user_id,
        Källa: booking.is_demo ? "DEMO" : "REAL",
      };
    });
}

/**
 * Generates filename for payroll export
 */
export function getPayrollFilename(weekStart: string): string {
  const date = new Date(weekStart);
  const year = format(date, "yyyy");
  const week = format(date, "ww");
  return `loneexport_${year}-W${week}.csv`;
}
