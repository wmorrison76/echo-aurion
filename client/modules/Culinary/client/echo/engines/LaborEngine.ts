export interface LaborShift {
  role: string;
  hours: number;
  wageRate: number;
}

export interface LaborPlanInput {
  forecastCovers: number;
  avgMinutesPerCover: number;
  laborShifts: LaborShift[];
}

export interface LaborPlanAssessment {
  totalLaborCost: number;
  laborHours: number;
  laborCostPerCover: number;
  avgCoversPerLaborHour: number;
  notes: string[];
}

export class LaborEngine {
  static assessLaborPlan(plan: LaborPlanInput): LaborPlanAssessment {
    const totalLaborCost = plan.laborShifts.reduce(
      (sum, s) => sum + s.hours * s.wageRate,
      0,
    );
    const laborHours = plan.laborShifts.reduce((sum, s) => sum + s.hours, 0);

    const laborCostPerCover =
      plan.forecastCovers > 0 ? totalLaborCost / plan.forecastCovers : 0;
    const totalMinutesCapacity = laborHours * 60;
    const neededMinutes = plan.forecastCovers * plan.avgMinutesPerCover;
    const avgCoversPerLaborHour =
      laborHours > 0 ? plan.forecastCovers / laborHours : 0;

    const notes: string[] = [];

    if (neededMinutes > totalMinutesCapacity) {
      notes.push(
        "Forecasted covers may exceed labor capacity; consider adding shifts or simplifying menu.",
      );
    }

    if (laborCostPerCover > 15) {
      notes.push(
        "Labor cost per cover is high; evaluate scheduling and productivity.",
      );
    }

    return {
      totalLaborCost,
      laborHours,
      laborCostPerCover,
      avgCoversPerLaborHour,
      notes,
    };
  }
}
