import { describe, it, expect } from "vitest";
import {
  computeCredentialScore,
  type MappingEntry,
  type TalentCredential,
} from "@/lib/matching/credentialScore";

const NOW = new Date("2026-02-15T12:00:00Z");

const MOUNTAIN_MAPPING: MappingEntry[] = [
  { credential_code: "snowmobile_license", weight: 3, kind: "required" },
  { credential_code: "lift_operator", weight: 3, kind: "required" },
  { credential_code: "hlr_aed", weight: 3, kind: "required" },
  { credential_code: "ski_instructor", weight: 3, kind: "recommended" },
];

describe("computeCredentialScore", () => {
  it("returns 0 when talent has no credentials", () => {
    const result = computeCredentialScore([], MOUNTAIN_MAPPING, NOW);
    expect(result.score).toBe(0);
    expect(result.required_met_count).toBe(0);
    expect(result.required_total).toBe(3);
    expect(result.recommended_met_count).toBe(0);
    expect(result.recommended_total).toBe(1);
  });

  it("scores required credentials (capped at 60)", () => {
    const creds: TalentCredential[] = [
      { credential_type: "snowmobile_license", expires_at: null },
      { credential_type: "lift_operator", expires_at: null },
      { credential_type: "hlr_aed", expires_at: "2027-01-01" },
    ];
    const result = computeCredentialScore(creds, MOUNTAIN_MAPPING, NOW);
    expect(result.required_met_count).toBe(3);
    expect(result.points_from_required).toBe(60); // 3*30 capped at 60
    expect(result.score).toBe(60);
  });

  it("scores recommended credentials", () => {
    const creds: TalentCredential[] = [
      { credential_type: "snowmobile_license", expires_at: null },
      { credential_type: "lift_operator", expires_at: null },
      { credential_type: "hlr_aed", expires_at: null },
      { credential_type: "ski_instructor", expires_at: null },
    ];
    const result = computeCredentialScore(creds, MOUNTAIN_MAPPING, NOW);
    expect(result.score).toBe(75); // 60 required + 15 recommended
  });

  it("treats expired credential as not met", () => {
    const creds: TalentCredential[] = [
      { credential_type: "snowmobile_license", expires_at: "2025-01-01" }, // expired
    ];
    const result = computeCredentialScore(creds, MOUNTAIN_MAPPING, NOW);
    expect(result.required_met_count).toBe(0);
    expect(result.score).toBe(0);
  });

  it("applies -5 penalty for expiring-soon credentials", () => {
    const creds: TalentCredential[] = [
      { credential_type: "snowmobile_license", expires_at: null },
      { credential_type: "lift_operator", expires_at: null },
      { credential_type: "hlr_aed", expires_at: "2026-03-01" }, // ~14 days away → expiring
    ];
    const result = computeCredentialScore(creds, MOUNTAIN_MAPPING, NOW);
    expect(result.penalties).toBe(-5);
    expect(result.score).toBe(55); // 60 - 5
  });
});
