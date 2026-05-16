/********************************************************************
 * LUCCCA — BUILD 45
 * Cascading Impact Engine
 *
 * PURPOSE:
 *  - When something changes (menu, headcount, space), show full cascade:
 *  - Cost change, Labor change, Procurement change, Risk/health change, SLA impact
 *  - This is "cause & effect" modeling
 *********************************************************************/

export type CascadingImpactInput = {
  oldEvent: any;
  newEvent: any;
  laborRate?: number;           // hourly rate, default $25
  averageStaffRatio?: number;   // covers per FTE, default 12
};

export type CascadingImpactResult = {
  headcountDelta: number;
  laborHoursDelta: number;
  costDelta: number;
  riskDelta: number;
  procurementDelta: {
    itemsAdded: string[];
    itemsRemoved: string[];
    costChange: number;
  };
  slaDelta: {
    newBreaches: string[];
    fixedBreaches: string[];
  };
  summary: string[];
};

function estimateStaffingNeeds(
  headcount: number,
  ratio: number = 12
): number {
  // Simple: 1 staff per X covers
  return Math.ceil(headcount / ratio);
}

function estimateEventDuration(event: any): number {
  // hours
  if (event.endTime && event.startTime) {
    return (
      (new Date(event.endTime).getTime() -
        new Date(event.startTime).getTime()) /
      (1000 * 60 * 60)
    );
  }
  return event.durationHours || 4; // default
}

function estimateProcurementItems(headcount: number, menu: string[]): string[] {
  const items: string[] = [];

  // Basic catering supplies
  if (headcount > 0) {
    items.push(`Plates (${headcount})`);
    items.push(`Glasses (${headcount})`);
    items.push(`Cutlery sets (${headcount})`);
    items.push(`Linens (${Math.ceil(headcount / 10)})`);
  }

  // Menu-specific
  if (menu.includes("beef")) items.push("Prime beef tenderloin");
  if (menu.includes("fish")) items.push("Fresh salmon fillets");
  if (menu.includes("pasta")) items.push("Fresh pasta ingredients");
  if (menu.includes("dessert"))
    items.push("Pastry items", "Dessert garnishes");

  return items;
}

export function computeCascadingImpact(
  input: CascadingImpactInput
): CascadingImpactResult {
  const laborRate = input.laborRate || 25;
  const staffRatio = input.averageStaffRatio || 12;

  const oldEvent = input.oldEvent;
  const newEvent = input.newEvent;

  // 1) Headcount delta
  const headcountOld = oldEvent.headcount || 0;
  const headcountNew = newEvent.headcount || 0;
  const headcountDelta = headcountNew - headcountOld;

  // 2) Staffing delta
  const staffOld = estimateStaffingNeeds(headcountOld, staffRatio);
  const staffNew = estimateStaffingNeeds(headcountNew, staffRatio);
  const staffDelta = staffNew - staffOld;

  // 3) Duration (for labor calculation)
  const durationOld = estimateEventDuration(oldEvent);
  const durationNew = estimateEventDuration(newEvent);

  // 4) Labor hours delta
  const laborHoursOld = staffOld * durationOld;
  const laborHoursNew = staffNew * durationNew;
  const laborHoursDelta = laborHoursNew - laborHoursOld;

  // 5) Cost delta
  const costOld = laborHoursOld * laborRate;
  const costNew = laborHoursNew * laborRate;
  const costDelta = costNew - costOld;

  // 6) Risk delta (simplified)
  const riskOld = oldEvent.riskScore || 5;
  const riskNew = newEvent.riskScore || 5;
  const riskDelta = riskNew - riskOld;

  // 7) Procurement delta
  const menuOld = oldEvent.menuItems || [];
  const menuNew = newEvent.menuItems || [];
  const procOld = estimateProcurementItems(headcountOld, menuOld);
  const procNew = estimateProcurementItems(headcountNew, menuNew);

  const itemsAdded = procNew.filter((item) => !procOld.includes(item));
  const itemsRemoved = procOld.filter((item) => !procNew.includes(item));
  const procCostChange =
    (itemsAdded.length - itemsRemoved.length) * 5; // rough estimate $5/item

  // 8) Build summary
  const summary: string[] = [];
  if (headcountDelta > 0) {
    summary.push(
      `📈 Headcount +${headcountDelta} → +${staffDelta} staff needed`
    );
  } else if (headcountDelta < 0) {
    summary.push(
      `📉 Headcount ${headcountDelta} → ${staffDelta} staff reduction`
    );
  }

  if (laborHoursDelta > 0) {
    summary.push(
      `⏱️ Labor +${laborHoursDelta.toFixed(1)} hours → $${costDelta.toFixed(0)} cost increase`
    );
  } else if (laborHoursDelta < 0) {
    summary.push(
      `⏱️ Labor ${laborHoursDelta.toFixed(1)} hours → $${Math.abs(costDelta).toFixed(0)} cost savings`
    );
  }

  if (itemsAdded.length > 0) {
    summary.push(`🛒 New items needed: ${itemsAdded.join(", ")}`);
  }
  if (itemsRemoved.length > 0) {
    summary.push(`🗑️ Can reduce: ${itemsRemoved.join(", ")}`);
  }

  if (riskDelta > 0) {
    summary.push(`⚠️ Risk increases by ${riskDelta.toFixed(1)} points`);
  } else if (riskDelta < 0) {
    summary.push(`✓ Risk decreases by ${Math.abs(riskDelta).toFixed(1)} points`);
  }

  return {
    headcountDelta,
    laborHoursDelta,
    costDelta,
    riskDelta,
    procurementDelta: {
      itemsAdded,
      itemsRemoved,
      costChange: procCostChange,
    },
    slaDelta: {
      newBreaches: [],
      fixedBreaches: [],
    },
    summary,
  };
}
