/**
 * Structured logger with event-based API and optional ring buffer.
 *
 * In prod/live:  structured JSON to console (no buffer — avoid PII risk).
 * In demo/test:  human-readable console + in-memory ring buffer for diagnostics.
 */
import { APP_ENV, BACKEND_ENV } from "@/lib/config/env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEvent {
  level: LogLevel;
  event: string;
  ts: string;
  context?: string;
  message?: string;
  error?: string;
  meta?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Ring buffer (test/demo only)
// ---------------------------------------------------------------------------

const BUFFER_MAX = 200;
const _buffer: LogEvent[] = [];
const _isBuffered = BACKEND_ENV === "test" || APP_ENV === "demo";

function pushToBuffer(entry: LogEvent) {
  if (!_isBuffered) return;
  _buffer.push(entry);
  if (_buffer.length > BUFFER_MAX) {
    _buffer.splice(0, _buffer.length - BUFFER_MAX);
  }
}

/** Get a snapshot of the log buffer (newest last). Only populated in test/demo. */
export function getLogBuffer(): readonly LogEvent[] {
  return _buffer;
}

/** Clear the log buffer. */
export function clearLogBuffer(): void {
  _buffer.length = 0;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatError(err: unknown): string {
  if (err instanceof Error) return err.stack || err.message;
  return String(err);
}

function maskValue(value: string, visibleChars = 8): string {
  if (value.length <= visibleChars) return "***";
  return value.slice(0, visibleChars) + "…***";
}

/** Mask any keys/tokens in meta to avoid PII/secret leakage. */
export function safeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const lower = k.toLowerCase();
    if (lower.includes("key") || lower.includes("token") || lower.includes("secret") || lower.includes("password")) {
      safe[k] = typeof v === "string" ? maskValue(v) : "***";
    } else {
      safe[k] = v;
    }
  }
  return safe;
}

// ---------------------------------------------------------------------------
// Core emit
// ---------------------------------------------------------------------------

const consoleMethod: Record<LogLevel, "log" | "info" | "warn" | "error"> = {
  debug: "log",
  info: "info",
  warn: "warn",
  error: "error",
};

function emit(level: LogLevel, event: string, opts?: {
  context?: string;
  message?: string;
  error?: unknown;
  meta?: Record<string, unknown>;
}) {
  const entry: LogEvent = {
    level,
    event,
    ts: new Date().toISOString(),
    context: opts?.context,
    message: opts?.message,
    error: opts?.error ? formatError(opts.error) : undefined,
    meta: safeMeta(opts?.meta),
  };

  pushToBuffer(entry);

  const prefix = entry.context ? `[${entry.context}]` : "[app]";
  const method = consoleMethod[level];

  if (APP_ENV === "prod") {
    // Structured JSON for log aggregators
    console[method](JSON.stringify(entry));
  } else {
    // Human-readable
    const label = `${prefix} ${event}`;
    const args: unknown[] = [label];
    if (entry.message) args.push(entry.message);
    if (opts?.error) args.push(opts.error);
    if (entry.meta && Object.keys(entry.meta).length > 0) args.push(entry.meta);
    console[method](...args);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type LogOpts = {
  context?: string;
  message?: string;
  error?: unknown;
  meta?: Record<string, unknown>;
};

export const logger = {
  debug: (event: string, opts?: LogOpts) => emit("debug", event, opts),
  info: (event: string, opts?: LogOpts) => emit("info", event, opts),
  warn: (event: string, opts?: LogOpts) => emit("warn", event, opts),
  error: (event: string, opts?: LogOpts) => emit("error", event, opts),
};
