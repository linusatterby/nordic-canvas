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
} as const;
