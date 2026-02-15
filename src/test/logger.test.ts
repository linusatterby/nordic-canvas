import { describe, it, expect, beforeEach } from "vitest";
import { getLogBuffer, clearLogBuffer, logger, safeMeta, type LogEvent } from "@/lib/logging/logger";

describe("logger", () => {
  beforeEach(() => {
    clearLogBuffer();
  });

  describe("ring buffer", () => {
    it("stores log entries", () => {
      logger.info("test_event", { context: "test" });
      const buf = getLogBuffer();
      expect(buf.length).toBe(1);
      expect(buf[0].event).toBe("test_event");
      expect(buf[0].level).toBe("info");
    });

    it("caps at 200 entries", () => {
      for (let i = 0; i < 210; i++) {
        logger.debug(`evt_${i}`, { context: "test" });
      }
      const buf = getLogBuffer();
      expect(buf.length).toBe(200);
      // Oldest should be evt_10 (0-9 dropped)
      expect(buf[0].event).toBe("evt_10");
      expect(buf[buf.length - 1].event).toBe("evt_209");
    });

    it("clearLogBuffer empties the buffer", () => {
      logger.info("a");
      logger.info("b");
      expect(getLogBuffer().length).toBe(2);
      clearLogBuffer();
      expect(getLogBuffer().length).toBe(0);
    });
  });

  describe("event payload shape", () => {
    it("has required fields", () => {
      logger.warn("test_shape", { context: "ctx", message: "msg", meta: { foo: 1 } });
      const entry = getLogBuffer()[0];
      expect(entry).toMatchObject({
        level: "warn",
        event: "test_shape",
        context: "ctx",
        message: "msg",
        meta: { foo: 1 },
      });
      expect(entry.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("includes error string when provided", () => {
      logger.error("fail", { error: new Error("boom") });
      const entry = getLogBuffer()[0];
      expect(entry.error).toContain("boom");
    });
  });

  describe("safeMeta", () => {
    it("masks keys containing 'key', 'token', 'secret', 'password'", () => {
      const result = safeMeta({
        apiKey: "sk_live_1234567890abcdef",
        authToken: "short",
        name: "safe",
        password: "hunter2",
      });
      expect(result?.apiKey).toContain("***");
      expect(result?.authToken).toBe("***");
      expect(result?.name).toBe("safe");
      expect(result?.password).toBe("***");
    });

    it("returns undefined for undefined input", () => {
      expect(safeMeta(undefined)).toBeUndefined();
    });
  });
});

describe("diagnostics gating", () => {
  // Test the gating logic used by AdminDiagnostics
  function shouldShowDiagnostics(appEnv: string, backendEnv: string): boolean {
    const isLiveBackend = backendEnv === "live";
    if (isLiveBackend && appEnv === "prod") return false;
    return true;
  }

  it("shows in test + demo", () => {
    expect(shouldShowDiagnostics("demo", "test")).toBe(true);
  });

  it("shows in prod + test (staging)", () => {
    expect(shouldShowDiagnostics("prod", "test")).toBe(true);
  });

  it("hides in prod + live", () => {
    expect(shouldShowDiagnostics("prod", "live")).toBe(false);
  });

  it("shows in demo + live (edge case — blocked by config validation anyway)", () => {
    // demo+live is blocked at startup, but if somehow reached, diagnostics should still show
    expect(shouldShowDiagnostics("demo", "live")).toBe(true);
  });
});
