/**
 * Scheduling integration bridge (Phase 2 starter)
 * - Consumes OS Bus labor plans and materializes shift placeholders in SchedulingStore
 * - Provides FOH/BOH-aware roles (unassigned employees by default)
 */

import { osBus } from "@/lib/os-bus";
import { useSchedulingStore } from "@/stores/shared/schedulingStore";
import { useStaffProfileStore } from "@/stores/shared/staffProfileStore";

declare global {
  interface Window {
    __schedOSBridgeInit?: boolean;
  }
}

function parseIso(iso: string): Date {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : new Date();
}

function isoDate(d: Date): string {
  try {
    return d.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function addHours(d: Date, hrs: number): Date {
  return new Date(d.getTime() + hrs * 60 * 60 * 1000);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  const a0 = aStart.getTime();
  const a1 = aEnd.getTime();
  const b0 = bStart.getTime();
  const b1 = bEnd.getTime();
  if (!Number.isFinite(a0) || !Number.isFinite(a1) || !Number.isFinite(b0) || !Number.isFinite(b1)) return false;
  return a0 < b1 && b0 < a1;
}

function availabilityKey(d: Date): string {
  const day = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()] || "mon";
  const ampm = d.getHours() < 14 ? "am" : "pm";
  return `${day}_${ampm}`;
}

function stationToRole(station: string): { role: string; side: "FOH" | "BOH" } {
  const s = String(station || "").toUpperCase();
  if (s === "BAR") return { role: "Bartender", side: "FOH" };
  if (s === "PASTRY") return { role: "Pastry Cook", side: "BOH" };
  if (s === "HOT") return { role: "Line Cook (Hot)", side: "BOH" };
  if (s === "COLD" || s === "GARDE") return { role: "Garde Manger", side: "BOH" };
  return { role: "Banquet Support", side: "FOH" };
}

function stationDefaultSkills(station: string): string[] {
  const s = String(station || "").toUpperCase();
  if (s === "BAR") return ["bar"];
  if (s === "PASTRY") return ["pastry"];
  if (s === "HOT") return ["hot-line"];
  if (s === "COLD") return ["cold-station"];
  if (s === "GARDE") return ["garde"];
  return ["banquet-service"];
}

export function initSchedulingOSBusBridge() {
  if (typeof window !== "undefined" && window.__schedOSBridgeInit) return;
  if (typeof window !== "undefined") window.__schedOSBridgeInit = true;

  osBus.on("labor:plan_generated", (payload) => {
    const planId = String(payload.planId || "");
    const beoId = String(payload.beoId || "");
    const eventDate = String(payload.eventDate || "");
    const timeRange = String(payload.eventTimeRange || "");
    const requirements = (payload as any).requirements as Array<any>;

    if (!beoId || !planId || !Array.isArray(requirements)) return;

    // Derive start/end from range when possible: "ISO → ISO"
    const parts = timeRange.split("→").map((s) => s.trim());
    const start = parseIso(parts[0] || `${eventDate}T17:00:00`);
    const end = parseIso(parts[1] || `${eventDate}T21:00:00`);

    const scheduleId = `banquet-${beoId}`;
    const store = useSchedulingStore.getState();
    const staffStore = useStaffProfileStore.getState();
    staffStore.seedIfEmpty();
    // Keep in sync with Schedule module employee profiles if present
    try {
      staffStore.syncFromShiftflow();
    } catch {
      // ignore
    }

    // Ensure schedule exists
    if (!store.getScheduleById(scheduleId)) {
      store.addSchedule({
        id: scheduleId,
        outletId: "banquets",
        weekStart: isoDate(start),
        weekEnd: isoDate(end),
        shifts: [],
        totalHours: 0,
        totalCost: 0,
        status: "draft",
        createdBy: "EchoAi",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const assignedInThisPlan = new Set<string>();

    // Create placeholder shifts (unassigned) for each station requirement.
    for (const req of requirements) {
      const station = String(req?.station || "OTHER");
      const requiredStaff = Math.max(0, Math.floor(Number(req?.requiredStaff || 0)));
      const estimatedHours = Math.max(1, Math.floor(Number(req?.estimatedHours || 2)));
      const requiredSkills: string[] = Array.isArray(req?.requiredSkills) && req.requiredSkills.length > 0 ? req.requiredSkills : stationDefaultSkills(station);
      if (requiredStaff <= 0) continue;

      const mapping = stationToRole(station);
      const shiftStart = mapping.side === "FOH" ? addHours(start, -1.5) : addHours(start, -2.5);
      const shiftEnd = addHours(shiftStart, Math.min(10, estimatedHours));
      const date = isoDate(shiftStart);
      const availKey = availabilityKey(shiftStart);

      for (let i = 0; i < requiredStaff; i++) {
        const shiftId = `${scheduleId}-${station}-${i + 1}`;

        // Attempt skill-based assignment (no invalid cross-skill placement)
        let employeeId = "unassigned";
        let employeeName = "Unassigned";

        const candidates = (staffStore.staff || [])
          .filter((p) => (p.status ?? "ACTIVE") === "ACTIVE")
          .filter((p) => (mapping.side ? p.side === mapping.side : true))
          .filter((p) => requiredSkills.every((sk) => (p.skills || []).includes(sk)))
          .filter((p) => {
            if (!p.availability) return true;
            const v = p.availability[availKey];
            return v == null ? true : Boolean(v);
          })
          .filter((p) => !assignedInThisPlan.has(p.id))
          .filter((p) => {
            // Avoid overlaps with existing shifts for that employee
            const existing = (store.shifts || []).filter((s) => s.employeeId === p.id);
            return !existing.some((s) => overlaps(shiftStart, shiftEnd, parseIso(s.startTime), parseIso(s.endTime)));
          });

        if (candidates.length > 0) {
          const pick = candidates[0];
          employeeId = pick.id;
          employeeName = pick.name;
          assignedInThisPlan.add(pick.id);
        }

        store.addShift({
          id: shiftId,
          employeeId,
          employeeName,
          role: mapping.role,
          startTime: shiftStart.toISOString(),
          endTime: shiftEnd.toISOString(),
          date,
          outletId: "banquets",
          status: "scheduled",
          notes: `Auto from labor plan ${planId} (${mapping.side}) • skills: ${requiredSkills.join(", ")}`,
        });
      }
    }
  });
}

// Auto-init
try {
  initSchedulingOSBusBridge();
} catch (err) {
  console.warn("[SchedulingOSBusBridge] init failed (non-fatal):", err);
}

