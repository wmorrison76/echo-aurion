/**
 * EchoAi³ Security Wiring
 * -----------------------
 * Provides a central place to attach auth tokens, environment flags,
 * and per-module access control that EchoAi³ should respect.
 */

let securityContext = {
  environment: "unknown",
  getAccessToken: null,
  currentUser: null,
  roles: [],
  modulePermissions: {},
};

export function configureSecurity(options = {}) {
  securityContext = {
    ...securityContext,
    ...options,
  };
}

export function getSecurityContext() {
  return { ...securityContext };
}

export async function withAuthHeaders(headers = {}) {
  const ctx = getSecurityContext();
  const final = { ...headers };

  if (typeof ctx.getAccessToken === "function") {
    const token = await ctx.getAccessToken();
    if (token) {
      final.Authorization = `Bearer ${token}`;
    }
  }

  return final;
}

/**
 * Check if user can access a module
 */
export function canAccessModule(moduleName) {
  const ctx = getSecurityContext();
  const permissions = ctx.modulePermissions || {};
  return permissions[moduleName] !== false;
}

/**
 * Check if user has a specific role
 */
export function hasRole(role) {
  const ctx = getSecurityContext();
  return ctx.roles && ctx.roles.includes(role);
}

/**
 * R&D-specific: Check if user can modify recipes (experimental changes)
 */
export function canModifyRecipes() {
  return hasRole("chef") || hasRole("rd-chef") || hasRole("admin");
}

/**
 * R&D-specific: Check if user can access allergen data
 */
export function canAccessAllergenData() {
  return hasRole("chef") || hasRole("safety-officer") || hasRole("admin");
}

/**
 * R&D-specific: Check if user can forecast/predict
 */
export function canUsePredictions() {
  return hasRole("chef") || hasRole("manager") || hasRole("admin");
}
