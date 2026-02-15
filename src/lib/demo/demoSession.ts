/**
 * Session-isolated demo: manages a per-tab demo_session_id stored in sessionStorage.
 * Each browser tab gets its own UUID so multiple demo visitors never collide.
 */

const STORAGE_KEY = "demo_session_id";
const ROLE_KEY = "demo_session_role";
const CREATED_KEY = "demo_session_created";

/** Max demo session age in ms (4 hours). After this, session is considered stale. */
const MAX_SESSION_AGE_MS = 4 * 60 * 60 * 1000;

function uuid(): string {
  return crypto.randomUUID();
}

/**
 * Check if the current demo session is stale (older than MAX_SESSION_AGE_MS).
 * Returns true if stale or no timestamp found. 
 */
export function isDemoSessionStale(): boolean {
  try {
    const created = sessionStorage.getItem(CREATED_KEY);
    if (!created) return false; // no session = not stale
    return Date.now() - Number(created) > MAX_SESSION_AGE_MS;
  } catch {
    return false;
  }
}

/**
 * Return the current demo session id, creating one if absent.
 * Clears stale sessions first.
 */
export function getOrCreateDemoSessionId(): string {
  try {
    // Clear stale sessions
    if (isDemoSessionStale()) {
      clearDemoSession();
    }
    let id = sessionStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(STORAGE_KEY, id);
      sessionStorage.setItem(CREATED_KEY, String(Date.now()));
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
    sessionStorage.removeItem(CREATED_KEY);
  } catch {
    // noop
  }
}
