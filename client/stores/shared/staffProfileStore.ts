/**
 * Shared Staff Profile Store (skills + availability)
 * --------------------------------------------------
 * Used by Phase 2 routing to generate schedules that respect:
 * - skill matching (e.g. no saucier assigned to butchering)
 * - basic availability
 *
 * This is intentionally lightweight + client-side (localStorage) for now.
 * It can later be hydrated from Schedule/HR services (Supabase) without changing consumers.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type StaffSide = "FOH" | "BOH";

export type StaffProfile = {
  id: string;
  name: string;
  side: StaffSide;
  outletId?: string; // e.g. "banquets"
  roleTitle?: string; // display role (Server, Saucier, Butcher, etc)
  skills: string[]; // canonical slugs used for matching
  certifications?: string[];

  /**
   * Availability key format (v1):
   * - "mon_am" | "mon_pm" ... "sun_am" | "sun_pm"
   * If omitted, treated as available.
   */
  availability?: Record<string, boolean>;
  status?: "ACTIVE" | "INACTIVE";
};

type State = {
  staff: StaffProfile[];
  upsertStaff: (profile: StaffProfile) => void;
  removeStaff: (id: string) => void;
  setStaff: (staff: StaffProfile[]) => void;
  syncFromShiftflow: () => void;
  seedIfEmpty: () => void;
};

type ShiftflowEmployeeProfile = {
  id: string;
  name: string;
  certifications?: string[] | string;
  deptCode?: string;
  preferredSchedule?: string;
  payRate?: number;
};

type ShiftflowScheduleState = {
  weekStartISO?: string;
  employees?: Array<{ id: string; name: string; role?: string }>;
};

function roleToSide(role: string | undefined): StaffSide {
  const r = String(role || "").toLowerCase();
  if (/\b(chef|cook|saucier|butcher|pastry|garde|kitchen|boh)\b/.test(r)) return "BOH";
  return "FOH";
}

function roleToSkills(role: string | undefined): string[] {
  const r = String(role || "").toLowerCase();
  const out = new Set<string>();

  if (r.includes("bartend")) out.add("bar");
  if (r.includes("pastry")) out.add("pastry");
  if (r.includes("garde")) out.add("garde");
  if (r.includes("cold")) out.add("cold-station");
  if (r.includes("hot")) out.add("hot-line");
  if (r.includes("butcher")) out.add("butchering");
  if (r.includes("saucier") || r.includes("sauce")) out.add("saucier");
  if (r.includes("captain")) out.add("banquet-captain");
  if (r.includes("steward")) out.add("stewarding");

  // FOH baseline
  if (roleToSide(role) === "FOH") out.add("banquet-service");

  // BOH baseline
  if (roleToSide(role) === "BOH" && !out.has("hot-line") && !out.has("cold-station") && !out.has("pastry")) {
    out.add("hot-line");
  }

  return Array.from(out);
}

function readShiftflowProfiles(): Record<string, ShiftflowEmployeeProfile> {
  try {
    const raw = localStorage.getItem("shiftflow:employeeProfiles");
    const map = raw ? JSON.parse(raw) : {};
    return map && typeof map === "object" ? (map as any) : {};
  } catch {
    return {};
  }
}

function readShiftflowBestSchedule(): ShiftflowScheduleState | null {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("shiftflow:schedule:")) keys.push(k);
    }
    if (keys.length === 0) return null;
    // Pick latest week key lexicographically (YYYY-MM-DD sorts correctly)
    keys.sort();
    const k = keys[keys.length - 1];
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ShiftflowScheduleState;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

const DEFAULT_STAFF: StaffProfile[] = [
  { id: "boh-1", name: "Chef A (Butcher)", side: "BOH", outletId: "banquets", roleTitle: "Butcher", skills: ["butchering", "hot-line"] },
  { id: "boh-2", name: "Chef B (Saucier)", side: "BOH", outletId: "banquets", roleTitle: "Saucier", skills: ["saucier", "hot-line"] },
  { id: "boh-3", name: "Chef C (Garde)", side: "BOH", outletId: "banquets", roleTitle: "Garde Manger", skills: ["garde", "cold-station"] },
  { id: "boh-4", name: "Chef D (Pastry)", side: "BOH", outletId: "banquets", roleTitle: "Pastry Cook", skills: ["pastry"] },
  { id: "foh-1", name: "Captain (FOH)", side: "FOH", outletId: "banquets", roleTitle: "Banquet Captain", skills: ["banquet-captain", "banquet-service"] },
  { id: "foh-2", name: "Server 1", side: "FOH", outletId: "banquets", roleTitle: "Server", skills: ["banquet-service"] },
  { id: "foh-3", name: "Bartender 1", side: "FOH", outletId: "banquets", roleTitle: "Bartender", skills: ["bar"] },
  { id: "foh-4", name: "Steward 1", side: "FOH", outletId: "banquets", roleTitle: "Steward", skills: ["stewarding"] },
];

export const useStaffProfileStore = create<State>()(
  devtools(
    persist(
      (set, get) => ({
        staff: [],
        setStaff: (staff) => set({ staff }),
        upsertStaff: (profile) =>
          set((state) => {
            const idx = state.staff.findIndex((s) => s.id === profile.id);
            if (idx === -1) return { staff: [...state.staff, profile] };
            const next = state.staff.slice();
            next[idx] = profile;
            return { staff: next };
          }),
        removeStaff: (id) => set((state) => ({ staff: state.staff.filter((s) => s.id !== id) })),
        syncFromShiftflow: () => {
          if (typeof window === "undefined") return;
          const schedule = readShiftflowBestSchedule();
          const profiles = readShiftflowProfiles();
          const existing = get().staff || [];

          const byId = new Map(existing.map((s) => [s.id, s] as const));

          const emps = schedule?.employees || [];
          for (const e of emps) {
            const id = String(e.id || "").trim();
            if (!id) continue;
            const prof = profiles[id];
            const role = e.role || (byId.get(id)?.roleTitle ?? "");
            const current = byId.get(id);
            const certs =
              Array.isArray((prof as any)?.certifications)
                ? ((prof as any).certifications as string[])
                : typeof (prof as any)?.certifications === "string"
                  ? String((prof as any).certifications)
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean)
                  : current?.certifications;
            const merged: StaffProfile = {
              id,
              name: String(e.name || prof?.name || current?.name || id),
              side: current?.side ?? roleToSide(role),
              outletId: current?.outletId ?? "banquets",
              roleTitle: String(role || current?.roleTitle || ""),
              skills: current?.skills?.length ? current.skills : roleToSkills(role),
              certifications: certs,
              availability: current?.availability,
              status: current?.status ?? "ACTIVE",
            };
            byId.set(id, merged);
          }

          // If we have shiftflow profiles but no schedules yet, still create entries.
          if (emps.length === 0) {
            for (const [id, prof] of Object.entries(profiles)) {
              const current = byId.get(id);
              if (current) continue;
              byId.set(id, {
                id,
                name: String((prof as any)?.name || id),
                side: roleToSide((prof as any)?.deptCode),
                outletId: "banquets",
                roleTitle: String((prof as any)?.deptCode || ""),
                skills: [],
                certifications: Array.isArray((prof as any)?.certifications)
                  ? ((prof as any).certifications as string[])
                  : typeof (prof as any)?.certifications === "string"
                    ? String((prof as any).certifications)
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean)
                    : undefined,
                status: "ACTIVE",
              });
            }
          }

          set({ staff: Array.from(byId.values()) });
        },
        seedIfEmpty: () => {
          // Prefer real profiles from Shiftflow/Schedule if present.
          try {
            get().syncFromShiftflow();
          } catch {
            // ignore
          }
          const cur = get().staff;
          if (cur && cur.length > 0) return;
          set({ staff: DEFAULT_STAFF });
        },
      }),
      { name: "luccca.staffProfiles.v1" },
    ),
    { name: "StaffProfileStore" },
  ),
);

