/**
 * Custom storage adapter for Supabase Auth
 * Uses sessionStorage so sessions are cleared when the browser/tab closes
 * Falls back to in-memory storage if sessionStorage is unavailable (SSR/private mode)
 */

// In-memory fallback storage (resets on page load)
const memoryStorage: Record<string, string> = {};

/**
 * Check if sessionStorage is available
 */
function isSessionStorageAvailable(): boolean {
  try {
    const testKey = "__supabase_storage_test__";
    sessionStorage.setItem(testKey, "test");
    sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const useSessionStorage = isSessionStorageAvailable();

/**
 * Storage adapter that implements Supabase's storage interface
 * - Uses sessionStorage when available (session cleared on tab/browser close)
 * - Falls back to in-memory storage for SSR or private browsing mode
 */
export const authStorage = {
  getItem(key: string): string | null {
    if (useSessionStorage) {
      return sessionStorage.getItem(key);
    }
    return memoryStorage[key] ?? null;
  },

  setItem(key: string, value: string): void {
    if (useSessionStorage) {
      sessionStorage.setItem(key, value);
    } else {
      memoryStorage[key] = value;
    }
  },

  removeItem(key: string): void {
    if (useSessionStorage) {
      sessionStorage.removeItem(key);
    } else {
      delete memoryStorage[key];
    }
  },
};
