/**
 * LUCCCA Integration Module
 * Bridges Cake Designer with LUCCCA Framework authentication and context
 * 
 * Responsibilities:
 * - User authentication context
 * - Bakery information
 * - Configuration management
 * - Global context access
 */

import type { ChefUser, LUCCCAContext } from "../../shared/types";

/**
 * Global LUCCCA context - stores authenticated user and bakery info
 */
let currentLUCCCAContext: LUCCCAContext | null = null;

/**
 * Initialize LUCCCA context on module load
 * Called when Cake Designer loads within LUCCCA
 */
export function initializeLUCCCAContext(context: LUCCCAContext): void {
  if (!context.user || !context.bakery) {
    console.error("Invalid LUCCCA context provided", context);
    throw new Error("LUCCCA context must include user and bakery information");
  }

  currentLUCCCAContext = context;

  // Log initialization in development
  if (process.env.NODE_ENV === "development") {
    console.log("LUCCCA Context Initialized", {
      userId: context.user.id,
      bakery: context.bakery.name,
      role: context.user.role,
    });
  }

  // Store context in sessionStorage as backup
  sessionStorage.setItem("luccca-context", JSON.stringify(context));
}

/**
 * Get current LUCCCA context
 * @throws {Error} If context not initialized
 */
export function getLUCCCAContext(): LUCCCAContext {
  if (!currentLUCCCAContext) {
    // Try to restore from sessionStorage
    const stored = sessionStorage.getItem("luccca-context");
    if (stored) {
      try {
        currentLUCCCAContext = JSON.parse(stored);
        return currentLUCCCAContext;
      } catch (error) {
        console.error("Failed to restore LUCCCA context from storage", error);
      }
    }

    throw new Error(
      "LUCCCA context not initialized. Ensure Cake Designer is loaded from LUCCCA framework."
    );
  }

  return currentLUCCCAContext;
}

/**
 * Get current authenticated user
 * @throws {Error} If context not initialized
 */
export function getLUCCCAUser(): ChefUser {
  return getLUCCCAContext().user;
}

/**
 * Get current bakery information
 * @throws {Error} If context not initialized
 */
export function getBakeryInfo() {
  return getLUCCCAContext().bakery;
}

/**
 * Get bakery ID for scoping database queries
 * @throws {Error} If context not initialized
 */
export function getBakeryId(): string {
  return getLUCCCAContext().bakery.id;
}

/**
 * Get API base URL for server requests
 * @throws {Error} If context not initialized
 */
export function getApiBaseUrl(): string {
  return getLUCCCAContext().config.apiBaseUrl;
}

/**
 * Get WebSocket URL for real-time collaboration
 * Falls back to computed URL if not provided
 * @throws {Error} If context not initialized
 */
export function getWebSocketUrl(): string {
  const context = getLUCCCAContext();

  if (context.config.wsUrl) {
    return context.config.wsUrl;
  }

  if (context.config.socketUrl) {
    return context.config.socketUrl;
  }

  // Compute from window location
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
}

/**
 * Check if user has specific permission
 * @param permission Permission to check
 * @returns {boolean} Whether user has permission
 */
export function hasPermission(
  permission:
    | "canDesign"
    | "canGenerate"
    | "canShare"
    | "canModifyTemplates"
    | "canManageUsers"
): boolean {
  try {
    const user = getLUCCCAUser();
    return user.permissions[permission] ?? false;
  } catch {
    return false;
  }
}

/**
 * Check if user has specific role
 * @param role Role to check
 * @returns {boolean} Whether user has role
 */
export function hasRole(
  role: "head-chef" | "pastry-chef" | "decorator" | "viewer" | "admin"
): boolean {
  try {
    const user = getLUCCCAUser();
    return user.role === role;
  } catch {
    return false;
  }
}

/**
 * Check if user is admin
 */
export function isAdmin(): boolean {
  return hasRole("admin");
}

/**
 * Check if user is head chef
 */
export function isHeadChef(): boolean {
  return hasRole("head-chef");
}

/**
 * Check if user can design cakes
 */
export function canDesign(): boolean {
  return hasPermission("canDesign");
}

/**
 * Check if user can generate with AI
 */
export function canGenerate(): boolean {
  return hasPermission("canGenerate");
}

/**
 * Check if user can share designs
 */
export function canShare(): boolean {
  return hasPermission("canShare");
}

/**
 * Get user display name
 */
export function getUserDisplayName(): string {
  try {
    return getLUCCCAUser().name;
  } catch {
    return "Unknown User";
  }
}

/**
 * Get user ID (scoped to LUCCCA)
 */
export function getUserId(): string {
  try {
    return getLUCCCAUser().id;
  } catch {
    return "";
  }
}

/**
 * Get user avatar URL if available
 */
export function getUserAvatarUrl(): string | undefined {
  try {
    return getLUCCCAUser().avatar;
  } catch {
    return undefined;
  }
}

/**
 * Generate unique color for user cursors
 * Deterministic based on user ID
 */
export function getUserCursorColor(): string {
  const colors = [
    "#FF6B6B", // Red
    "#4ECDC4", // Teal
    "#45B7D1", // Blue
    "#FFA07A", // Light Salmon
    "#98D8C8", // Mint
    "#F7DC6F", // Yellow
    "#BB8FCE", // Purple
    "#85C1E2", // Light Blue
  ];

  try {
    const userId = getUserId();
    const hash = userId
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  } catch {
    return colors[0];
  }
}

/**
 * Verify LUCCCA context is valid and initialized
 */
export function isContextInitialized(): boolean {
  try {
    getLUCCCAContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Build headers for API requests with LUCCCA context
 * Includes user ID, bakery ID, and other metadata
 */
export function getLUCCCAHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-User-Id": getUserId(),
    "X-Bakery-Id": getBakeryId(),
    "X-User-Name": getUserDisplayName(),
  };

  return headers;
}

/**
 * Create a new LUCCCA context (for testing/development)
 * Use initializeLUCCCAContext() in production
 */
export function createTestContext(
  userId: string = "test-user",
  bakeryId: string = "test-bakery",
  userName: string = "Test Chef"
): LUCCCAContext {
  return {
    user: {
      id: userId,
      name: userName,
      role: "pastry-chef",
      bakery: bakeryId,
      email: `${userName.toLowerCase()}@bakery.local`,
      permissions: {
        canDesign: true,
        canGenerate: true,
        canShare: true,
        canModifyTemplates: true,
        canManageUsers: false,
      },
    },
    bakery: {
      id: bakeryId,
      name: "Test Bakery Resort",
      location: "Test Location",
    },
    config: {
      apiBaseUrl: "/api",
      wsUrl: `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`,
    },
  };
}

/**
 * Export context initialization hook for React components
 */
export function useLUCCCAContext() {
  return {
    context: () => getLUCCCAContext(),
    user: () => getLUCCCAUser(),
    bakery: () => getBakeryInfo(),
    bakeryId: () => getBakeryId(),
    userId: () => getUserId(),
    userName: () => getUserDisplayName(),
    hasPermission,
    hasRole,
    isAdmin,
    isHeadChef,
    canDesign,
    canGenerate,
    canShare,
  };
}

// Auto-initialize from window object if available
// LUCCCA should call initializeLUCCCAContext() on module load
if (typeof window !== "undefined" && (window as any).__LUCCCA_CONTEXT__) {
  initializeLUCCCAContext((window as any).__LUCCCA_CONTEXT__);
}
