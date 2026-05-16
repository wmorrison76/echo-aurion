import type { Event, Space } from "../types";
import type { OpsEvent, OpsMilestone, OpsTask } from "@shared/types/ops-gantt";
import { instantiateTemplate } from "@shared/ops-gantt/templates";
import { recalculateSchedule } from "@shared/ops-gantt/recalculate";
import { computeCriticalPathAndSlack } from "@shared/ops-gantt/scheduler";
import { applyTaskOverrides, loadTaskOverrides } from "./task-overrides";

type DerivedOpsBase = {
  opsEvent: OpsEvent;
  tasksBase: OpsTask[];
  milestones: OpsMilestone[];
  criticalPathTaskIds: string[];
};

const CACHE = new Map<string, { at: number; value: DerivedOpsBase }>();
const MAX = 500; // keep last ~500 events

function cacheKey(evt: Event, spaceName: string): string {
  const rev = String(evt.metadata?.lastBEORevision ?? "");
  const g = String(evt.guestCountExpected ?? "");
  return [
    String(evt.id),
    String(evt.startDateTime),
    String(evt.endDateTime),
    String(spaceName || ""),
    rev,
    g,
  ].join("|");
}

function pruneIfNeeded() {
  if (CACHE.size <= MAX) return;
  const entries = Array.from(CACHE.entries()).sort((a, b) => a[1].at - b[1].at);
  const remove = Math.max(1, Math.floor(MAX * 0.2));
  for (let i = 0; i < remove; i++) CACHE.delete(entries[i][0]);
}

function buildSpaceName(evt: Event, spacesById?: Map<string, Space>): string {
  const first = evt.spaceIds?.[0];
  if (!first) return evt.metadata?.space ?? "Unassigned Space";
  return spacesById?.get(first)?.name ?? first;
}

export function deriveOpsForEvent(params: {
  event: Event;
  spacesById?: Map<string, Space>;
  includeProductionScope?: boolean;
}): {
  opsEvent: OpsEvent;
  tasks: OpsTask[];
  milestones: OpsMilestone[];
  criticalSet: Set<string>;
} {
  const { event, spacesById } = params;
  const includeProductionScope = params.includeProductionScope ?? true;

  const startMs = new Date(event.startDateTime).getTime();
  const endMs = new Date(event.endDateTime).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    const opsEvent: OpsEvent = {
      eventId: event.id,
      beoNumber: event.metadata?.beoNumber ?? `BEO-${event.id}`,
      eventName: event.name || event.id,
      clientName: event.metadata?.clientName ?? "Client",
      property: event.metadata?.property ?? "Local Property",
      space: event.metadata?.space ?? "Space",
      eventType: event.metadata?.eventType ?? event.metadata?.type ?? "banquet",
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      setupStart: event.metadata?.setupStart ?? event.startDateTime,
      strikeEnd: event.metadata?.strikeEnd ?? event.endDateTime,
      guestCountGuaranteed:
        event.metadata?.guestCountGuaranteed ?? event.guestCountExpected ?? 0,
      guestCountExpected: event.guestCountExpected ?? 0,
      serviceStyle: event.metadata?.serviceStyle ?? "buffet",
      status: "tentative",
      financialStatus: event.metadata?.financialStatus ?? "deposit_due",
      priority: event.metadata?.priority ?? "P2",
      lastBEORevision: event.metadata?.lastBEORevision ?? 1,
      revisionHistory: event.metadata?.revisionHistory ?? [],
      owners: event.metadata?.owners ?? {},
    };
    return { opsEvent, tasks: [], milestones: [], criticalSet: new Set() };
  }

  const spaceName = buildSpaceName(event, spacesById);
  const key = cacheKey(event, spaceName);
  const cached = CACHE.get(key)?.value;

  let base: DerivedOpsBase;
  if (cached) {
    base = cached;
  } else {
    const opsEvent: OpsEvent = {
      eventId: event.id,
      beoNumber: event.metadata?.beoNumber ?? `BEO-${event.id}`,
      eventName: event.name || event.id,
      clientName: event.metadata?.clientName ?? "Client",
      property: event.metadata?.property ?? "Local Property",
      space: spaceName,
      eventType: event.metadata?.eventType ?? event.metadata?.type ?? "banquet",
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      setupStart:
        event.metadata?.setupStart ??
        new Date(startMs - 2 * 60 * 60 * 1000).toISOString(),
      strikeEnd:
        event.metadata?.strikeEnd ??
        new Date(endMs + 60 * 60 * 1000).toISOString(),
      guestCountGuaranteed:
        event.metadata?.guestCountGuaranteed ?? event.guestCountExpected ?? 0,
      guestCountExpected: event.guestCountExpected ?? 0,
      serviceStyle: event.metadata?.serviceStyle ?? "buffet",
      status: "tentative",
      financialStatus: event.metadata?.financialStatus ?? "deposit_due",
      priority: event.metadata?.priority ?? "P2",
      lastBEORevision: event.metadata?.lastBEORevision ?? 1,
      revisionHistory: event.metadata?.revisionHistory ?? [],
      owners: event.metadata?.owners ?? {},
    };

    const templated = instantiateTemplate({
      event: opsEvent,
      includeProductionScope,
    });
    const { tasks: scheduled } = recalculateSchedule(templated.tasks, {
      shiftToSatisfyDependencies: true,
    });
    const { tasks: tasksBase, criticalPathTaskIds } =
      computeCriticalPathAndSlack(scheduled);

    base = {
      opsEvent,
      tasksBase,
      milestones: templated.milestones || [],
      criticalPathTaskIds,
    };
    CACHE.set(key, { at: Date.now(), value: base });
    pruneIfNeeded();
  }

  // Apply overrides every call so status/percent changes reflect immediately.
  const overrides = loadTaskOverrides(base.opsEvent.eventId);
  const tasks = applyTaskOverrides(base.tasksBase, overrides);

  const filtered = includeProductionScope
    ? tasks
    : tasks.filter((t) => t.scope === "beo");
  return {
    opsEvent: base.opsEvent,
    tasks: filtered,
    milestones: base.milestones,
    criticalSet: new Set(base.criticalPathTaskIds || []),
  };
}
