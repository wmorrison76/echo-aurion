export interface ScheduleSettings {
  overtimeThreshold: number; // hours/week hourlyDefaultRate: number; // USD weeklyBudget: number; // USD weeklySales: number; // USD timeFormat24h: boolean; securityRequireConfirmToExport: boolean; startDay: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun .. 6=Sat calendarSet:"none"|"federal"|"christian"|"jewish"|"all"; payPeriod:"weekly" |"biweekly" |"semi_monthly" |"monthly"; payPeriodAnchor: string; // ISO date string (e.g.,"2024-01-01")
}
const SETTINGS_KEY = "shiftflow:settings";
export function loadSettings(): ScheduleSettings {
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    if (!s) throw new Error();
    const parsed = JSON.parse(s) as Partial<ScheduleSettings>;
    return {
      overtimeThreshold: parsed.overtimeThreshold ?? 40,
      hourlyDefaultRate: parsed.hourlyDefaultRate ?? 18,
      weeklyBudget: parsed.weeklyBudget ?? 2000,
      weeklySales: (parsed as any).weeklySales ?? 0,
      timeFormat24h: parsed.timeFormat24h ?? true,
      securityRequireConfirmToExport:
        parsed.securityRequireConfirmToExport ?? false,
      startDay: (parsed.startDay as any) ?? 1,
      calendarSet: (parsed as any).calendarSet ?? "none",
      payPeriod: (parsed.payPeriod as any) ?? "biweekly",
      payPeriodAnchor: parsed.payPeriodAnchor ?? "2024-01-01",
    };
  } catch {
    return {
      overtimeThreshold: 40,
      hourlyDefaultRate: 18,
      weeklyBudget: 2000,
      weeklySales: 0,
      timeFormat24h: true,
      securityRequireConfirmToExport: false,
      startDay: 1,
      calendarSet: "none",
      payPeriod: "biweekly",
      payPeriodAnchor: "2024-01-01",
    };
  }
}
export function saveSettings(s: ScheduleSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
