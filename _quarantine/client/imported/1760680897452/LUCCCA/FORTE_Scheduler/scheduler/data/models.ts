import { z } from 'zod';

export type Money = number;

export const RoleRequirementSchema = z.object({
  key: z.string(),
  min: z.number().int(),
  ideal: z.number().int().optional(),
  defaultIn: z.string(),
  defaultOut: z.string(),
  combinableWith: z.array(z.string()).optional()
});

export const ForecastTierSchema = z.object({
  id: z.string(),
  outletId: z.string(),
  name: z.string(),
  coversMin: z.number().int(),
  coversMax: z.number().int(),
  roles: z.array(RoleRequirementSchema)
});
export type ForecastTier = z.infer<typeof ForecastTierSchema>;

export const EmployeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  salaried: z.boolean().optional(),
  roles: z.array(z.string()),
  wageByRole: z.record(z.string(), z.number()),
  availability: z.any().array().optional(),
  otherJobBlocks: z.any().array().optional(),
  preferences: z.any().optional()
});
export type Employee = z.infer<typeof EmployeeSchema>;

export interface ScheduleInput {
  tiers: ForecastTier[];
  employees: Employee[];
  forecast: { covers: number; sales: number };
  rules: RuleSet;
  salesForecast: number;
  policies?: any;
}

export interface Shift {
  id: string;
  employeeId: string;
  role: string;
  start: string;
  end: string;
  outletId: string;
}

export interface ScheduleDraft {
  shifts: Shift[];
  tierUsed: string;
}

export interface ComplianceReport {
  violations: string[];
}
export type RuleSet = any;

export interface ScheduleChecked extends ScheduleDraft {
  compliance: ComplianceReport;
}

export interface ScheduleResult extends ScheduleChecked {
  costs: { total: Money; pct: number };
  publishable: boolean;
  gateReport: any[];
}
