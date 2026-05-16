import { EmployeeRow } from "./schedule";
export type Pronoun = "he" | "she" | "they";
export interface TimeOffRequest {
  date: string;
  hours: number;
  reason: string;
}
export interface CallOut {
  date: string;
  reason: string;
}
export interface EmployeeProfile {
  id: string; // EmployeeRow.id name: string; employeeCode?: string; hireDate?: string; // ISO certifications?: string; // comma-separated deptCode?: string; preferredSchedule?: string; // free text payRate?: number; email?: string; phone?: string; // protected address?: string; // protected pronoun?: Pronoun; pushToPhone?: boolean; timeOff?: TimeOffRequest[]; callOuts?: CallOut[];
}
const KEY = "shiftflow:employeeProfiles";
export function loadAllProfiles(): Record<string, EmployeeProfile> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
export function saveAllProfiles(map: Record<string, EmployeeProfile>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}
export function getProfile(
  id: string,
  fallback: { id: string; name: string },
): EmployeeProfile {
  const map = loadAllProfiles();
  if (!map[id]) {
    map[id] = {
      id: fallback.id,
      name: fallback.name,
      timeOff: [],
      callOuts: [],
    };
    saveAllProfiles(map);
  }
  return map[id];
}

// Backwards-compatible upsert:
// - upsertProfile(profile)
// - upsertProfile(id, partialProfile)
export function upsertProfile(p: EmployeeProfile): void;
export function upsertProfile(
  id: string,
  patch: Partial<EmployeeProfile>,
): void;
export function upsertProfile(a: any, b?: any) {
  const map = loadAllProfiles();
  const next: EmployeeProfile =
    typeof a === "string"
      ? {
          ...(map[a] || {
            id: a,
            name: String(b?.name || a),
            timeOff: [],
            callOuts: [],
          }),
          ...(b || {}),
        }
      : {
          ...(map[a?.id] || {
            id: a?.id,
            name: String(a?.name || ""),
            timeOff: [],
            callOuts: [],
          }),
          ...(a || {}),
        };
  if (!next?.id) return;
  map[next.id] = next;
  saveAllProfiles(map);
}
export function listProfiles(employees: EmployeeRow[]): EmployeeProfile[] {
  const map = loadAllProfiles();
  return employees.map((e) => map[e.id] || { id: e.id, name: e.name });
}
export function pushScheduleToPhone(_profile: EmployeeProfile) {
  // In a real app this would integrate with SMS/Push provider // For now, we just record intent in localStorage try { localStorage.setItem(`shiftflow:push:${_profile.id}:${Date.now()}`,"1"); } catch {}
}
export function setAdminPassword(pass: string) {
  try {
    localStorage.setItem("shiftflow:admin:pass", pass);
  } catch {}
}
export function getAdminPassword(): string | null {
  try {
    return localStorage.getItem("shiftflow:admin:pass");
  } catch {
    return null;
  }
}
