/**
 * Custom auth storage adapter for Supabase client.
 * Uses sessionStorage so sessions expire when the browser tab/window closes.
 * Falls back to in-memory storage if sessionStorage is unavailable.
 */

// In-memory fallback for restricted environments
const memoryStore = new Map<string, string>();

const isSessionStorageAvailable = (): boolean => {
  try {
    const testKey = '__supabase_storage_test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const useSessionStorage = isSessionStorageAvailable();

export const authStorage = {
  getItem: (key: string): string | null => {
    if (useSessionStorage) {
      return sessionStorage.getItem(key);
    }
    return memoryStore.get(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    if (useSessionStorage) {
      sessionStorage.setItem(key, value);
    } else {
      memoryStore.set(key, value);
    }
  },
  removeItem: (key: string): void => {
    if (useSessionStorage) {
      sessionStorage.removeItem(key);
    } else {
      memoryStore.delete(key);
    }
  },
};
