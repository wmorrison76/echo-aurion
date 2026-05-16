export type NextActionInput = {
  id?: string;
  prospect_id?: string;
  owner_id?: string;
  title?: string;
  due_at?: string;
  status?: string;
};

export type NextActionNormalized = NextActionInput & {
  status: string;
};

export type NextActionSummary = {
  total: number;
  overdue: number;
  due: number;
};

export type StageVelocityInput = {
  id?: string;
  status?: string;
  updated_at?: string;
  created_by?: string;
  estimated_revenue?: number | string;
};

export type StageVelocityEntry = {
  prospectId: string;
  stage?: string;
  daysInStage: number;
  lastUpdatedAt?: string;
  ownerId?: string;
  revenue: number;
};

export type StageVelocitySummary = {
  stalled: number;
  stallDays: number;
};

export type CadenceProspectInput = {
  id?: string;
  created_by?: string;
};

export type CadenceActivityInput = {
  prospect_id?: string;
  timestamp?: string;
};

export type CadenceMetric = {
  prospectId?: string;
  ownerId?: string;
  lastTouchAt?: string;
  cadenceDays: number;
  isCompliant: boolean;
};

export type ProfitabilityEventInput = {
  id?: string;
  revenue?: number | string;
};

export type ProfitabilityAllocationInput = {
  event_id?: string;
  total_cost?: number | string;
};

export type ProfitabilitySummary = {
  eventId?: string;
  revenueForecast: number;
  cogsForecast: number;
  margin: number;
  marginPct: number;
};

function daysBetween(a: Date, b: Date) {
  const ms = Math.max(0, b.getTime() - a.getTime());
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function normalizeNextActions(
  actions: NextActionInput[],
  now: Date = new Date(),
): { items: NextActionNormalized[]; summary: NextActionSummary } {
  const items = (actions || []).map((item) => {
    const dueAt = item.due_at ? new Date(item.due_at) : null;
    const isOverdue = dueAt ? item.status !== "completed" && dueAt < now : false;
    return {
      ...item,
      status: isOverdue ? "overdue" : item.status || "due",
    };
  });

  const overdue = items.filter((item) => item.status === "overdue").length;
  const due = items.filter((item) => item.status === "due").length;

  return {
    items,
    summary: {
      total: items.length,
      overdue,
      due,
    },
  };
}

export function buildStageVelocity(
  prospects: StageVelocityInput[],
  stallDays: number,
  now: Date = new Date(),
): { entries: StageVelocityEntry[]; summary: StageVelocitySummary } {
  const entries = (prospects || []).map((prospect) => {
    const updated = prospect.updated_at ? new Date(prospect.updated_at) : now;
    return {
      prospectId: prospect.id || "",
      stage: prospect.status,
      daysInStage: daysBetween(updated, now),
      lastUpdatedAt: prospect.updated_at,
      ownerId: prospect.created_by,
      revenue: Number(prospect.estimated_revenue || 0),
    };
  });

  const stalled = entries.filter((entry) => entry.daysInStage >= stallDays).length;

  return {
    entries,
    summary: {
      stalled,
      stallDays,
    },
  };
}

export function buildCadenceMetrics(
  prospects: CadenceProspectInput[],
  activities: CadenceActivityInput[],
  cadenceDays: number,
  now: Date = new Date(),
): CadenceMetric[] {
  const lastTouch = new Map<string, string>();
  (activities || []).forEach((activity) => {
    if (activity.prospect_id && !lastTouch.has(activity.prospect_id)) {
      lastTouch.set(activity.prospect_id, activity.timestamp || "");
    }
  });

  return (prospects || []).map((prospect) => {
    const last = prospect.id ? lastTouch.get(prospect.id) : undefined;
    const lastDate = last ? new Date(last) : null;
    const daysSince = lastDate ? daysBetween(lastDate, now) : cadenceDays + 1;

    return {
      prospectId: prospect.id,
      ownerId: prospect.created_by,
      lastTouchAt: last,
      cadenceDays,
      isCompliant: daysSince <= cadenceDays,
    };
  });
}

export function buildProfitabilitySummaries(
  events: ProfitabilityEventInput[],
  allocations: ProfitabilityAllocationInput[],
): ProfitabilitySummary[] {
  const costsByEvent = new Map<string, number>();
  (allocations || []).forEach((row) => {
    if (!row.event_id) return;
    const total = costsByEvent.get(row.event_id) || 0;
    costsByEvent.set(row.event_id, total + Number(row.total_cost || 0));
  });

  return (events || []).map((event) => {
    const revenue = Number(event.revenue || 0);
    const cogs = Number(event.id ? costsByEvent.get(event.id) || 0 : 0);
    const margin = revenue - cogs;
    const marginPct = revenue ? margin / revenue : 0;
    return {
      eventId: event.id,
      revenueForecast: revenue,
      cogsForecast: cogs,
      margin,
      marginPct,
    };
  });
}
