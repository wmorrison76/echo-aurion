import { z } from "zod";

export type EmployeeId = string;
export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export const DAYS: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function weekdayToDayKey(jsDay: number): DayKey {
  // JS: 0=Sun..6=Sat
  switch (jsDay) {
    case 0: return "Sun";
    case 1: return "Mon";
    case 2: return "Tue";
    case 3: return "Wed";
    case 4: return "Thu";
    case 5: return "Fri";
    case 6: return "Sat";
    default: return "Mon";
  }
}

export interface TimeRange {
  start: number; // minutes from 00:00
  end: number;   // minutes from 00:00
}

export interface ShiftCell {
  value: string;        // legacy raw input, e.g. "9-5" or "09:00-17:00"
  range: TimeRange | null; // derived from value when present
  in?: string;          // explicit clock in (e.g. "9" or "09:30")
  out?: string;         // explicit clock out
  position?: string;    // job position for the day
  breakMin?: number;    // unpaid break minutes
  tip?: number;         // tips for the shift
}

export interface EmployeeRow {
  id: EmployeeId;
  name: string;
  role?: string;
  rate?: number; // hourly rate
  shifts: Record<DayKey, ShiftCell>;
}

export interface ScheduleState {
  weekStartISO: string; // Monday ISO date string
  employees: EmployeeRow[];
}

export const ScheduleSchema = z.object({
  weekStartISO: z.string(),
  employees: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string().optional(),
      rate: z.number().optional(),
      shifts: z.record(
        z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
        z.object({ value: z.string(), range: z
          .object({ start: z.number(), end: z.number() })
          .nullable() })
      )
    })
  )
});

export function createEmptyShifts(): Record<DayKey, ShiftCell> {
  return DAYS.reduce((acc, d) => {
    acc[d] = { value: "", range: null, in: "", out: "", position: "", breakMin: 0, tip: 0 };
    return acc;
  }, {} as Record<DayKey, ShiftCell>);
}

export function minutesToHours(mins: number): number {
  return Math.round((mins / 60) * 100) / 100;
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

// Parse flexible inputs like "9-5", "9a-5p", "09:30-17:15", "9am-1pm", "21-02" (overnight)
export function parseTimeRange(input: string): TimeRange | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  const parts = s.split(/-|–|—|to/);
  if (parts.length !== 2) return null;
  const a = parseTime(parts[0]);
  const b = parseTime(parts[1]);
  if (a == null || b == null) return null;
  // allow overnight shifts (end next day)
  return { start: a, end: b >= a ? b : b + 24 * 60 };
}

// Supports: 9, 9a, 9am, 9:30, 9.5, 21:15, 5p, 5pm
export function parseTime(token: string): number | null {
  let t = token.trim().toLowerCase();
  let isPM = false;
  let isAM = false;
  if (t.endsWith("am")) { isAM = true; t = t.slice(0, -2); }
  else if (t.endsWith("pm")) { isPM = true; t = t.slice(0, -2); }
  else if (t.endsWith("a")) { isAM = true; t = t.slice(0, -1); }
  else if (t.endsWith("p")) { isPM = true; t = t.slice(0, -1); }

  t = t.replace(/\./g, ":").replace(/\s+/g, "");
  let h = 0, m = 0;
  if (t.includes(":")) {
    const [hh, mm = "0"] = t.split(":");
    if (!/^\d+$/.test(hh) || !/^\d+$/.test(mm)) return null;
    h = parseInt(hh, 10);
    m = parseInt(mm, 10);
  } else if (/^\d+(?:\.\d+)?$/.test(t)) {
    // e.g. 9 or 9.5 => hours.decimal
    const n = Number(t);
    h = Math.trunc(n);
    m = Math.round((n - h) * 60);
  } else {
    return null;
  }

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  if (h < 0 || h > 29 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function hoursForRange(r: TimeRange | null): number {
  if (!r) return 0;
  const mins = r.end - r.start;
  return minutesToHours(Math.max(0, mins));
}

export function hoursForCell(c: ShiftCell): number {
  // Prefer explicit in/out when provided
  if (c.in || c.out) {
    const a = c.in ? parseTime(c.in) : null;
    const b = c.out ? parseTime(c.out) : null;
    if (a!=null && b!=null) {
      const base = hoursForRange({ start: a, end: b >= a ? b : b + 24*60 });
      const br = Math.max(0, Math.min(12*60, Number(c.breakMin ?? 0)))/60;
      return Math.max(0, base - br);
    }
  }
  return hoursForRange(c.range);
}

export function weeklyHours(row: EmployeeRow): number {
  return DAYS.reduce((sum, d) => sum + hoursForCell(row.shifts[d]), 0);
}

export function dayTotals(employees: EmployeeRow[]): Record<DayKey, number> {
  return DAYS.reduce((acc, d) => {
    acc[d] = employees.reduce((sum, e) => sum + hoursForCell(e.shifts[d]), 0);
    return acc;
  }, {} as Record<DayKey, number>);
}

export function exportCSV(state: ScheduleState): string {
  const header = ["Employee", ...DAYS, "Total Hours", "Tips"];
  const rows = state.employees.map(e => {
    const vals = DAYS.map(d => {
      const c = e.shifts[d];
      return c.in || c.out || c.value ? `${c.in ?? ""}-${c.out ?? ""}`.trim() || c.value : "";
    });
    const tips = DAYS.reduce((s,d)=> s + Number(e.shifts[d].tip ?? 0), 0);
    return [e.name, ...vals, weeklyHours(e).toFixed(2), tips.toFixed(2)];
  });
  const footer = ["Totals", ...DAYS.map(d => dayTotals(state.employees)[d].toFixed(2)), ""];
  return [header, ...rows, footer].map(r => r.map(csvEscape).join(",")).join("\n");
}

function csvEscape(x: string): string {
  if (/[",\n]/.test(x)) return '"' + x.replace(/"/g, '""') + '"';
  return x;
}

export function newEmployee(name: string, role?: string, rate?: number): EmployeeRow {
  return {
    id: cryptoRandomId(),
    name,
    role,
    rate,
    shifts: createEmptyShifts(),
  };
}

export function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as any).randomUUID();
  return Math.random().toString(36).slice(2);
}

export function startOfWeekISO(date = new Date(), startDay: number = 1): string {
  // startDay: 0=Sun .. 6=Sat
  const d = new Date(date);
  const diff = (d.getDay() - startDay + 7) % 7; // how many days since start day
  d.setDate(d.getDate() - diff);
  d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}

const STORAGE_KEY_BASE = "shiftflow:schedule";
function storageKey(){ try{ return `${STORAGE_KEY_BASE}:${localStorage.getItem('shiftflow:outlet')||'Main'}`; }catch{ return STORAGE_KEY_BASE; } }

export function loadSchedule(): ScheduleState | null {
  try {
    const s = localStorage.getItem(storageKey());
    if (!s) return null;
    const parsed = JSON.parse(s);
    const res = ScheduleSchema.safeParse(parsed);
    return res.success ? (res.data as ScheduleState) : null;
  } catch {
    return null;
  }
}

export function saveSchedule(state: ScheduleState) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(state));
  } catch {}
}
