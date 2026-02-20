/**
 * Central terminology labels for the Matildus platform.
 * All user-facing copy should import from here instead of hardcoding terms.
 *
 * Mapping: "talent/talang" → "kandidat/kandidater"
 * Internal technical identifiers (DB tables, RPC names, route paths) are NOT changed.
 */

export const LABELS = {
  /** Singular: a person seeking work */
  candidate: "Kandidat",
  candidateLower: "kandidat",

  /** Plural */
  candidates: "Kandidater",
  candidatesLower: "kandidater",

  /** Profile context */
  candidateProfile: "Kandidatprofil",

  /** Dashboard / view */
  candidateView: "Kandidatvy",
  candidatePanel: "Kandidatpanel",

  /** Employer-facing: "find candidates" */
  findCandidates: "Hitta kandidater",

  /** Role label used in TopNav dropdown etc. */
  roleCandidate: "Kandidat",
  roleEmployer: "Arbetsgivare",
  roleHost: "Värd",

  /** Demo CTA */
  demoCandidateLabel: "Testa demo som kandidat",
  demoEmployerLabel: "Testa demo som arbetsgivare",

  /* ── Job-card actions ─────────────────────────── */
  actionSkip: "Skippa",
  actionSave: "Spara",
  actionApply: "Ansök",

  /* ── Chips / status ────────────────────────────── */
  chipSaved: "Sparad",
  chipApplied: "Ansökt",

  /* ── Saved jobs view ───────────────────────────── */
  savedJobsTitle: "Sparade jobb",
  savedJobsEmpty: "Inga sparade jobb ännu",
  savedJobsEmptyHint: "Spara jobb du gillar så hamnar de här.",
  savedJobsSavedPrefix: "Sparad",

  /* ── Toast copy ────────────────────────────────── */
  toastJobSaved: "Sparat i Sparade jobb.",
  toastApplicationSent: "Ansökan skickad.",
  toastApplicationSentCta: "Se i Inkorgen",
  toastJobUnsaved: "Borttaget från Sparade jobb.",

  /* ── CTA labels ────────────────────────────────── */
  ctaViewApplication: "Visa ansökan",
  ctaSavedDisabled: "Sparad",

  /* ── Apply dialog ──────────────────────────────── */
  applyDialogTitle: "Ansök till tjänsten",
  applyDialogSend: "Skicka ansökan",
  applyDialogSaveInstead: "Spara istället",
  applyDialogBack: "Tillbaka",

  /* ── Employer tabs ─────────────────────────────── */
  employerTabApplications: "Ansökningar",
  employerTabPool: "Kandidatpool",
  employerNoApplications: "Inga ansökningar ännu",
  employerNoApplicationsHint: "När kandidater ansöker till dina jobb ser du dem här.",
  employerNoPool: "Kandidatpoolen är tom",
  employerNoPoolHint: "Kandidater du sparar hamnar här.",
  employerApplicationsExplainer: "Här visas endast kandidater som skickat en ansökan.",
  employerPoolExplainer: "Här kan du kontakta kandidater – det räknas inte som en ansökan.",

  /* ── Request dialog ────────────────────────────── */
  requestDialogTitle: "Förfrågan",
  requestActionAccept: "Kan",
  requestActionDecline: "Kan inte",
  requestActionSuggestTime: "Föreslå tid",

  /* ── Demo ───────────────────────────────────────── */
  demoBannerNotice: "Demo: Exempeldata – inga åtgärder sparas i live.",
} as const;
