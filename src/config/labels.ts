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

  /* ── Request dialog ────────────────────────────── */
  requestDialogTitle: "Förfrågan",
  requestActionAccept: "Kan",
  requestActionDecline: "Kan inte",
  requestActionSuggestTime: "Föreslå tid",
} as const;
