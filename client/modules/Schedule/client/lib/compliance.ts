import {
  DAYS,
  DayKey,
  EmployeeRow,
  hoursForCell,
  weeklyHours,
} from "./schedule";
export interface ComplianceConfig {
  predictiveNoticeDays: number; // 14-21 typical restPeriodHours: number; // 10-12 typical maxConsecutiveDays: number; // e.g., 6 overtimeThreshold: number; // hours/week, usually 40
}
const CFG_KEY = "shiftflow:compliance:cfg";
export function getComplianceConfig(): ComplianceConfig {
  try {
    const j = localStorage.getItem(CFG_KEY);
    if (j) {
      const p = JSON.parse(j);
      return {
        predictiveNoticeDays: p.predictiveNoticeDays ?? 14,
        restPeriodHours: p.restPeriodHours ?? 10,
        maxConsecutiveDays: p.maxConsecutiveDays ?? 6,
        overtimeThreshold: p.overtimeThreshold ?? 40,
      };
    }
  } catch {}
  return {
    predictiveNoticeDays: 14,
    restPeriodHours: 10,
    maxConsecutiveDays: 6,
    overtimeThreshold: 40,
  };
}
export function saveComplianceConfig(cfg: ComplianceConfig) {
  try {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  } catch {}
}
export interface AuditEvent {
  ts: number; // epoch ms type: |"shift.update" |"shift.add" |"shift.remove" |"publish" |"policy.update"; meta: Record<string, unknown>;
}
const AUDIT_KEY_PREFIX = "shiftflow:audit:";
export function appendAudit(weekStartISO: string, ev: AuditEvent) {
  try {
    const key = AUDIT_KEY_PREFIX + weekStartISO;
    const list: AuditEvent[] = JSON.parse(localStorage.getItem(key) || "[]");
    list.push(ev);
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}
export function readAudit(weekStartISO: string): AuditEvent[] {
  try {
    return JSON.parse(
      localStorage.getItem(AUDIT_KEY_PREFIX + weekStartISO) || "[]",
    );
  } catch {
    return [];
  }
}
export interface ComplianceIssue {
  kind: string;
  message: string;
}
export interface ComplianceReport {
  issues: ComplianceIssue[];
  overtimeHours: number;
  predictabilityPayHours: number;
}
export function evaluateCompliance(
  weekStartISO: string,
  employees: EmployeeRow[],
  cfg: ComplianceConfig,
  publishedAt?: number,
): ComplianceReport {
  const issues: ComplianceIssue[] = []; // Overtime (weekly 40h+) const overtimeHours = employees.reduce( (s, e) => s + Math.max(0, weeklyHours(e) - cfg.overtimeThreshold), 0, ); if (overtimeHours > 0) issues.push({ kind:"overtime", message: `Overtime detected: ${overtimeHours.toFixed(2)}h total over threshold ${cfg.overtimeThreshold}h.`, }); // Rest periods between consecutive days for (const e of employees) { for (let i = 0; i < 6; i++) { const a = e?.shifts?.[DAYS[i]]; const b = e?.shifts?.[DAYS[i + 1]]; if (!a || !b) continue; const endA = a.out ? a.out : a.value?.split("-")[1] ||""; const startB = b.in ? b.in : b.value?.split("-")[0] ||""; if (!endA || !startB) continue; const toMin = (t: string) => { const m = t.match(/(\d{1,2})(?::(\d{2}))?\s*(a|p)?/i); if (!m) return null; let h = +m[1]; const mm = +(m[2] || 0); const ap = (m[3] ||"").toLowerCase(); if (ap ==="p" && h < 12) h += 12; if (ap ==="a" && h === 12) h = 0; return h * 60 + mm; }; const ea = toMin(endA); const sb = toMin(startB); if (ea == null || sb == null) continue; const rest = sb >= ea ? sb - ea : sb + 24 * 60 - ea; if (rest < cfg.restPeriodHours * 60) issues.push({ kind:"rest", message: `${e.name}: less than ${cfg.restPeriodHours}h rest between ${DAYS[i]} and ${DAYS[i + 1]}`, }); } } // Max consecutive days for (const e of employees) { let streak = 0; let maxStreak = 0; for (let i = 0; i < 7; i++) { const shift = e?.shifts?.[DAYS[i]]; const h = hoursForCell(shift); streak = h > 0 ? streak + 1 : 0; maxStreak = Math.max(maxStreak, streak); } if (maxStreak > cfg.maxConsecutiveDays) issues.push({ kind:"consecutive", message: `${e.name}: scheduled ${maxStreak} consecutive days (limit ${cfg.maxConsecutiveDays}).`, }); } // Predictive scheduling (predictability pay) if schedule changed after publish within window let predictabilityPayHours = 0; const audit = readAudit(weekStartISO); if (publishedAt) { const windowMs = cfg.predictiveNoticeDays * 24 * 60 * 60 * 1000; for (const ev of audit) { if ( ev.type ==="shift.update" && ev.ts > publishedAt && ev.ts < publishedAt + windowMs ) { // simple model: 1h predictability pay per changed day predictabilityPayHours += 1; } } if (predictabilityPayHours > 0) issues.push({ kind:"predictability", message: `Predictability pay: ${predictabilityPayHours}h due to late changes.`, }); } return { issues, overtimeHours, predictabilityPayHours };
}
export interface OvertimeLedger {
  [employeeId: string]: number;
}
const OT_LEDGER_KEY = "shiftflow:ot-ledger";
export function getOvertimeLedger(): OvertimeLedger {
  try {
    return JSON.parse(localStorage.getItem(OT_LEDGER_KEY) || "{}");
  } catch {
    return {};
  }
}
export function setOvertimeLedger(ledger: OvertimeLedger) {
  try {
    localStorage.setItem(OT_LEDGER_KEY, JSON.stringify(ledger));
  } catch {}
}
export function recordOvertimeOffer(empId: string, hours: number) {
  const led = getOvertimeLedger();
  led[empId] = (led[empId] || 0) + hours;
  setOvertimeLedger(led);
}
export function payrollExport(state: {
  weekStartISO: string;
  employees: EmployeeRow[];
}) {
  const rows = state.employees.map((e) => {
    const hours = weeklyHours(e);
    return {
      id: e.id,
      name: e.name,
      role: e.role || "",
      rate: e.rate || 0,
      hours,
    };
  });
  return { weekStartISO: state.weekStartISO, rows };
}
