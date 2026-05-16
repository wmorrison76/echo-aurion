export type EmploymentType = "full-time" | "part-time" | "contract";
export type EmployeeStatus = "active" | "inactive" | "on-leave";
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  outletId: string;
  hireDate: string;
  employmentType: EmploymentType;
  salary: number;
  status: EmployeeStatus;
  manager?: string;
  certifications: string[];
}
export type PayrollCycleStatus = "draft" | "processing" | "complete" | "paid";
export type PayrollRecordStatus = "pending" | "approved" | "paid";
export interface PayrollRecord {
  id: string;
  employeeId: string;
  regularHours: number;
  overtimeHours: number;
  basePay: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  status: PayrollRecordStatus;
}
export interface PayrollCycle {
  id: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status: PayrollCycleStatus;
  employees: PayrollRecord[];
  totalPayroll: number;
}
export type BenefitPlanType =
  | "health"
  | "dental"
  | "vision"
  | "retirement"
  | "pto";
export interface BenefitPlan {
  id: string;
  name: string;
  type: BenefitPlanType;
  provider: string;
  coverage: string;
  employeeContribution: number;
  employerContribution: number;
  enrollees: string[];
}
export type TrainingCategory =
  | "safety"
  | "product"
  | "customer-service"
  | "leadership";
export interface TrainingProgram {
  id: string;
  name: string;
  category: TrainingCategory;
  duration: number;
  enrollees: string[];
  completionRate: number;
  nextScheduled: string;
}
export type ScheduleStatus = "draft" | "published" | "archived";
export interface Shift {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  position: string;
  isScheduled: boolean;
  isCovered: boolean;
}
export interface ScheduleOutlet {
  outletId: string;
  shifts: Shift[];
}
export interface Schedule {
  id: string;
  week: string;
  outlets: ScheduleOutlet[];
  publishedDate?: string;
  status: ScheduleStatus;
}
export interface HRMetrics {
  totalEmployees: number;
  fullTime: number;
  partTime: number;
  activeEmployees: number;
  averageTenure: number;
  turnoverRate: number;
  averageSalary: number;
  certificationRate: number;
  trainingHoursPerEmployee: number;
}
