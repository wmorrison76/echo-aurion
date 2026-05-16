/** * Shared type definitions for scheduling & payroll system * Used by both client and server */ export type Role =
  "ADMIN" | "GM" | "DEPT_MGR" | "EMPLOYEE";
export interface Org {
  id: string;
  name: string;
  created_at?: string;
}
export interface Outlet {
  id: string;
  org_id: string;
  name: string;
  tz: string;
}
export interface Department {
  id: string;
  outlet_id: string;
  name: string;
}
export interface Position {
  id: string;
  dept_id: string;
  name: string;
  base_rate: number;
  tip_eligible: boolean;
}
export interface Employee {
  id: string;
  org_id: string;
  outlet_id: string;
  dept_id: string;
  position_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  hourly_rate: number;
  overtime_mult: number;
  active: boolean;
}
export interface Shift {
  id: string;
  org_id: string;
  outlet_id: string;
  dept_id: string;
  employee_id: string;
  position_id: string;
  starts_at: string; // ISO timestamp ends_at: string; // ISO timestamp break_min: number; published: boolean; tips_declared: number; created_by: string; created_at: string;
}
export interface PublishAudit {
  id: string;
  org_id: string;
  outlet_id: string;
  dept_id: string;
  week_start: string; // ISO date published_by: string; published_at: string; notes?: string;
}
