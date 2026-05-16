/********************************************************************
 * LUCCCA — BUILD 44
 * Reschedule Simulation Engine ("What if we move this?")
 *
 * PURPOSE:
 *  - Let Maestro / EC test scenarios
 *  - "If I move this event from Friday 18:00 → Sunday 11:00, what happens?"
 *  - New conflicts? Labor change? Risk change? SLA breaches fixed or created?
 *********************************************************************/

import { evaluateSLAsForEvent, SLACondition, DEFAULT_SLAS } from "./sla-engine";

export type SimulationInput = {
  event: any;
  newStartTime: string;   // ISO
  newEndTime: string;     // ISO
  otherEvents: any[];     // events in same spaces/day
  slas?: SLACondition[];
};

export type SimulationResult = {
  newConflicts: any[];
  riskDelta: {
    before: number;
    after: number;
    change: number;
  };
  slaDelta: {
    before: any[];
    after: any[];
    newBreaches: any[];
    fixedBreaches: any[];
  };
  simulation: {
    originalEvent: any;
    simulatedEvent: any;
    feasible: boolean;
    warnings: string[];
  };
};

function timeOverlap(a: any, b: any): boolean {
  const aStart = new Date(a.startTime || a.date).getTime();
  const aEnd = new Date(a.endTime || new Date(aStart + 3600000)).getTime();
  const bStart = new Date(b.startTime || b.date).getTime();
  const bEnd = new Date(b.endTime || new Date(bStart + 3600000)).getTime();
  return aStart < bEnd && bStart < aEnd;
}

function calculateBasicRisk(event: any): number {
  let risk = 5; // baseline
  if (event.headcount > 200) risk += 2;
  if (event.headcount > 500) risk += 2;
  if (event.complexity === "high") risk += 2;
  if (event.multiSpace) risk += 1;
  if (event.vipLevel > 5) risk += 1;
  const now = Date.now();
  const eventTime = new Date(event.startTime || event.date).getTime();
  const hoursUntil = (eventTime - now) / (1000 * 60 * 60);
  if (hoursUntil < 24) risk += 2;
  if (hoursUntil < 6) risk += 3;
  return Math.min(risk, 10);
}

export function simulateReschedule(input: SimulationInput): SimulationResult {
  const slas = input.slas || DEFAULT_SLAS;
  const simulatedEvent = {
    ...input.event,
    startTime: input.newStartTime,
    endTime: input.newEndTime,
  };

  // 1) Conflicts (overlap check)
  const newConflicts = input.otherEvents.filter((e) => {
    if (e.id === simulatedEvent.id) return false;
    if (e.space !== simulatedEvent.space) return false;
    return timeOverlap(simulatedEvent, e);
  });

  // 2) Risk
  const riskBefore = calculateBasicRisk(input.event);
  const riskAfter = calculateBasicRisk(simulatedEvent);
  const riskDelta = riskAfter - riskBefore;

  simulatedEvent.riskScore = riskAfter;

  // 3) SLA checks
  const slasBefore = evaluateSLAsForEvent(input.event, slas);
  const slasAfter = evaluateSLAsForEvent(simulatedEvent, slas);

  const breachesBefore = slasBefore.filter((s) => !s.ok);
  const breachesAfter = slasAfter.filter((s) => !s.ok);

  const newBreaches = breachesAfter.filter(
    (ba) => !breachesBefore.find((bb) => bb.slaId === ba.slaId)
  );
  const fixedBreaches = breachesBefore.filter(
    (bb) => !breachesAfter.find((ba) => ba.slaId === bb.slaId)
  );

  // 4) Feasibility
  const feasible = newConflicts.length === 0;
  const warnings: string[] = [];

  if (newConflicts.length > 0) {
    warnings.push(`${newConflicts.length} scheduling conflicts detected`);
  }
  if (newBreaches.length > 0) {
    warnings.push(`${newBreaches.length} new SLA breaches`);
  }
  if (riskDelta > 2) {
    warnings.push(`Risk increases by ${riskDelta.toFixed(1)} points`);
  }
  if (riskDelta < -2) {
    warnings.push(`✓ Risk decreases by ${Math.abs(riskDelta).toFixed(1)} points`);
  }

  return {
    newConflicts,
    riskDelta: {
      before: riskBefore,
      after: riskAfter,
      change: riskDelta,
    },
    slaDelta: {
      before: breachesBefore,
      after: breachesAfter,
      newBreaches,
      fixedBreaches,
    },
    simulation: {
      originalEvent: input.event,
      simulatedEvent,
      feasible,
      warnings,
    },
  };
}
