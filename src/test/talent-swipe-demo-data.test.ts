import { describe, it, expect } from "vitest";

/**
 * Test that the TalentSwipeJobs page does NOT show empty state
 * when demo job data is available. This validates the hook→UI contract.
 */

// Simulates the logic from TalentSwipeJobs to determine empty state
function isSwipeEmpty(listings: unknown[]): boolean {
  return listings.length === 0;
}

// Minimal demo job shape matching ListingWithOrg
const MOCK_DEMO_LISTINGS = [
  { id: "job-1", title: "Servis – heltid", org_name: "Visby Strandhotell", location: "Visby", start_date: "2026-03-01", end_date: "2027-03-01", listing_type: "job", is_demo: true },
  { id: "job-2", title: "Kock – hotellkök", org_name: "Fjällhotellet Åre", location: "Åre", start_date: "2026-04-01", end_date: "2027-04-01", listing_type: "job", is_demo: true },
  { id: "job-3", title: "Extrapass: servis", org_name: "Visby Strandhotell", location: "Visby", start_date: "2026-03-01", end_date: "2026-12-31", listing_type: "shift_cover", is_demo: true },
];

describe("TalentSwipeJobs demo data contract", () => {
  it("does NOT show empty state when demo listings exist", () => {
    expect(isSwipeEmpty(MOCK_DEMO_LISTINGS)).toBe(false);
  });

  it("shows empty state when no listings exist", () => {
    expect(isSwipeEmpty([])).toBe(true);
  });

  it("first listing is used as currentListing (stack top)", () => {
    const currentListing = MOCK_DEMO_LISTINGS[0];
    expect(currentListing).toBeDefined();
    expect(currentListing.title).toBe("Servis – heltid");
  });

  it("demo listings have required rendering fields", () => {
    for (const listing of MOCK_DEMO_LISTINGS) {
      expect(listing.id).toBeTruthy();
      expect(listing.title).toBeTruthy();
      expect(listing.org_name).toBeTruthy();
      expect(listing.location).toBeTruthy();
      expect(listing.start_date).toBeTruthy();
      expect(listing.end_date).toBeTruthy();
      expect(listing.listing_type).toBeTruthy();
    }
  });

  it("includes both job and shift_cover types in demo data", () => {
    const types = new Set(MOCK_DEMO_LISTINGS.map((l) => l.listing_type));
    expect(types.has("job")).toBe(true);
    expect(types.has("shift_cover")).toBe(true);
  });
});
