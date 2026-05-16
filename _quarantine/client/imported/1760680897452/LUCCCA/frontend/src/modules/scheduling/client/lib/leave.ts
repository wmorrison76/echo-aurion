import type { DayKey } from "@/lib/schedule";

export interface LeaveRecord {
  pto: number;
  sick: number;
}
export type LeaveType = "pto" | "sick";
export type LeaveStatus = "pending" | "approved" | "denied";
export interface LeaveRequest {
  type: LeaveType;
  hours: number;
  status: LeaveStatus;
  reason?: string;
}

const KEY = "shiftflow:leave";
const REQ_KEY = "shiftflow:leave:req";

type Store = Record<string, LeaveRecord>; // key = `${empId}:${weekISO}:${day}`

function loadAll(): Store {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}
function saveAll(map: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}

function loadReq(): Record<string, LeaveRequest> {
  try {
    const s = localStorage.getItem(REQ_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}
function saveReq(map: Record<string, LeaveRequest>) {
  try {
    localStorage.setItem(REQ_KEY, JSON.stringify(map));
  } catch {}
}

function k(empId: string, weekISO: string, day: DayKey) {
  return `${empId}:${weekISO}:${day}`;
}

// Legacy numeric storage (kept for compatibility)
export function getLeaveDay(
  empId: string,
  weekISO: string,
  day: DayKey,
): LeaveRecord {
  const all = loadAll();
  return all[k(empId, weekISO, day)] || { pto: 0, sick: 0 };
}
export function setLeaveDay(
  empId: string,
  weekISO: string,
  day: DayKey,
  rec: LeaveRecord,
) {
  const all = loadAll();
  all[k(empId, weekISO, day)] = {
    pto: Math.max(0, rec.pto || 0),
    sick: Math.max(0, rec.sick || 0),
  };
  saveAll(all);
}

// Request workflow
export function getLeaveRequestDay(
  empId: string,
  weekISO: string,
  day: DayKey,
): LeaveRequest | null {
  const r = loadReq()[k(empId, weekISO, day)];
  return r || null;
}
export function setLeaveRequestDay(
  empId: string,
  weekISO: string,
  day: DayKey,
  req: LeaveRequest,
) {
  const all = loadReq();
  all[k(empId, weekISO, day)] = req;
  saveReq(all);
}
export function setLeaveStatus(
  empId: string,
  weekISO: string,
  day: DayKey,
  status: LeaveStatus,
  reason?: string,
) {
  const all = loadReq();
  const id = k(empId, weekISO, day);
  const cur = all[id];
  if (!cur) return;
  all[id] = { ...cur, status, reason };
  saveReq(all);
}

export function getApprovedLeaveDay(
  empId: string,
  weekISO: string,
  day: DayKey,
): LeaveRecord {
  const req = getLeaveRequestDay(empId, weekISO, day);
  return req && req.status === "approved"
    ? {
        pto: req.type === "pto" ? req.hours : 0,
        sick: req.type === "sick" ? req.hours : 0,
      }
    : { pto: 0, sick: 0 };
}

export function getLeave(empId: string, weekISO: string): LeaveRecord {
  const prefix = `${empId}:${weekISO}:`;
  const reqs = loadReq();
  const sum = { pto: 0, sick: 0 };
  for (const [id, r] of Object.entries(reqs)) {
    if (id.startsWith(prefix) && r.status === "approved") {
      if (r.type === "pto") sum.pto += r.hours || 0;
      else sum.sick += r.hours || 0;
    }
  }
  return sum;
}
