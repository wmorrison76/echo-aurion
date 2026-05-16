/**
 * Integration Authentication Service
 * Handles OAuth and credential management for Outlook, Teams, and Gmail
 * Built for safe lazy-loading with auth only triggered on demand
 */

export interface IntegrationCredential {
  service: "outlook" | "teams" | "gmail";
  token?: string;
  refreshToken?: string;
  email?: string;
  expiresAt?: number;
  isAuthenticated: boolean;
}

export interface IntegrationState {
  outlook: IntegrationCredential;
  teams: IntegrationCredential;
  gmail: IntegrationCredential;
}

const STORAGE_KEY = "luccca-integration-auth";
const DEFAULT_STATE: IntegrationState = {
  outlook: { service: "outlook", isAuthenticated: false },
  teams: { service: "teams", isAuthenticated: false },
  gmail: { service: "gmail", isAuthenticated: false },
};

export class IntegrationsAuthManager {
  /**
   * Get current auth state from localStorage
   */
  static getAuthState(): IntegrationState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return DEFAULT_STATE;
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_STATE, ...parsed };
    } catch {
      return DEFAULT_STATE;
    }
  }

  /**
   * Check if a service is authenticated
   */
  static isAuthenticated(service: "outlook" | "teams" | "gmail"): boolean {
    const state = this.getAuthState();
    return state[service]?.isAuthenticated ?? false;
  }

  /**
   * Save auth credentials (called after successful OAuth)
   */
  static saveCredential(credential: IntegrationCredential): void {
    const state = this.getAuthState();
    state[credential.service] = credential;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    window.dispatchEvent(
      new CustomEvent("integration-auth-changed", {
        detail: {
          service: credential.service,
          isAuthenticated: credential.isAuthenticated,
        },
      }),
    );
  }

  /**
   * Clear auth for a service
   */
  static clearAuth(service: "outlook" | "teams" | "gmail"): void {
    const state = this.getAuthState();
    state[service] = {
      service,
      isAuthenticated: false,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    window.dispatchEvent(
      new CustomEvent("integration-auth-changed", {
        detail: { service, isAuthenticated: false },
      }),
    );
  }

  /**
   * Get stored token for a service
   */
  static getToken(service: "outlook" | "teams" | "gmail"): string | null {
    const state = this.getAuthState();
    return state[service]?.token ?? null;
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(service: "outlook" | "teams" | "gmail"): boolean {
    const state = this.getAuthState();
    const credential = state[service];
    if (!credential?.expiresAt) return true;
    return Date.now() > credential.expiresAt;
  }

  /**
   * Initiate OAuth flow for a service
   * This is called on-demand when user clicks the service in mini panel
   */
  static initiateOAuthFlow(service: "outlook" | "teams" | "gmail"): void {
    console.log(`[Integration] Initiating ${service} OAuth flow`);

    // TODO: Implement actual OAuth flows
    // For now, dispatch event to show auth modal
    window.dispatchEvent(
      new CustomEvent("show-integration-auth", {
        detail: { service },
      }),
    );
  }

  /**
   * Complete OAuth flow (called from auth modal/popup)
   */
  static completeOAuthFlow(
    service: "outlook" | "teams" | "gmail",
    tokenData: any,
  ): void {
    const credential: IntegrationCredential = {
      service,
      token: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      email: tokenData.email,
      expiresAt: tokenData.expires_at || Date.now() + 3600000,
      isAuthenticated: true,
    };

    this.saveCredential(credential);
  }

  /**
   * Clear all integrations
   */
  static clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent("integration-auth-changed", {
        detail: { service: "all", isAuthenticated: false },
      }),
    );
  }
}
