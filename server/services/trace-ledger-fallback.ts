import path from "path";
import { promises as fs } from "fs";
import type {
  TraceLedgerAppendInput,
  TraceLedgerEntry,
} from "../../shared/types/trace-ledger";
import { TraceLedgerService } from "./trace-ledger-service";

const STORE_PATH = path.resolve(process.cwd(), "server/localdata/trace-ledger.v1.json");

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `trace_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const ensureDir = async () => {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
};

const readStore = async (): Promise<TraceLedgerEntry[]> => {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const appendLocal = async (input: TraceLedgerAppendInput) => {
  const entry: TraceLedgerEntry = {
    id: createId(),
    orgId: input.orgId,
    entityType: input.entityType,
    entityId: input.entityId,
    sourceRef: input.sourceRef ?? null,
    payload: input.payload ?? {},
    createdAt: new Date().toISOString(),
  };
  const existing = await readStore();
  existing.unshift(entry);
  await ensureDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(existing, null, 2), "utf8");
  return entry;
};

export const appendTraceEvent = async (input: TraceLedgerAppendInput) => {
  try {
    const service = new TraceLedgerService();
    return await service.append(input);
  } catch {
    return appendLocal(input);
  }
};
