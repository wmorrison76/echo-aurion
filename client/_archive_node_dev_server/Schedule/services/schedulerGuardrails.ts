/** * schedulerGuardrails.ts * Compliance & budget checks for draft schedules: * - OT risk per employee * - labor% vs budget * - predictability pay exposure (if publishing) * - union split-shift detection */
import { differenceInMinutes } from "date-fns";
export interface GuardrailFinding {
  type: "OT_RISK" | "LABOR_BUDGET" | "PREDICTABILITY" | "SPLIT_SHIFT";
  employee_id?: string;
  detail: string;
  exposure?: number;
}
export function evaluateGuardrails({
  shifts,
  hourlyRates,
  revenueTotal,
  budgetLaborPct = 35,
  weeklyThresholdHours = 40,
  predictabilityPublishAt,
}: {
  shifts: {
    employee_id: string;
    start: string;
    end: string;
    break_min?: number;
  }[];
  hourlyRates: Record<string, number>;
  revenueTotal: number;
  budgetLaborPct?: number;
  weeklyThresholdHours?: number;
  predictabilityPublishAt?: string;
}): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];
  const hours: Record<string, number> = {};
  let laborCost = 0;
  for (const s of shifts) {
    const mins =
      differenceInMinutes(new Date(s.end), new Date(s.start)) -
      (s.break_min || 0);
    hours[s.employee_id] = (hours[s.employee_id] || 0) + Math.max(0, mins);
    const rate = hourlyRates[s.employee_id] || 0;
    laborCost += rate * (Math.max(0, mins) / 60);
  } // OT risk Object.entries(hours).forEach(([emp, mins]) => { if (mins / 60 > weeklyThresholdHours) { findings.push({ type:"OT_RISK", employee_id: emp, detail: `Scheduled ${(mins / 60).toFixed(1)}h > ${weeklyThresholdHours}h.`, }); } }); // Labor % const laborPct = revenueTotal ? (laborCost / revenueTotal) * 100 : 0; if (laborPct > budgetLaborPct) { findings.push({ type:"LABOR_BUDGET", detail: `Labor ${laborPct.toFixed(1)}% exceeds budget ${budgetLaborPct}%.`, }); } // Predictability exposure if (predictabilityPublishAt) { const pub = new Date(predictabilityPublishAt).getTime(); let exposure = 0; for (const s of shifts) { const start = new Date(s.start).getTime(); if ((start - pub) / 3600000 < 24) exposure += 1; } if (exposure > 0) { findings.push({ type:"PREDICTABILITY", detail: `Late publish exposure for ${exposure} shifts (<24h).`, exposure, }); } } return findings;
}
