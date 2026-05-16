/**
 * Per-user storage utility for supporting 100+ concurrent users
 * across multiple outlets in a resort environment
 */

export interface UserIdentity {
  id: string;
  outlet?: string;
  role?: string;
  name?: string;
}

let currentUser: UserIdentity | null = null;

/**
 * Generate a unique user ID if none exists
 * Falls back to creating a session-based ID
 */
function generateUserId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `user_${timestamp}_${random}`;
}

/**
 * Get or create current user identity
 */
export function getCurrentUser(): UserIdentity {
  if (!currentUser) {
    const saved = localStorage.getItem("current-user");
    if (saved) {
      try {
        currentUser = JSON.parse(saved);
      } catch {
        currentUser = {
          id: generateUserId(),
        };
        saveCurrentUser(currentUser);
      }
    } else {
      currentUser = {
        id: generateUserId(),
      };
      saveCurrentUser(currentUser);
    }
  }
  return currentUser;
}

/**
 * Set current user (called on login)
 */
export function setCurrentUser(user: UserIdentity): void {
  currentUser = user;
  saveCurrentUser(user);
}

/**
 * Save current user to localStorage
 */
function saveCurrentUser(user: UserIdentity): void {
  localStorage.setItem("current-user", JSON.stringify(user));
}

/**
 * Get user-specific storage key
 */
export function getUserStorageKey(key: string): string {
  const user = getCurrentUser();
  return `user_${user.id}_${key}`;
}

/**
 * Get user-specific localStorage value
 */
export function getUserLocalStorage<T>(
  key: string,
  defaultValue?: T,
): T | null {
  const userKey = getUserStorageKey(key);
  const value = localStorage.getItem(userKey);
  if (!value) return defaultValue ?? null;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue ?? null;
  }
}

/**
 * Set user-specific localStorage value
 */
export function setUserLocalStorage<T>(key: string, value: T): void {
  const userKey = getUserStorageKey(key);
  localStorage.setItem(userKey, JSON.stringify(value));
}

/**
 * Remove user-specific localStorage value
 */
export function removeUserLocalStorage(key: string): void {
  const userKey = getUserStorageKey(key);
  localStorage.removeItem(userKey);
}

/**
 * Clear all user-specific data (logout)
 */
export function clearUserData(): void {
  if (!currentUser) return;

  const userPrefix = `user_${currentUser.id}_`;
  const keys = Object.keys(localStorage).filter((k) =>
    k.startsWith(userPrefix),
  );
  keys.forEach((key) => localStorage.removeItem(key));
}

/**
 * Migrate non-user-scoped data to user-scoped
 * Useful for existing users who don't have per-user settings yet
 */
export function migrateToUserStorage(oldKey: string, newKey: string): void {
  const oldValue = localStorage.getItem(oldKey);
  if (oldValue) {
    setUserLocalStorage(newKey, JSON.parse(oldValue));
    localStorage.removeItem(oldKey);
  }
}

/**
 * Get all users that have logged in
 */
export function getAllUsers(): UserIdentity[] {
  const users = new Map<string, UserIdentity>();

  Object.keys(localStorage).forEach((key) => {
    const match = key.match(/^user_([^_]+)_(.+)$/);
    if (match) {
      const userId = match[1];
      const userData = localStorage.getItem("current-user");
      if (userData) {
        try {
          const user = JSON.parse(userData);
          if (user.id === userId) {
            users.set(userId, user);
          }
        } catch {
          // Skip invalid entries
        }
      } else {
        // Create basic user entry for unknown users
        users.set(userId, {
          id: userId,
        });
      }
    }
  });

  return Array.from(users.values());
}

/**
 * Delete a user and all their data
 */
export function deleteUser(userId: string): void {
  const userPrefix = `user_${userId}_`;
  const keys = Object.keys(localStorage).filter((k) =>
    k.startsWith(userPrefix),
  );
  keys.forEach((key) => localStorage.removeItem(key));
}

/**
 * Export user settings/data
 */
export function exportUserData(userId?: string): Record<string, any> {
  const user = userId ? { id: userId } : getCurrentUser();
  const userPrefix = `user_${user.id}_`;
  const data: Record<string, any> = {};

  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(userPrefix)) {
      const dataKey = key.replace(userPrefix, "");
      try {
        data[dataKey] = JSON.parse(localStorage.getItem(key) || "null");
      } catch {
        data[dataKey] = localStorage.getItem(key);
      }
    }
  });

  return data;
}

/**
 * Import user settings/data
 */
export function importUserData(
  data: Record<string, any>,
  userId?: string,
): void {
  const user = userId ? { id: userId } : getCurrentUser();

  Object.entries(data).forEach(([key, value]) => {
    setUserLocalStorage(key, value);
  });
}
