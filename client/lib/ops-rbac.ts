import type { OpsRole } from "@shared/types/audit";

const STORAGE_KEY = "ops:role";

export function getOpsRole(): OpsRole {
  if (typeof window === "undefined") return "Admin";

  // Prefer real auth user role if present.
  const raw = window.localStorage.getItem("auth_user");
  if (raw) {
    try {
      const parsed: any = JSON.parse(raw);
      const r = String(parsed?.role || parsed?.userRole || "").trim();
      const normalized = normalizeRole(r);
      if (normalized) return normalized;
    } catch {
      // ignore
    }
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  const normalized = normalizeRole(stored);
  return normalized ?? "Admin";
}

export function setOpsRole(role: OpsRole): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, role);
}

export function listOpsRoles(): OpsRole[] {
  return ["Admin", "Planner", "Sales", "Chef", "Sous", "Purchasing", "Receiving", "BanquetCaptain", "Staff", "Viewer"];
}

export function canToggleMenuLock(role: OpsRole): boolean {
  // Spec: chef locks menu; manager override allowed.
  return role === "Admin" || role === "Chef" || role === "Sous";
}

function normalizeRole(input: unknown): OpsRole | null {
  const s = String(input ?? "").trim();
  if (!s) return null;

  const up = s.toUpperCase();
  if (up === "ADMIN") return "Admin";
  if (up === "PLANNER") return "Planner";
  if (up === "SALES") return "Sales";
  if (up === "CHEF" || up === "EXEC_CHEF" || up === "EXECHEF") return "Chef";
  if (up === "SOUS" || up === "SOUS_CHEF" || up === "SOUSCHEF") return "Sous";
  if (up === "PURCHASING" || up === "PURCHASING_MANAGER") return "Purchasing";
  if (up === "RECEIVING" || up === "RECEIVING_MANAGER") return "Receiving";
  if (up === "BANQUET_CAPTAIN" || up === "BANQUETCAPTAIN") return "BanquetCaptain";
  if (up === "STAFF") return "Staff";
  if (up === "VIEWER" || up === "GUEST") return "Viewer";

  // If already matches our canonical values.
  const canon = s as OpsRole;
  if (listOpsRoles().includes(canon)) return canon;

  return null;
}

