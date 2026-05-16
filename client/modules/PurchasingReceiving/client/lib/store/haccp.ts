import type {
  HACCPChecklistTask,
  HACCPTaskFrequency,
  HACCPTaskStatus,
  HACCPTrainingStatus,
} from "@shared/haccp";
import type { HACCPLog } from "@shared/purchasing";
import {
  LS,
  read,
  write,
  dateKey,
  isoWeekKey,
  id,
  sanitizeString,
  sanitizeNumber,
} from "./shared";
const HACCP_TASK_EVENT = "echo:haccp:task-status";
const HACCP_TRAINING_EVENT = "echo:haccp:training-status";
const HACCP_LOG_EVENT = "echo:haccp:log";
export const HACCP_TASK_EVENT_NAME = HACCP_TASK_EVENT;
export const HACCP_TRAINING_EVENT_NAME = HACCP_TRAINING_EVENT;
export const HACCP_LOG_EVENT_NAME = HACCP_LOG_EVENT;
type AnyRecord = Record<string, unknown>;
const normalizeHaccpLog = (
  input: unknown,
): { log: HACCPLog; changed: boolean } => {
  const raw = (
    input && typeof input === "object" ? input : {}
  ) as Partial<HACCPLog> & AnyRecord;
  let changed = false;
  const idValue = typeof raw.id === "string" && raw.id ? raw.id : id();
  if (idValue !== raw.id) changed = true;
  const outletId =
    typeof raw.outletId === "string" && raw.outletId
      ? raw.outletId
      : "unknown-outlet";
  if (outletId !== (raw.outletId ?? null)) changed = true;
  const type: HACCPLog["type"] =
    raw.type === "Storage" ? "Storage" : "Receiving";
  if (type !== raw.type) changed = true;
  const item = sanitizeString(raw.item) ?? "Unspecified item";
  if (item !== (raw.item ?? null)) changed = true;
  const tempSource =
    typeof raw.tempF === "number" && Number.isFinite(raw.tempF) ? raw.tempF : 0;
  const tempF = Math.round(tempSource * 10) / 10;
  if (tempF !== (raw.tempF ?? null)) changed = true;
  const action = sanitizeString(raw.action);
  if (action !== (raw.action ?? null)) changed = true;
  const user = sanitizeString(raw.user);
  if (user !== (raw.user ?? null)) changed = true;
  const timestamp =
    typeof raw.timestamp === "string" && raw.timestamp
      ? raw.timestamp
      : new Date().toISOString();
  if (timestamp !== (raw.timestamp ?? null)) changed = true;
  const log: HACCPLog = {
    id: idValue,
    outletId,
    type,
    item,
    tempF,
    action,
    user,
    timestamp,
  };
  return { log, changed };
};
const periodKeyForFrequency = (
  frequency: HACCPTaskFrequency,
  reference = new Date(),
): string => {
  switch (frequency) {
    case "weekly":
      return isoWeekKey(reference);
    case "daily":
      return dateKey(reference);
    case "per_delivery":
    default:
      return `${dateKey(reference)}-delivery`;
  }
};
const readHaccpTaskStatusMap = (): Record<string, HACCPTaskStatus> =>
  read(LS.haccpTasks, {} as Record<string, HACCPTaskStatus>);
const writeHaccpTaskStatusMap = (map: Record<string, HACCPTaskStatus>) =>
  write(LS.haccpTasks, map);
const readHaccpTrainingStatusMap = (): Record<string, HACCPTrainingStatus> =>
  read(LS.haccpTraining, {} as Record<string, HACCPTrainingStatus>);
const writeHaccpTrainingStatusMap = (
  map: Record<string, HACCPTrainingStatus>,
) => write(LS.haccpTraining, map);
const getCurrentTaskStatus = (
  taskId: string,
  frequency: HACCPTaskFrequency,
): HACCPTaskStatus | null => {
  const status = readHaccpTaskStatusMap()[taskId];
  if (!status) return null;
  return status.periodKey === periodKeyForFrequency(frequency) ? status : null;
};
export const haccpStore = {
  listHaccp(): HACCPLog[] {
    const raw = read(LS.haccp, [] as HACCPLog[]);
    let changedAny = false;
    const normalized = raw.map((entry) => {
      const { log, changed } = normalizeHaccpLog(entry);
      if (changed) changedAny = true;
      return log;
    });
    if (changedAny) {
      write(LS.haccp, normalized);
    }
    return normalized;
  },
  saveHaccp(h: HACCPLog) {
    const { log } = normalizeHaccpLog(h);
    const list = this.listHaccp();
    list.unshift(log);
    const trimmed = list.slice(0, 500);
    write(LS.haccp, trimmed);
    try {
      window.dispatchEvent(new CustomEvent(HACCP_LOG_EVENT, { detail: log }));
    } catch {}
  },
  listHaccpTaskStatuses(): Record<string, HACCPTaskStatus> {
    return readHaccpTaskStatusMap();
  },
  getHaccpTaskStatus(
    taskId: string,
    frequency: HACCPTaskFrequency,
  ): HACCPTaskStatus | null {
    return getCurrentTaskStatus(taskId, frequency);
  },
  setHaccpTaskCompleted(
    taskId: string,
    frequency: HACCPTaskFrequency,
    completed: boolean,
  ) {
    const map = readHaccpTaskStatusMap();
    const currentPeriod = periodKeyForFrequency(frequency);
    if (completed) {
      map[taskId] = {
        taskId,
        periodKey: currentPeriod,
        completedAt: new Date().toISOString(),
        count: 1,
      };
    } else {
      delete map[taskId];
    }
    writeHaccpTaskStatusMap(map);
    try {
      window.dispatchEvent(new CustomEvent(HACCP_TASK_EVENT));
    } catch {}
  },
  recordHaccpDelivery(taskId: string) {
    const map = readHaccpTaskStatusMap();
    const periodKey = periodKeyForFrequency("per_delivery");
    const existing = map[taskId];
    const count =
      existing && existing.periodKey === periodKey ? (existing.count ?? 0) : 0;
    map[taskId] = {
      taskId,
      periodKey,
      completedAt: new Date().toISOString(),
      count: count + 1,
    };
    writeHaccpTaskStatusMap(map);
    try {
      window.dispatchEvent(new CustomEvent(HACCP_TASK_EVENT));
    } catch {}
  },
  resetHaccpTask(taskId: string) {
    const map = readHaccpTaskStatusMap();
    if (map[taskId]) {
      delete map[taskId];
      writeHaccpTaskStatusMap(map);
      try {
        window.dispatchEvent(new CustomEvent(HACCP_TASK_EVENT));
      } catch {}
    }
  },
  listHaccpTrainingStatuses(): Record<string, HACCPTrainingStatus> {
    return readHaccpTrainingStatusMap();
  },
  getHaccpTrainingStatus(moduleId: string): HACCPTrainingStatus | null {
    const map = readHaccpTrainingStatusMap();
    return map[moduleId] ?? null;
  },
  completeHaccpTraining(
    moduleId: string,
    opts?: { completedBy?: string | null; expiresOn?: string | null },
  ) {
    const map = readHaccpTrainingStatusMap();
    map[moduleId] = {
      moduleId,
      completedAt: new Date().toISOString(),
      completedBy: opts?.completedBy ?? null,
      expiresOn: opts?.expiresOn ?? null,
    };
    writeHaccpTrainingStatusMap(map);
    try {
      window.dispatchEvent(new CustomEvent(HACCP_TRAINING_EVENT));
    } catch {}
  },
  resetHaccpTraining(moduleId: string) {
    const map = readHaccpTrainingStatusMap();
    if (map[moduleId]) {
      delete map[moduleId];
      writeHaccpTrainingStatusMap(map);
      try {
        window.dispatchEvent(new CustomEvent(HACCP_TRAINING_EVENT));
      } catch {}
    }
  },
};
