// Helper to load/save from localStorage
export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error('Failed to parse localStorage item:', key, e);
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to write to localStorage:', key, e);
  }
}

// Subscription event registry for real-time reactivity in local storage
const listeners: Record<string, Set<() => void>> = {};

export function subscribeToKey(key: string, cb: () => void): () => void {
  if (!listeners[key]) {
    listeners[key] = new Set();
  }
  listeners[key].add(cb);
  return () => {
    listeners[key].delete(cb);
  };
}

export function notifyKey(key: string): void {
  if (listeners[key]) {
    listeners[key].forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error in subscription callback:', err);
      }
    });
  }
}
