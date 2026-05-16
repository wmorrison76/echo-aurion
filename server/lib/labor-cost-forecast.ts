/***
 * LUCCCA — BUILD 31
 * Labor Cost Forecast Engine
 *
 * INPUT:
 *  - StaffingOutput from Build 25
 *  - Wage table (base rates)
 *  - Simple overtime rule (40h/week per person equivalent)
 *
 * OUTPUT:
 *  - Cost by role
 *  - Total labor cost
 *  - Estimated overtime exposure (simple heuristic)
 ***/

export type StaffingRole = {
  role: string;
  count: number;
  hoursEach: number;
  totalHours: number;
};

export type StaffingOutput = {
  roles: StaffingRole[];
  totalHours: number;
};

export type WageTable = {
  [role: string]: {
    baseRate: number;
  };
};

export type LaborCostLine = {
  role: string;
  hours: number;
  baseRate: number;
  cost: number;
  overtimeRisk: boolean;
};

export type LaborCostResult = {
  lines: LaborCostLine[];
  totalCost: number;
  estimatedOvertimeRisk: boolean;
};

export function calculateLaborCost(
  staffing: StaffingOutput,
  wages: WageTable
): LaborCostResult {
  const lines: LaborCostLine[] = staffing.roles.map((r) => {
    const wage = wages[r.role] || { baseRate: 20 };
    const hours = r.totalHours;
    const cost = hours * wage.baseRate;

    const hoursPerPerson = r.hoursEach;
    const overtimeRisk = hoursPerPerson > 8;

    return {
      role: r.role,
      hours,
      baseRate: wage.baseRate,
      cost,
      overtimeRisk,
    };
  });

  const totalCost = lines.reduce((sum, l) => sum + l.cost, 0);
  const estimatedOvertimeRisk = lines.some((l) => l.overtimeRisk);

  return {
    lines,
    totalCost,
    estimatedOvertimeRisk,
  };
}
