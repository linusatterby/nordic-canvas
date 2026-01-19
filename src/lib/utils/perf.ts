/**
 * Simple performance instrumentation for debugging load times
 */

const timers: Map<string, number> = new Map();

export function perfStart(label: string): void {
  timers.set(label, performance.now());
  if (import.meta.env.DEV) {
    console.log(`[perf] ⏱️ ${label} started`);
  }
}

export function perfEnd(label: string): number {
  const start = timers.get(label);
  if (start === undefined) {
    console.warn(`[perf] Timer "${label}" was never started`);
    return 0;
  }
  
  const duration = performance.now() - start;
  timers.delete(label);
  
  if (import.meta.env.DEV) {
    console.log(`[perf] ✅ ${label}: ${duration.toFixed(1)}ms`);
  }
  
  return duration;
}

export function perfMark(label: string, message?: string): void {
  if (import.meta.env.DEV) {
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
