/** * autoScheduler.ts * Deterministic min-cost coverage with constraints: * - interval demand (headcount needed) * - staff pool with availability, skills, max hours, cost * - shift min/max length, rest periods, contract caps * Produces: Shift assignments with reason codes. */
import { addMinutes, differenceInMinutes, isBefore } from "date-fns";
export type Interval = 15 | 30;
export interface Staff {
  id: string;
  name: string;
  hourly_rate: number;
  skills: string[]; // e.g., ['server.t1','banquet.t2','pastry.dec'] availability: Array<{ start: string; end: string }>; // ISO range(s) max_week_hours: number; assigned_minutes?: number;
}
export interface DemandPoint {
  ts: string; // ISO required: number; // headcount needed skill_tag?: string; // optional position requirement
}
export interface Shift {
  employee_id: string;
  start: string; // ISO end: string; // ISO position_tag?: string; minutes: number; reason: string; //"COVERAGE" |"FILL_GAP" |"AI_ADJUST"
}
export interface Constraints {
  min_shift_minutes: number; // e.g., 180 max_shift_minutes: number; // e.g., 540 rest_minutes: number; // e.g., 600 (10h) contract_week_cap?: number; // overrides per-employee max if set
}
export interface AutoScheduleParams {
  interval: Interval;
  demand: DemandPoint[];
  staff: Staff[];
  constraints: Constraints;
  target_cost?: number; // optional budget strict?: boolean; // if true, ensure coverage; else best-effort
}
export interface AutoScheduleResult {
  shifts: Shift[];
  coverage_fill_pct: number; // % intervals fully covered total_cost: number; notes: string[];
}
function isAvailable(emp: Staff, startISO: string, endISO: string) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  return emp.availability.some((w) => {
    const ws = new Date(w.start);
    const we = new Date(w.end);
    return !(isBefore(we, s) || isBefore(e, ws));
  });
}
export function generateSchedule(p: AutoScheduleParams): AutoScheduleResult {
  const { demand, staff, constraints, interval } = p;
  const step = interval;
  const active: Record<string, Shift | undefined> = {};
  const shifts: Shift[] = [];
  const assignedMin: Record<string, number> = {};
  const demandMet: number[] = new Array(demand.length).fill(0);
  const notes: string[] = [];
  const choose = (index: number, tag?: string): Staff | null => {
    const t = demand[index].ts;
    const nextT = addMinutes(new Date(t), step).toISOString();
    const eligible = staff
      .filter((emp) => {
        if (tag && !emp.skills.includes(tag)) return false;
        const cap = p.constraints.contract_week_cap ?? emp.max_week_hours;
        const used = assignedMin[emp.id] || 0;
        if (used >= cap * 60) return false;
        if (!isAvailable(emp, t, nextT)) return false;
        const last = shifts
          .filter((s) => s.employee_id === emp.id)
          .slice(-1)[0];
        if (last) {
          const rest = differenceInMinutes(new Date(t), new Date(last.end));
          if (rest < constraints.rest_minutes) return false;
        }
        return true;
      })
      .sort((a, b) => a.hourly_rate - b.hourly_rate);
    return eligible[0] || null;
  };
  for (let i = 0; i < demand.length; i++) {
    const need = Math.max(0, demand[i].required - demandMet[i]);
    for (let k = 0; k < need; k++) {
      const emp = choose(i, demand[i].skill_tag);
      if (!emp) {
        if (p.strict) notes.push(`Unfilled at ${demand[i].ts}`);
        continue;
      }
      const key = `${emp.id}`;
      const t = demand[i].ts;
      const nextT = addMinutes(new Date(t), step).toISOString();
      if (active[key] && active[key]!.end === t) {
        active[key]!.end = nextT;
        active[key]!.minutes += step;
        active[key]!.reason = "COVERAGE";
      } else {
        active[key] = {
          employee_id: emp.id,
          start: t,
          end: nextT,
          position_tag: demand[i].skill_tag,
          minutes: step,
          reason: "COVERAGE",
        };
      }
      demandMet[i] += 1;
    }
    Object.keys(active).forEach((k) => {
      const sh = active[k]!;
      const nextTs = i < demand.length - 1 ? demand[i + 1].ts : null;
      const canExtend = !!nextTs && sh.end === nextTs;
      if (!canExtend || i === demand.length - 1) {
        if (sh.minutes > constraints.max_shift_minutes) {
          sh.end = addMinutes(
            new Date(sh.start),
            constraints.max_shift_minutes,
          ).toISOString();
          sh.minutes = constraints.max_shift_minutes;
        }
        if (sh.minutes < constraints.min_shift_minutes && p.strict) {
          const idxStart = demand.findIndex((d) => d.ts === sh.start);
          const blocks = Math.round(sh.minutes / step);
          for (let b = 0; b < blocks; b++) {
            const idx = idxStart + b;
            if (idx >= 0 && idx < demandMet.length) {
              demandMet[idx] = Math.max(0, demandMet[idx] - 1);
            }
          }
          active[k] = undefined;
        } else {
          shifts.push(sh);
          assignedMin[sh.employee_id] =
            (assignedMin[sh.employee_id] || 0) + sh.minutes;
          active[k] = undefined;
        }
      }
    });
  }
  let coveredIntervals = 0;
  const totalIntervals = demand.length;
  for (let i = 0; i < demand.length; i++) {
    if (demandMet[i] >= demand[i].required) coveredIntervals++;
  }
  const total_cost = shifts.reduce((s, sh) => {
    const emp = staff.find((e) => e.id === sh.employee_id)!;
    return s + emp.hourly_rate * (sh.minutes / 60);
  }, 0);
  return {
    shifts,
    coverage_fill_pct: totalIntervals
      ? (coveredIntervals / totalIntervals) * 100
      : 100,
    total_cost,
    notes,
  };
}
