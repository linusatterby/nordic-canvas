/**
 * Simple performance instrumentation for debugging load times
 * Logs are gated behind VITE_DEMO_DEBUG=true (not just DEV mode)
 */

import { DEMO_DEBUG_ENABLED } from "./debug";

const timers: Map<string, number> = new Map();

/**
 * Check if perf logs should be shown
 * Uses VITE_DEMO_DEBUG in production, or DEV mode for local development
 */
const shouldLog = (): boolean => DEMO_DEBUG_ENABLED || import.meta.env.DEV;

export function perfStart(label: string): void {
  timers.set(label, performance.now());
  if (shouldLog()) {
    console.log(`[perf] ⏱️ ${label} started`);
  }
}

export function perfEnd(label: string): number {
  const start = timers.get(label);
  if (start === undefined) {
    if (shouldLog()) {
      console.warn(`[perf] Timer "${label}" was never started`);
    }
    return 0;
  }
  
  const duration = performance.now() - start;
  timers.delete(label);
  
  if (shouldLog()) {
    console.log(`[perf] ✅ ${label}: ${duration.toFixed(1)}ms`);
  }
  
  return duration;
}

export function perfMark(label: string, message?: string): void {
  if (shouldLog()) {
    const msg = message ? ` - ${message}` : '';
    console.log(`[perf] 📍 ${label}${msg} @ ${performance.now().toFixed(1)}ms`);
  }
}

/**
 * HOF to wrap async functions with timing
 */
export function withTiming<T extends (...args: unknown[]) => Promise<unknown>>(
  label: string,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    perfStart(label);
    try {
      const result = await fn(...args);
      perfEnd(label);
      return result;
    } catch (error) {
      perfEnd(label);
      throw error;
    }
  }) as T;
}
