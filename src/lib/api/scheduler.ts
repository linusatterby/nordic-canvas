import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ShiftBooking = Database["public"]["Tables"]["shift_bookings"]["Row"];

export interface ShiftBookingWithTalent extends ShiftBooking {
  talent_name: string | null;
}

export interface BusyBlock {
  talent_user_id: string;
  start_ts: string;
  end_ts: string;
}

/**
 * List shift bookings for an org within a date range
 */
export async function listOrgBookings(
  orgId: string,
  range: { start: string; end: string }
): Promise<{
  bookings: ShiftBookingWithTalent[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("shift_bookings")
    .select("*")
    .eq("org_id", orgId)
    .gte("start_ts", range.start)
    .lte("end_ts", range.end)
    .order("start_ts", { ascending: true });

  if (error) {
    return { bookings: [], error: new Error(error.message) };
  }

  // Get talent names
  const talentIds = [...new Set((data ?? []).map((b) => b.talent_user_id))];
  let talentMap = new Map<string, string>();

  if (talentIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", talentIds);

    profiles?.forEach((p) => {
      if (p.full_name) {
        talentMap.set(p.user_id, p.full_name);
      }
    });
  }

  const bookings: ShiftBookingWithTalent[] = (data ?? []).map((b) => ({
    ...b,
    talent_name: talentMap.get(b.talent_user_id) ?? null,
  }));

  return { bookings, error: null };
}

/**
 * List busy blocks for specific talent IDs (from public view, anonymized)
 */
export async function listBusyBlocksForTalentIds(
  talentIds: string[],
  range: { start: string; end: string }
): Promise<{
  blocks: BusyBlock[];
  error: Error | null;
}> {
  if (talentIds.length === 0) {
    return { blocks: [], error: null };
  }

  const { data, error } = await supabase
    .from("talent_busy_blocks_public")
    .select("*")
    .in("talent_user_id", talentIds)
    .gte("start_ts", range.start)
    .lte("end_ts", range.end);

  if (error) {
    return { blocks: [], error: new Error(error.message) };
  }

  const blocks: BusyBlock[] = (data ?? [])
    .filter((b) => b.talent_user_id && b.start_ts && b.end_ts)
    .map((b) => ({
      talent_user_id: b.talent_user_id!,
      start_ts: b.start_ts!,
      end_ts: b.end_ts!,
    }));

  return { blocks, error: null };
}

/**
 * Create a new shift booking
 */
export async function createBooking(params: {
  orgId: string;
  talentUserId: string;
  startTs: string;
  endTs: string;
}): Promise<{
  booking: ShiftBooking | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("shift_bookings")
    .insert({
      org_id: params.orgId,
      talent_user_id: params.talentUserId,
      start_ts: params.startTs,
      end_ts: params.endTs,
    })
    .select()
    .single();

  return {
    booking: data,
    error: error ? new Error(error.message) : null,
  };
}
