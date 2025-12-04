/**
 * Safe localStorage utilities with error handling
 */

export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`Failed to read from localStorage (key: ${key}):`, e);
    return null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`Failed to write to localStorage (key: ${key}):`, e);
    return false;
  }
}

export function safeRemoveItem(key: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.warn(`Failed to remove from localStorage (key: ${key}):`, e);
    return false;
  }
}

export function safeClear(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.clear();
    return true;
  } catch (e) {
    console.warn('Failed to clear localStorage:', e);
    return false;
  }
}
