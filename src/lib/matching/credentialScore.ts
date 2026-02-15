/**
 * Pure credential-match scoring function (no DB / no side-effects).
 *
 * Scoring rules:
 *   • Each met required credential  → 30 pts  (cap 60)
 *   • Each met recommended credential → 15 pts (cap 45)
 *   • Expired credential → counts as NOT met
 *   • Expires within 30 days → -5 penalty per occurrence
 *   • Total capped at 0–100
 */

export interface MappingEntry {
  credential_code: string;
  weight: number;
  kind: "required" | "recommended";
}

export interface TalentCredential {
  credential_type: string;   // maps to credential_code
  expires_at: string | null;
}

export interface ScoreBreakdown {
  score: number;
  required_met_count: number;
  required_total: number;
  recommended_met_count: number;
  recommended_total: number;
  points_from_required: number;
  points_from_recommended: number;
  penalties: number;
}

function isExpired(expiresAt: string | null, now: Date): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < now;
}

function isExpiringSoon(expiresAt: string | null, now: Date): boolean {
  if (!expiresAt) return false;
  const exp = new Date(expiresAt);
  if (exp < now) return false; // already expired
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return exp.getTime() - now.getTime() < thirtyDays;
}

export function computeCredentialScore(
  talentCredentials: TalentCredential[],
  mapping: MappingEntry[],
  now: Date = new Date(),
): ScoreBreakdown {
  const required = mapping.filter((m) => m.kind === "required");
  const recommended = mapping.filter((m) => m.kind === "recommended");

  // Build lookup of valid talent credentials
  const validCodes = new Set<string>();
  const expiringSoonCodes = new Set<string>();

  for (const tc of talentCredentials) {
    if (isExpired(tc.expires_at, now)) continue;
    validCodes.add(tc.credential_type);
    if (isExpiringSoon(tc.expires_at, now)) {
      expiringSoonCodes.add(tc.credential_type);
    }
  }

  let requiredMet = 0;
  for (const r of required) {
    if (validCodes.has(r.credential_code)) requiredMet++;
  }

  let recommendedMet = 0;
  for (const r of recommended) {
    if (validCodes.has(r.credential_code)) recommendedMet++;
  }

  const pointsRequired = Math.min(requiredMet * 30, 60);
  const pointsRecommended = Math.min(recommendedMet * 15, 45);
  const penalties = expiringSoonCodes.size * -5;

  const raw = pointsRequired + pointsRecommended + penalties;
  const score = Math.max(0, Math.min(100, raw));

  return {
    score,
    required_met_count: requiredMet,
    required_total: required.length,
    recommended_met_count: recommendedMet,
    recommended_total: recommended.length,
    points_from_required: pointsRequired,
    points_from_recommended: pointsRecommended,
    penalties,
  };
}
