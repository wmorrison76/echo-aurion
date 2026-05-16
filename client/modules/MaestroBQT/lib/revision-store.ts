import type { OpsEvent, OpsTask } from "@shared/types/ops-gantt";

export type OpsEventSnapshot = {
  eventId: string;
  startDateTime: string;
  endDateTime: string;
  setupStart?: string;
  strikeEnd?: string;
  guestCountExpected: number;
  guestCountGuaranteed: number;
  serviceStyle: string;
  space: string;
};

export type OpsTaskSnapshot = {
  key: string; // stable fingerprint
  taskId: string;
  scope: string;
  department: string;
  title: string;
  start: string;
  end: string;
  status: string;
};

export type OpsRevisionSnapshot = {
  eventId: string;
  revision: number;
  createdAt: string;
  summary?: string;
  menuLocked?: boolean;
  event: OpsEventSnapshot;
  tasks: OpsTaskSnapshot[];
};

export type OpsRevisionDiff = {
  changedFields: string[];
  tasksAdded: number;
  tasksRemoved: number;
  tasksShifted: number;
  addedKeys: string[];
  removedKeys: string[];
  shiftedKeys: string[];
};

function storageKey(eventId: string): string {
  return `maestroBqt:revisions:${eventId}`;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadRevisions(eventId: string): OpsRevisionSnapshot[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(storageKey(eventId));
  const parsed = safeParse<OpsRevisionSnapshot[]>(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveRevisions(
  eventId: string,
  revisions: OpsRevisionSnapshot[],
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(eventId), JSON.stringify(revisions));
}

export function isMenuLocked(eventId: string): boolean {
  const revs = loadRevisions(eventId);
  const last = revs[revs.length - 1];
  return Boolean(last?.menuLocked);
}

export function setMenuLocked(eventId: string, locked: boolean): void {
  const revs = loadRevisions(eventId);
  if (revs.length === 0) {
    // Create a minimal placeholder revision to carry the lock.
    const now = new Date().toISOString();
    const base: OpsRevisionSnapshot = {
      eventId,
      revision: 1,
      createdAt: now,
      menuLocked: locked,
      event: {
        eventId,
        startDateTime: now,
        endDateTime: now,
        guestCountExpected: 0,
        guestCountGuaranteed: 0,
        serviceStyle: "unknown",
        space: "unknown",
      },
      tasks: [],
    };
    saveRevisions(eventId, [base]);
    return;
  }

  const next = revs.slice();
  next[next.length - 1] = { ...next[next.length - 1], menuLocked: locked };
  saveRevisions(eventId, next);
}

export function taskKey(task: OpsTask): string {
  // Template tasks are stable by these fields (titles are controlled by our templates).
  return `${task.scope}:${task.department}:${task.title}`;
}

export function createRevisionSnapshot(params: {
  opsEvent: OpsEvent;
  tasks: OpsTask[];
  previous?: OpsRevisionSnapshot | null;
  summary?: string;
}): OpsRevisionSnapshot {
  const { opsEvent, tasks, previous, summary } = params;
  const prevRev = previous?.revision ?? 0;
  const menuLocked = previous?.menuLocked ?? false;

  const eventSnap: OpsEventSnapshot = {
    eventId: opsEvent.eventId,
    startDateTime: opsEvent.startDateTime,
    endDateTime: opsEvent.endDateTime,
    setupStart: opsEvent.setupStart,
    strikeEnd: opsEvent.strikeEnd,
    guestCountExpected: opsEvent.guestCountExpected,
    guestCountGuaranteed: opsEvent.guestCountGuaranteed,
    serviceStyle: opsEvent.serviceStyle,
    space: opsEvent.space,
  };

  const taskSnaps: OpsTaskSnapshot[] = tasks.map((t) => ({
    key: taskKey(t),
    taskId: t.taskId,
    scope: t.scope,
    department: t.department,
    title: t.title,
    start: t.start,
    end: t.end,
    status: t.status,
  }));

  return {
    eventId: opsEvent.eventId,
    revision: prevRev + 1,
    createdAt: new Date().toISOString(),
    summary,
    menuLocked,
    event: eventSnap,
    tasks: taskSnaps,
  };
}

export function diffRevisions(
  prev: OpsRevisionSnapshot,
  next: OpsRevisionSnapshot,
): OpsRevisionDiff {
  const changedFields: string[] = [];

  const fields: Array<keyof OpsEventSnapshot> = [
    "startDateTime",
    "endDateTime",
    "setupStart",
    "strikeEnd",
    "guestCountExpected",
    "guestCountGuaranteed",
    "serviceStyle",
    "space",
  ];

  for (const f of fields) {
    if ((prev.event as any)[f] !== (next.event as any)[f])
      changedFields.push(String(f));
  }

  const prevByKey = new Map(prev.tasks.map((t) => [t.key, t]));
  const nextByKey = new Map(next.tasks.map((t) => [t.key, t]));

  const addedKeys: string[] = [];
  const removedKeys: string[] = [];
  const shiftedKeys: string[] = [];

  for (const k of nextByKey.keys()) if (!prevByKey.has(k)) addedKeys.push(k);
  for (const k of prevByKey.keys()) if (!nextByKey.has(k)) removedKeys.push(k);

  for (const [k, t2] of nextByKey.entries()) {
    const t1 = prevByKey.get(k);
    if (!t1) continue;
    if (t1.start !== t2.start || t1.end !== t2.end) shiftedKeys.push(k);
  }

  addedKeys.sort((a, b) => a.localeCompare(b));
  removedKeys.sort((a, b) => a.localeCompare(b));
  shiftedKeys.sort((a, b) => a.localeCompare(b));

  return {
    changedFields,
    tasksAdded: addedKeys.length,
    tasksRemoved: removedKeys.length,
    tasksShifted: shiftedKeys.length,
    addedKeys,
    removedKeys,
    shiftedKeys,
  };
}
