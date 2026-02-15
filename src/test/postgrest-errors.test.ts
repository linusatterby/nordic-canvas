/**
 * Unit tests for PostgREST error helper (detection, normalisation, dedupe).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isPGRST201,
  normalisePostgrestError,
  handlePostgrestError,
  _resetDedupeState,
} from "@/lib/api/postgrestErrors";

beforeEach(() => {
  _resetDedupeState();
});

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

describe("handlePostgrestError dedupe", () => {
  it("logs only once for identical errors within 5s window", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    handlePostgrestError("test1", { code: "PGRST201", message: "dup" });
    handlePostgrestError("test1", { code: "PGRST201", message: "dup" });
    handlePostgrestError("test1", { code: "PGRST201", message: "dup" });

    // Should only log once (deduped)
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("logs again for different messages", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    handlePostgrestError("a", { code: "PGRST201", message: "msg-a" });
    handlePostgrestError("b", { code: "PGRST201", message: "msg-b" });

    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
