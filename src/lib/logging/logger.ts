/**
 * Structured logger – thin wrapper around console.
 * In prod: structured JSON-like output, ready for Sentry/Datadog hookup.
 * In demo/dev: standard console with context prefix.
 */
import { APP_ENV } from "@/lib/config/env";

type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  message: string;
  context?: string;
  error?: unknown;
  meta?: Record<string, unknown>;
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.stack || err.message;
  return String(err);
}

function emit(level: LogLevel, payload: LogPayload) {
  const prefix = payload.context ? `[${payload.context}]` : "[app]";

  if (APP_ENV === "prod") {
    // Structured output – easy to parse by log aggregators
    const entry = {
      level,
      env: APP_ENV,
      ts: new Date().toISOString(),
      msg: payload.message,
      ctx: payload.context,
      ...(payload.error ? { error: formatError(payload.error) } : {}),
      ...(payload.meta || {}),
    };
    console[level](JSON.stringify(entry));
  } else {
    // Human-readable for demo/dev
    const args: unknown[] = [`${prefix} ${payload.message}`];
    if (payload.error) args.push(payload.error);
    if (payload.meta) args.push(payload.meta);
    console[level](...args);
  }
}

export const logger = {
  info: (message: string, ctx?: Partial<Omit<LogPayload, "message">>) =>
    emit("info", { message, ...ctx }),
  warn: (message: string, ctx?: Partial<Omit<LogPayload, "message">>) =>
    emit("warn", { message, ...ctx }),
  error: (message: string, ctx?: Partial<Omit<LogPayload, "message">>) =>
    emit("error", { message, ...ctx }),
};
