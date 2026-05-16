import type { OpsTask } from "@shared/types/ops-gantt";
import { taskKey } from "./revision-store";

export type TaskOverride = {
  key: string;
  status?: OpsTask["status"];
  percentComplete?: number;
};

function storageKey(eventId: string): string {
  return `maestroBqt:taskOverrides:${eventId}`;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadTaskOverrides(eventId: string): TaskOverride[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<TaskOverride[]>(
    window.localStorage.getItem(storageKey(eventId)),
  );
  return Array.isArray(parsed) ? parsed : [];
}

export function saveTaskOverrides(
  eventId: string,
  overrides: TaskOverride[],
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(eventId), JSON.stringify(overrides));
}

export function applyTaskOverrides(
  tasks: OpsTask[],
  overrides: TaskOverride[],
): OpsTask[] {
  if (!overrides.length) return tasks;
  const byKey = new Map(overrides.map((o) => [o.key, o]));
  return tasks.map((t) => {
    const o = byKey.get(taskKey(t));
    if (!o) return t;
    return {
      ...t,
      status: o.status ?? t.status,
      percentComplete:
        typeof o.percentComplete === "number"
          ? o.percentComplete
          : t.percentComplete,
    };
  });
}

export function upsertTaskOverride(
  eventId: string,
  task: OpsTask,
  patch: { status?: OpsTask["status"]; percentComplete?: number },
): void {
  const key = taskKey(task);
  const list = loadTaskOverrides(eventId);
  const idx = list.findIndex((o) => o.key === key);
  const next: TaskOverride = {
    key,
    status: patch.status,
    percentComplete: patch.percentComplete,
  };
  if (idx >= 0) {
    const copy = list.slice();
    copy[idx] = { ...copy[idx], ...next };
    saveTaskOverrides(eventId, copy);
  } else {
    saveTaskOverrides(eventId, [next, ...list]);
  }
}
