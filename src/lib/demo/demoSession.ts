/**
 * Session-isolated demo: manages a per-tab demo_session_id stored in sessionStorage.
 * Each browser tab gets its own UUID so multiple demo visitors never collide.
 */

const STORAGE_KEY = "demo_session_id";
const ROLE_KEY = "demo_session_role";

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
 * Persist the demo role so it survives page reloads within the same tab.
 */
export function setDemoRole(role: string): void {
  try {
    sessionStorage.setItem(ROLE_KEY, role);
  } catch {
    // noop
  }
}

/**
 * Retrieve the persisted demo role, defaulting to "employer".
 */
export function getDemoRole(): string {
  try {
    return sessionStorage.getItem(ROLE_KEY) || "employer";
  } catch {
    return "employer";
  }
}

/**
 * Clear the demo session, ending demo mode for this tab.
 */
export function clearDemoSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(ROLE_KEY);
  } catch {
    // noop
  }
}
