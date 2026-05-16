import path from "path";
import { promises as fs } from "fs";

export type ForecastDay = {
  date: string;
  forecast: number;
  override?: number | null;
  notes?: string | null;
};

export type ForecastPlan = {
  orgId: string;
  startDate: string;
  days: ForecastDay[];
  updatedAt: string;
};

type StoreShape = {
  version: 1;
  plans: Record<string, ForecastPlan>;
};

const STORE_PATH = path.resolve(process.cwd(), "server/localdata/forecast-plan.v1.json");

const nowIso = () => new Date().toISOString();

const ensureDir = async () => {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
};

const readStore = async (): Promise<StoreShape> => {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed || parsed.version !== 1 || typeof parsed.plans !== "object") {
      return { version: 1, plans: {} };
    }
    return parsed;
  } catch {
    return { version: 1, plans: {} };
  }
};

const writeStore = async (next: StoreShape) => {
  await ensureDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(next, null, 2), "utf8");
};

const createDefaultPlan = (orgId: string): ForecastPlan => {
  const start = new Date();
  const days: ForecastDay[] = Array.from({ length: 21 }).map((_, idx) => {
    const day = new Date(start);
    day.setDate(start.getDate() + idx);
    return {
      date: day.toISOString().slice(0, 10),
      forecast: 120 + idx * 2,
      override: null,
      notes: null,
    };
  });
  return {
    orgId,
    startDate: start.toISOString().slice(0, 10),
    days,
    updatedAt: nowIso(),
  };
};

export const getForecastPlan = async (orgId: string) => {
  const store = await readStore();
  if (!store.plans[orgId]) {
    store.plans[orgId] = createDefaultPlan(orgId);
    await writeStore(store);
  }
  return store.plans[orgId];
};

export const updateForecastPlan = async (orgId: string, plan: ForecastPlan) => {
  const store = await readStore();
  const nextPlan: ForecastPlan = {
    ...plan,
    orgId,
    updatedAt: nowIso(),
  };
  store.plans[orgId] = nextPlan;
  await writeStore(store);
  return nextPlan;
};
