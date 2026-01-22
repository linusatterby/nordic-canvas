/**
 * Debug utilities for demo mode
 * All debug panels and technical info are gated behind VITE_DEMO_DEBUG=true
 */

import { DEMO_DEBUG_ENABLED as ENV_DEMO_DEBUG_ENABLED } from "@/lib/config/env";

/**
 * Whether debug mode is enabled via environment variable
 * Set VITE_DEMO_DEBUG=true in .env for development debugging
 */
export const DEMO_DEBUG_ENABLED = ENV_DEMO_DEBUG_ENABLED;

/**
 * Returns true if debug panels should be shown
 * Requires BOTH demo mode AND debug flag to be true
 */
export function shouldShowDemoDebug(isDemoMode: boolean): boolean {
  return isDemoMode && DEMO_DEBUG_ENABLED;
}

/**
 * Console log wrapper that only logs when debug is enabled
 */
export function debugLog(label: string, ...args: unknown[]): void {
  if (DEMO_DEBUG_ENABLED) {
    console.log(`[debug] ${label}`, ...args);
  }
}

/**
 * Console warn wrapper that only warns when debug is enabled
 */
export function debugWarn(label: string, ...args: unknown[]): void {
  if (DEMO_DEBUG_ENABLED) {
    console.warn(`[debug] ${label}`, ...args);
  }
}
