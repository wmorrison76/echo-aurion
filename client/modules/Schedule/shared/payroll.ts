export type Currency = 'USD'|'CAD'|'GBP'|'EUR'; export interface WeeklyTotalsRequest { startISO: string; // week start date ISO (based on configured week start) currency: Currency; tz: string;
} export interface PayComponent { kind: 'regular'|'overtime'|'doubletime'|'tips'|'differential'; hours: number; rate: number; // currency/hour amount: number; // currency
} export interface EmployeeWeeklyTotal { emp_id: string; first_name: string; last_name: string; title?: string; reg_hours: number; ot_hours: number; dt_hours: number; total_hours: number; total_pay: number; currency: Currency; components: PayComponent[];
} export interface WeeklyTotals { org_id: string; location_id?: string; currency: Currency; period: { start: string; end: string; tz: string }; policy: { weekly_ot_threshold: number; // hours daily_ot_threshold?: number; // hours dt_threshold?: number; // optional daily double-time threshold ot_multiplier: number; dt_multiplier: number; }; employees: EmployeeWeeklyTotal[];
}
