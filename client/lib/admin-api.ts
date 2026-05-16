/**
 * D11c · Admin API client — typed wrappers for the admin endpoints
 * shipped in D11b (custom roles) and admin_onboarding.py (users).
 *
 * Used by:
 *   RoleBuilderPanel.tsx    → createCustomRole()
 *   UserManagementPanel.tsx → createUser() (follow-up)
 */

export interface CustomRolePayload {
  role: string;
  label: string;
  tier: "admin" | "enterprise" | "property" | "dept-head" |
        "enterprise-desktop" | "mobile";
  depts: string[];
  extras?: string[];
  landing_panel?: string;
  description?: string;
}

export interface CustomRoleResponse {
  ok: boolean;
  role: CustomRolePayload & {
    tenant_id: string;
    created_at: string;
    updated_at: string;
    source: "custom";
  };
  effective_modules: string[];
}

const ADMIN_HEADERS = (tenantId?: string): HeadersInit => {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (tenantId) h["X-Tenant-Id"] = tenantId;
  // The admin token is set in env on the server side; the client adds
  // it via a session cookie or the integration script — not hardcoded
  // here. Empty header is fine when the server doesn't enforce one.
  return h;
};

/** Map the RoleBuilderPanel "level" select (0–5) to the access_matrix tier. */
export function levelToTier(level: number): CustomRolePayload["tier"] {
  if (level >= 5) return "admin";
  if (level >= 4) return "property";
  if (level >= 3) return "dept-head";
  if (level >= 1) return "enterprise-desktop";
  return "mobile";
}

/** Convert a human label like "Pastry" to the access_matrix dept key
 *  ("pastry"). Falls through to the lowercased label so a UI that
 *  drops in new departments doesn't silently break — the backend will
 *  reject unknown depts with a 400 the user can act on. */
export function deptLabelToKey(label: string): string {
  const map: Record<string, string> = {
    "Culinary":   "culinary",
    "Pastry":     "pastry",
    "Banquets":   "banquets",
    "FOH":        "foh_service",
    "Engineering":"engineering",
    "Finance":    "finance",
    "Events":     "events",
    "Beverage":   "beverage",
    "Rooms":      "rooms",
    "Spa":        "spa",
    "Purchasing": "purchasing",
    "HR":         "hr",
  };
  return map[label] ?? label.toLowerCase();
}

/** Convert a freeform role name to a slug accepted by the backend's
 *  pattern (`^[a-z0-9][a-z0-9._-]*$`). */
export function roleNameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[^a-z0-9]+/, "");
}

export async function createCustomRole(
  payload: CustomRolePayload,
  tenantId?: string,
): Promise<CustomRoleResponse> {
  const res = await fetch("/api/admin/roles", {
    method: "POST",
    headers: ADMIN_HEADERS(tenantId),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`createCustomRole failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function listAdminRoles(tenantId?: string): Promise<{
  ok: boolean;
  internal: Array<{ role: string; label: string; tier: string }>;
  custom: Array<CustomRolePayload & { tenant_id: string }>;
  available_depts: string[];
  available_tiers: string[];
}> {
  const res = await fetch("/api/admin/roles", {
    method: "GET",
    headers: ADMIN_HEADERS(tenantId),
  });
  if (!res.ok) {
    throw new Error(`listAdminRoles failed (${res.status})`);
  }
  return res.json();
}

export async function deleteCustomRole(role: string, tenantId?: string) {
  const res = await fetch(`/api/admin/roles/${encodeURIComponent(role)}`, {
    method: "DELETE",
    headers: ADMIN_HEADERS(tenantId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`deleteCustomRole failed (${res.status}): ${text}`);
  }
  return res.json();
}
