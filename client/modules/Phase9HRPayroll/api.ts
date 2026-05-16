import { get, post } from "@/lib/api-client";
import type {
  BenefitPlan,
  Employee,
  HRMetrics,
  PayrollCycle,
  Schedule,
  TrainingProgram,
} from "./types";
function qs(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
export async function fetchHRMetrics(outletId?: string): Promise<HRMetrics> {
  return get<HRMetrics>(`/api/hr/metrics${qs({ outletId })}`);
}
export async function fetchEmployees(outletId?: string): Promise<Employee[]> {
  return get<Employee[]>(`/api/hr/employees${qs({ outletId })}`);
}
export async function createEmployee(
  employee: Omit<Employee, "id">,
): Promise<{ employeeId: string; message: string }> {
  return post("/api/hr/employees", employee);
}
export async function fetchSchedules(status?: string): Promise<Schedule[]> {
  return get<Schedule[]>(`/api/hr/schedules${qs({ status })}`);
}
export async function createSchedule(schedule: Omit<Schedule, "id">) {
  return post<{ scheduleId: string; message: string }>(
    "/api/hr/schedules",
    schedule,
  );
}
export async function publishSchedule(scheduleId: string) {
  return post<{ message: string }>(`/api/hr/schedules/${scheduleId}/publish`);
}
export async function fetchPayrollCycles(): Promise<PayrollCycle[]> {
  return get<PayrollCycle[]>("/api/hr/payroll/cycles");
}
export async function createPayrollCycle(
  periodStart: string,
  periodEnd: string,
) {
  return post<{ cycleId: string; message: string }>("/api/hr/payroll/cycles", {
    periodStart,
    periodEnd,
  });
}
export async function processPayroll(cycleId: string) {
  return post<{ message: string }>(`/api/hr/payroll/cycles/${cycleId}/process`);
}
export async function approvePayroll(cycleId: string) {
  return post<{ message: string }>(`/api/hr/payroll/cycles/${cycleId}/approve`);
}
export async function fetchBenefitPlans(): Promise<BenefitPlan[]> {
  return get<BenefitPlan[]>("/api/hr/benefits/plans");
}
export async function createBenefitPlan(plan: Omit<BenefitPlan, "id">) {
  return post<{ planId: string; message: string }>(
    "/api/hr/benefits/plans",
    plan,
  );
}
export async function enrollBenefit(planId: string, employeeId: string) {
  return post<{ message: string }>(`/api/hr/benefits/plans/${planId}/enroll`, {
    employeeId,
  });
}
export async function fetchTrainingPrograms(): Promise<TrainingProgram[]> {
  return get<TrainingProgram[]>("/api/hr/training/programs");
}
export async function createTrainingProgram(
  program: Omit<TrainingProgram, "id">,
) {
  return post<{ programId: string; message: string }>(
    "/api/hr/training/programs",
    program,
  );
}
export async function enrollTraining(programId: string, employeeId: string) {
  return post<{ message: string }>(
    `/api/hr/training/programs/${programId}/enroll`,
    { employeeId },
  );
}
