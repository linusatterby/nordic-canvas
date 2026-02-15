import { supabase } from "@/integrations/supabase/client";

export interface ShiftSlot {
  id: string;
  user_id: string;
  weekday: number;
  timeblock: string;
}

/**
 * List all shift availability slots for the current user
 */
export async function listMyShiftAvailability(): Promise<ShiftSlot[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("talent_shift_availability")
    .select("*")
    .eq("user_id", user.id)
    .order("weekday", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ShiftSlot[];
}

/**
 * Replace all shift availability: delete existing + insert new combos.
 * weekdays: 0-6, timeblocks: 'morning' | 'day' | 'evening'
 */
export async function replaceShiftAvailability(
  weekdays: number[],
  timeblocks: string[]
): Promise<ShiftSlot[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Delete all existing
  const { error: delError } = await supabase
    .from("talent_shift_availability")
    .delete()
    .eq("user_id", user.id);

  if (delError) throw new Error(delError.message);

  // Build combos
  const rows = weekdays.flatMap((wd) =>
    timeblocks.map((tb) => ({
      user_id: user.id,
      weekday: wd,
      timeblock: tb,
    }))
  );

  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from("talent_shift_availability")
    .insert(rows)
    .select();

  if (error) throw new Error(error.message);
  return (data ?? []) as ShiftSlot[];
}
