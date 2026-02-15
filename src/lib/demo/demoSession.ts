/**
 * Session-isolated demo: manages a per-tab demo_session_id stored in sessionStorage.
 * Each browser tab gets its own UUID so multiple demo visitors never collide.
 */

const STORAGE_KEY = "demo_session_id";

function uuid(): string {
  return crypto.randomUUID();
}

/**
 * Return the current demo session id, creating one if absent.
 */
export function getOrCreateDemoSessionId(): string {
  try {
    let id = sessionStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // SSR or restricted env – fall back to in-memory
    return uuid();
  }
}

/**
 * Return the current demo session id, or null if none exists.
 */
export function getDemoSessionId(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Clear the demo session, ending demo mode for this tab.
 */
export function clearDemoSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
