import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DemoShiftBooking = Database["public"]["Tables"]["demo_shift_bookings"]["Row"];
export type DemoReleaseOffer = Database["public"]["Tables"]["demo_release_offers"]["Row"];

export interface DemoBookingWithTalent extends DemoShiftBooking {
  talent_name: string | null;
  is_demo: true;
}

export interface DemoReleaseOfferDTO extends DemoReleaseOffer {
  booking_start_ts: string | null;
  booking_end_ts: string | null;
  talent_name: string | null;
  is_demo: true;
}

/**
 * List demo shift bookings for an org within a date range
 */
export async function listDemoBookings(
  orgId: string,
  range: { start: string; end: string }
): Promise<{
  bookings: DemoBookingWithTalent[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("demo_shift_bookings")
    .select("*")
    .eq("org_id", orgId)
    .gte("start_ts", range.start)
    .lte("end_ts", range.end)
    .order("start_ts", { ascending: true });

  if (error) {
    return { bookings: [], error: new Error(error.message) };
  }

  if (!data || data.length === 0) {
    return { bookings: [], error: null };
  }

  // Get talent card names
  const cardIds = [...new Set(data.filter((b) => b.demo_card_id).map((b) => b.demo_card_id!))];
  const cardMap = new Map<string, string>();
  
  if (cardIds.length > 0) {
    const { data: cards } = await supabase
      .from("demo_talent_cards")
      .select("id, name")
      .in("id", cardIds);
    
    cards?.forEach((c) => {
      cardMap.set(c.id, c.name);
    });
  }

  const bookings: DemoBookingWithTalent[] = data.map((b) => ({
    ...b,
    talent_name: b.demo_card_id ? (cardMap.get(b.demo_card_id) ?? "Demo-kandidat") : "Demo-kandidat",
    is_demo: true as const,
  }));

  return { bookings, error: null };
}

/**
 * List demo release offers for an org
 */
export async function listDemoReleaseOffers(
  orgId: string,
  range: { start: string; end: string }
): Promise<{
  offers: DemoReleaseOfferDTO[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("demo_release_offers")
    .select("*")
    .eq("from_org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return { offers: [], error: new Error(error.message) };
  }

  if (!data || data.length === 0) {
    return { offers: [], error: null };
  }

  // Get booking details
  const bookingIds = [...new Set(data.filter((o) => o.demo_booking_id).map((o) => o.demo_booking_id!))];
  const bookingMap = new Map<string, { start_ts: string; end_ts: string; demo_card_id: string | null }>();
  
  if (bookingIds.length > 0) {
    const { data: bookings } = await supabase
      .from("demo_shift_bookings")
      .select("id, start_ts, end_ts, demo_card_id")
      .in("id", bookingIds);
    
    bookings?.forEach((b) => {
      bookingMap.set(b.id, { start_ts: b.start_ts, end_ts: b.end_ts, demo_card_id: b.demo_card_id });
    });
  }

  // Get card names
  const cardIds = [...new Set([...bookingMap.values()].filter((b) => b.demo_card_id).map((b) => b.demo_card_id!))];
  const cardMap = new Map<string, string>();
  
  if (cardIds.length > 0) {
    const { data: cards } = await supabase
      .from("demo_talent_cards")
      .select("id, name")
      .in("id", cardIds);
    
    cards?.forEach((c) => {
      cardMap.set(c.id, c.name);
    });
  }

  // Build offers with booking data
  const offers: DemoReleaseOfferDTO[] = data
    .map((o) => {
      const booking = o.demo_booking_id ? bookingMap.get(o.demo_booking_id) : null;
      const talentName = booking?.demo_card_id ? cardMap.get(booking.demo_card_id) : null;

      return {
        id: o.id,
        demo_booking_id: o.demo_booking_id,
        from_org_id: o.from_org_id,
        taken_by_org_id: o.taken_by_org_id,
        status: o.status,
        created_at: o.created_at,
        booking_start_ts: booking?.start_ts ?? null,
        booking_end_ts: booking?.end_ts ?? null,
        talent_name: talentName ?? "Demo-kandidat",
        is_demo: true as const,
      };
    })
    .filter((o) => {
      // Filter by range if we have booking times
      if (!o.booking_start_ts || !o.booking_end_ts) return true;
      return o.booking_start_ts >= range.start && o.booking_end_ts <= range.end;
    });

  return { offers, error: null };
}
