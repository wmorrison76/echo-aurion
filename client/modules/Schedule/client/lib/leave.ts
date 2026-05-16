import type { DayKey } from "./schedule";

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

/* Store key = `${empId}:${weekISO}:${day}` */
type Store = Record<string, LeaveRecord>;

function k(empId: string, weekISO: string, day: DayKey) {
  return `${empId}:${weekISO}:${day}`;
}

function loadAll(): Store {
  try {
    const s = localStorage.getItem(KEY);
    return s ? (JSON.parse(s) as Store) : {};
  } catch {
    return {};
  }
}

function saveAll(map: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function loadReq(): Record<string, LeaveRequest> {
  try {
    const s = localStorage.getItem(REQ_KEY);
    return s ? (JSON.parse(s) as Record<string, LeaveRequest>) : {};
  } catch {
    return {};
  }
}

function saveReq(map: Record<string, LeaveRequest>) {
  try {
    localStorage.setItem(REQ_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/* Legacy numeric storage (kept for compatibility) */
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

/* Request workflow */
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
  if (req && req.status === "approved") {
    return {
      pto: req.type === "pto" ? req.hours : 0,
      sick: req.type === "sick" ? req.hours : 0,
    };
  }
  return { pto: 0, sick: 0 };
}

export function getLeave(empId: string, weekISO: string): LeaveRecord {
  const prefix = `${empId}:${weekISO}:`;
  const reqs = loadReq();
  const sum: LeaveRecord = { pto: 0, sick: 0 };

  for (const [id, r] of Object.entries(reqs)) {
    if (!id.startsWith(prefix)) continue;
    if (r.status !== "approved") continue;
    if (r.type === "pto") sum.pto += r.hours || 0;
    else sum.sick += r.hours || 0;
  }

  return sum;
}
