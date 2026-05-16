import { AuthSession } from "./auth-service";

const SESSION_STORAGE_KEY = "auth_session";
const SESSION_EXPIRY_THRESHOLD = 5 * 60 * 1000; // 5 minutes

/**
 * Save session to local storage
 */
export function saveSession(session: AuthSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error("Failed to save session:", error);
  }
}

/**
 * Retrieve session from local storage
 */
export function getStoredSession(): AuthSession | null {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to retrieve session:", error);
    return null;
  }
}

/**
 * Clear session from local storage
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear session:", error);
  }
}

/**
 * Check if session is expired or about to expire
 */
export function isSessionExpired(session: AuthSession | null): boolean {
  if (!session) return true;

  const expiresAt = session.expires_at;
  const now = Date.now();

  return now >= expiresAt;
}

/**
 * Check if session needs refresh (approaching expiry)
 */
export function shouldRefreshSession(session: AuthSession | null): boolean {
  if (!session) return true;

  const expiresAt = session.expires_at;
  const now = Date.now();
  const timeUntilExpiry = expiresAt - now;

  return timeUntilExpiry < SESSION_EXPIRY_THRESHOLD;
}

/**
 * Setup automatic session cleanup on window unload
 */
export function setupSessionCleanup(onSessionExpired?: () => void): () => void {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      const session = getStoredSession();
      if (isSessionExpired(session)) {
        clearSession();
        onSessionExpired?.();
      }
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

/**
 * Get session expiry time in milliseconds from now
 */
export function getSessionExpiryTime(session: AuthSession | null): number {
  if (!session) return -1;

  return session.expires_at - Date.now();
}

/**
 * Format session expiry time as human readable string
 */
export function formatSessionExpiryTime(session: AuthSession | null): string {
  const timeUntilExpiry = getSessionExpiryTime(session);

  if (timeUntilExpiry < 0) return "Expired";

  const minutes = Math.floor(((timeUntilExpiry / 1000) % 3600) / 60);
  const seconds = Math.floor((timeUntilExpiry / 1000) % 60);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Setup heartbeat to monitor session health
 */
export function setupSessionHeartbeat(
  onSessionHealthChange?: (isHealthy: boolean) => void,
  interval: number = 60000, // 1 minute
): () => void {
  let isHealthy = true;

  const heartbeat = setInterval(() => {
    const session = getStoredSession();
    const sessionIsHealthy = !isSessionExpired(session);

    if (sessionIsHealthy !== isHealthy) {
      isHealthy = sessionIsHealthy;
      onSessionHealthChange?.(isHealthy);
    }
  }, interval);

  return () => {
    clearInterval(heartbeat);
  };
}

/**
 * Get remaining session time as percentage
 */
export function getSessionHealthPercentage(
  session: AuthSession | null,
): number {
  if (!session) return 0;

  const initialDuration =
    session.expires_at - (session.access_token ? Date.now() : 0);
  const remaining = getSessionExpiryTime(session);

  if (initialDuration <= 0) return 0;

  return Math.max(0, Math.min(100, (remaining / initialDuration) * 100));
}

/**
 * Check if token needs urgent refresh (less than 1 minute remaining)
 */
export function isTokenUrgent(session: AuthSession | null): boolean {
  const remaining = getSessionExpiryTime(session);
  return remaining > 0 && remaining < 60000; // Less than 1 minute
}
