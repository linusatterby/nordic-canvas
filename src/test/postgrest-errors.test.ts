/**
 * Unit tests for PostgREST error helper.
 */
import { describe, it, expect } from "vitest";
import { isPGRST201, normalisePostgrestError } from "@/lib/api/postgrestErrors";

describe("isPGRST201", () => {
  it("detects code PGRST201", () => {
    expect(isPGRST201({ code: "PGRST201", message: "ambiguous" })).toBe(true);
  });

  it("detects code 300 (HTTP ambiguous)", () => {
    expect(isPGRST201({ code: "300", message: "multiple choices" })).toBe(true);
  });

  it("detects PGRST201 in message", () => {
    expect(
      isPGRST201({ code: "unknown", message: "Error PGRST201: Could not..." })
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isPGRST201({ code: "42P01", message: "relation not found" })).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isPGRST201(null)).toBe(false);
    expect(isPGRST201(undefined)).toBe(false);
  });
});

describe("normalisePostgrestError", () => {
  it("returns ambiguous_relationship for PGRST201", () => {
    const result = normalisePostgrestError({ code: "PGRST201", message: "ambiguous embed" });
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("ambiguous_relationship");
    expect((result as any).hint).toContain("orgs!");
  });

  it("returns postgrest_error for other errors", () => {
    const result = normalisePostgrestError({ code: "42P01", message: "relation not found" });
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("postgrest_error");
  });

  it("returns null for falsy input", () => {
    expect(normalisePostgrestError(null)).toBeNull();
    expect(normalisePostgrestError(undefined)).toBeNull();
  });
});
