/********************************************************************
 * LUCCCA — BUILD 43
 * Cross-Department SLA Engine
 *
 * PURPOSE:
 *  - Define and evaluate SLAs for departments
 *  - "AV must be locked 18h before event start"
 *  - "Engineering cannot schedule disruptive work inside 2h pre-setup"
 *  - "Stewarding must confirm staff 24h before high-risk event"
 *  - If violated → flag risk + notify
 *********************************************************************/

export type SLACondition = {
  id: string;
  name: string;
  department: string;           // "AV", "Engineering", "Stewarding", etc.
  ruleType: "beforeEvent" | "beforeSetup" | "beforeService";
  hoursBefore: number;          // e.g. 18
  appliesToRiskBands?: ("low" | "medium" | "high" | "critical")[];
};

export type SLAEvaluationResult = {
  slaId: string;
  ok: boolean;
  message: string;
};

// Default SLA library
export const DEFAULT_SLAS: SLACondition[] = [
  {
    id: "sla-av-lockdown",
    name: "AV Equipment Lockdown",
    department: "AV",
    ruleType: "beforeEvent",
    hoursBefore: 18,
    appliesToRiskBands: ["high", "critical"],
  },
  {
    id: "sla-engineering-buffer",
    name: "Engineering Pre-Event Buffer",
    department: "Engineering",
    ruleType: "beforeSetup",
    hoursBefore: 2,
  },
  {
    id: "sla-stewarding-confirmation",
    name: "Stewarding Staff Confirmation",
    department: "Stewarding",
    ruleType: "beforeEvent",
    hoursBefore: 24,
    appliesToRiskBands: ["high", "critical"],
  },
  {
    id: "sla-culinary-prep",
    name: "Culinary Menu Finalization",
    department: "Culinary",
    ruleType: "beforeSetup",
    hoursBefore: 48,
  },
  {
    id: "sla-banquets-beo",
    name: "Banquets BEO Confirmation",
    department: "Banquets",
    ruleType: "beforeEvent",
    hoursBefore: 7 * 24, // 7 days
    appliesToRiskBands: ["critical"],
  },
];

export function evaluateSLAsForEvent(
  event: any,
  slas: SLACondition[] = DEFAULT_SLAS,
  now: Date = new Date()
): SLAEvaluationResult[] {
  const results: SLAEvaluationResult[] = [];
  const eventStart = new Date(event.startTime || event.date); // ISO string or date
  const setupStart = new Date(event.setupStart || event.startTime || event.date);
  const serviceStart = new Date(event.serviceStart || event.startTime || event.date);

  const hoursUntil = (target: Date) => {
    const diff = target.getTime() - now.getTime();
    return diff / (1000 * 60 * 60);
  };

  const riskBand: "low" | "medium" | "high" | "critical" =
    event.riskBand || event.riskScore >= 8 ? "critical" : event.riskScore >= 6 ? "high" : event.riskScore >= 4 ? "medium" : "low";

  for (const sla of slas) {
    // Skip if not applicable to risk band
    if (
      sla.appliesToRiskBands &&
      !sla.appliesToRiskBands.includes(riskBand)
    ) {
      results.push({
        slaId: sla.id,
        ok: true,
        message: "Not applicable to this risk band.",
      });
      continue;
    }

    let target: Date;
    if (sla.ruleType === "beforeEvent") target = eventStart;
    else if (sla.ruleType === "beforeSetup") target = setupStart;
    else target = serviceStart;

    const remaining = hoursUntil(target);
    const ok = remaining >= sla.hoursBefore;

    results.push({
      slaId: sla.id,
      ok,
      message: ok
        ? `✓ Meets SLA (${remaining.toFixed(1)}h remaining, need ${sla.hoursBefore}h).`
        : `✗ SLA BREACH: only ${remaining.toFixed(1)}h remaining (needs ${sla.hoursBefore}h).`,
    });
  }

  return results;
}

export function getSLAStatus(
  event: any,
  slas: SLACondition[] = DEFAULT_SLAS,
  now: Date = new Date()
): {
  allMet: boolean;
  breaches: SLAEvaluationResult[];
  warnings: SLAEvaluationResult[];
} {
  const results = evaluateSLAsForEvent(event, slas, now);
  const breaches = results.filter((r) => !r.ok);
  const warnings = results.filter((r) => !r.ok && r.message.includes("remaining"));

  return {
    allMet: breaches.length === 0,
    breaches,
    warnings,
  };
}
