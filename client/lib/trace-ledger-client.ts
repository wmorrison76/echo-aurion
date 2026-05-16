import type {
  TraceLedgerAppendInput,
  TraceLedgerEntry,
} from "@shared/types/trace-ledger";

const STORAGE_KEY = "trace-ledger";

const memoryStore: TraceLedgerEntry[] = [];

const readEntries = (): TraceLedgerEntry[] => {
  if (typeof window === "undefined") {
    return memoryStore;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeEntries = (entries: TraceLedgerEntry[]) => {
  if (typeof window === "undefined") {
    memoryStore.splice(0, memoryStore.length, ...entries);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const traceLedgerClient = {
  append(input: TraceLedgerAppendInput): TraceLedgerEntry {
    const entry: TraceLedgerEntry = {
      id: createId(),
      orgId: input.orgId,
      entityType: input.entityType,
      entityId: input.entityId,
      sourceRef: input.sourceRef ?? null,
      payload: input.payload ?? {},
      createdAt: new Date().toISOString(),
    };
    const entries = readEntries();
    entries.unshift(entry);
    writeEntries(entries);
    return entry;
  },
  listByEntity(
    orgId: string,
    entityType: string,
    entityId: string,
    limit = 100,
  ): TraceLedgerEntry[] {
    return readEntries()
      .filter(
        (entry) =>
          entry.orgId === orgId &&
          entry.entityType === entityType &&
          entry.entityId === entityId,
      )
      .slice(0, limit);
  },
  listBySourceRef(
    orgId: string,
    sourceRef: string,
    limit = 100,
  ): TraceLedgerEntry[] {
    return readEntries()
      .filter((entry) => entry.orgId === orgId && entry.sourceRef === sourceRef)
      .slice(0, limit);
  },
  listByEntityType(
    orgId: string,
    entityType: string,
    limit = 100,
  ): TraceLedgerEntry[] {
    return readEntries()
      .filter(
        (entry) =>
          entry.orgId === orgId && entry.entityType === entityType,
      )
      .slice(0, limit);
  },
};
