/**
 * D17d · Integration endpoints registry.
 *
 * Central map of integration-name → default base URL. Audit found
 * 107 unique HTTPS URLs hardcoded across server/services/* and
 * server/integrations/*; each adapter rolled its own. Region pivots
 * (api-us-east → api-eu-west) and staging↔prod swaps required
 * editing every adapter.
 *
 * What this is:
 *   The DEFAULT URLs LUCCCA ships with. Each adapter imports
 *   `getIntegrationBaseUrl("sysco")` instead of inlining
 *   "https://api.sysco.com/v1".
 *
 * What this is NOT:
 *   Per-tenant credentials (OAuth tokens, API keys). Those still
 *   live in the integrations layer (`integrations.ts`) and are
 *   managed by the customer's admin via OAuth flows. Different
 *   layer; different lifecycle. See D17a docstring + the
 *   "fuse box vs integrations" architectural decision.
 *
 * Override via env when you need a region pivot, staging endpoint,
 * or self-hosted gateway:
 *   LUCCCA_INTEGRATION_SYSCO_BASE_URL=https://staging.sysco.com/v1
 *   LUCCCA_INTEGRATION_ADP_BASE_URL=https://api-eu.adp.com
 *
 * Add a new integration: append a row to the table below + the
 * caller imports getIntegrationBaseUrl(name).
 */

export type IntegrationName =
  // Suppliers
  | "sysco"        | "usfoods"      | "marginedge"
  // POS
  | "toast"        | "square"       | "lightspeed"
  // Reservations
  | "opentable"    | "resy"
  // Payroll / HR
  | "adp"          | "gusto"        | "7shifts"
  // Payments
  | "stripe"
  // PMS / facilities
  | "alice"        | "ontrack"
  // Auth (SSO)
  | "google_oauth";

const DEFAULT_BASE_URLS: Record<IntegrationName, string> = {
  // Suppliers
  sysco:        "https://api.sysco.com/v1",
  usfoods:      "https://api.usfoods.com",
  marginedge:   "https://api.marginedge.com",
  // POS
  toast:        "https://api.toasttab.com",
  square:       "https://connect.squareup.com",
  lightspeed:   "https://api.lightspeedapp.com",
  // Reservations
  opentable:    "https://api.opentable.com",
  resy:         "https://api.resy.com",
  // Payroll / HR
  adp:          "https://api.adp.com",
  gusto:        "https://api.gusto.com/v2",
  "7shifts":    "https://api.7shifts.com/v2",
  // Payments
  stripe:       "https://api.stripe.com",
  // PMS / facilities
  alice:        "https://api.alice-fm.com",
  ontrack:      "https://api.ontrack.com/v1",
  // Auth
  google_oauth: "https://accounts.google.com/o/oauth2/v2/auth",
};

/**
 * Resolve a base URL for an integration, honoring env overrides.
 * The override env var name is uppercased: LUCCCA_INTEGRATION_<NAME>_BASE_URL
 * (sysco → LUCCCA_INTEGRATION_SYSCO_BASE_URL).
 *
 * Throws on unknown names so a typo at the call site fails loudly
 * instead of silently returning undefined.
 */
export function getIntegrationBaseUrl(name: IntegrationName): string {
  const envKey =
    "LUCCCA_INTEGRATION_" + name.toUpperCase().replace(/-/g, "_") + "_BASE_URL";
  const envValue = process.env[envKey];
  if (envValue && envValue.length > 0) return envValue;
  const defaultUrl = DEFAULT_BASE_URLS[name];
  if (!defaultUrl) {
    throw new Error(
      `getIntegrationBaseUrl: unknown integration "${name}". ` +
      `Add it to DEFAULT_BASE_URLS in server/integrations/endpoints.ts.`
    );
  }
  return defaultUrl;
}

/**
 * Diagnostic: dump every integration with its current resolved URL
 * (default vs env override). Used by /api/admin/fuse-box to surface
 * integration endpoints in the same panel as fuse-box wires —
 * separate sections, but one place to verify.
 */
export function dumpIntegrationEndpoints(): Array<{
  name: IntegrationName;
  url: string;
  source: "default" | "env_override";
}> {
  return (Object.keys(DEFAULT_BASE_URLS) as IntegrationName[]).map((n) => {
    const envKey =
      "LUCCCA_INTEGRATION_" + n.toUpperCase().replace(/-/g, "_") + "_BASE_URL";
    const envValue = process.env[envKey];
    return {
      name: n,
      url: envValue && envValue.length > 0 ? envValue : DEFAULT_BASE_URLS[n],
      source: envValue && envValue.length > 0 ? "env_override" : "default",
    };
  });
}
