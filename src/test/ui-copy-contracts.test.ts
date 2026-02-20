/**
 * UI copy contract tests – verifies presentation-layer copy consistency.
 * No real data fetching; hooks are imported only for type-checking of labels.
 */
import { describe, it, expect } from "vitest";
import { LABELS } from "@/config/labels";

describe("Copy contracts", () => {
  // ── 1. Saved toast copy ──────────────────────────────────────────
  it("saved toast copy equals 'Sparat i Sparade jobb.'", () => {
    expect(LABELS.toastJobSaved).toBe("Sparat i Sparade jobb.");
  });

  // ── 2. Applied state CTA ─────────────────────────────────────────
  it("APPLIED state shows 'Visa ansökan', not 'Ansök'", () => {
    expect(LABELS.ctaViewApplication).toBe("Visa ansökan");
    // "Ansök" should still exist for the non-applied state
    expect(LABELS.actionApply).toBe("Ansök");
  });

  // ── 3. Employer separation copy ──────────────────────────────────
  it("employer applications view has explainer line", () => {
    expect(LABELS.employerApplicationsExplainer).toBe(
      "Här visas endast kandidater som skickat en ansökan."
    );
  });

  it("employer candidate pool view has explainer line", () => {
    expect(LABELS.employerPoolExplainer).toBe(
      "Här kan du kontakta kandidater – det räknas inte som en ansökan."
    );
  });

  // ── 4. Demo banner uses centralised label ────────────────────────
  it("demo banner notice is a centralised label", () => {
    expect(LABELS.demoBannerNotice).toContain("Demo");
    expect(LABELS.demoBannerNotice).toContain("live");
  });
});
