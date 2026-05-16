/**
 * Local CRM Store (dev fallback)
 *
 * When Supabase service-role credentials are not configured, CRM endpoints should still
 * function for local development and demos. This store persists CRM data to a JSON file
 * inside the repo (workspace) keyed by org_id.
 */

import { promises as fs } from "fs";
import path from "path";
import { logger } from "./logger";

export type LocalClient = {
  id: string;
  org_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  address_country?: string | null;
  event_type?: string | null;
  budget?: number | null;
  guest_count?: number | null;
  notes?: string | null;
  tags?: string[] | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type LocalGoal = {
  org_id: string;
  month: string; // YYYY-MM-01
  goal_revenue: number;
  created_by?: string | null;
  updated_at: string;
};

export type LocalProspect = {
  id: string;
  org_id: string;
  event_date: string; // YYYY-MM-DD
  estimated_revenue: number;
  status: string;
  deleted_at?: string | null;
};

export type LocalSalesGoal = {
  id: string;
  org_id: string;
  user_id: string;
  year: number;
  annual_target: number;
  monthly_targets: Record<string, number>;
  conversion_ratio: {
    prospects: number;
    clients: number;
    wins: number;
  };
  pipeline_target: number;
  created_by?: string | null;
  updated_at: string;
};

type StoreShape = {
  version: 1;
  orgs: Record<
    string,
    {
      clients: LocalClient[];
      goals: LocalGoal[];
      prospects: LocalProspect[];
      salesGoals: LocalSalesGoal[];
    }
  >;
};

const STORE_PATH = path.resolve(process.cwd(), "server/localdata/crm.v1.json");

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function ensureDirExists() {
  const dir = path.dirname(STORE_PATH);
  await fs.mkdir(dir, { recursive: true });
}

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed || parsed.version !== 1 || typeof parsed.orgs !== "object") {
      return { version: 1, orgs: {} };
    }
    return parsed;
  } catch {
    return { version: 1, orgs: {} };
  }
}

async function writeStore(next: StoreShape) {
  await ensureDirExists();
  await fs.writeFile(STORE_PATH, JSON.stringify(next, null, 2), "utf8");
}

async function getOrgBucket(orgId: string) {
  const store = await readStore();
  if (!store.orgs[orgId]) {
    store.orgs[orgId] = { clients: [], goals: [], prospects: [], salesGoals: [] };
    await writeStore(store);
  }
  if (!Array.isArray(store.orgs[orgId].salesGoals)) {
    store.orgs[orgId].salesGoals = [];
    await writeStore(store);
  }
  return { store, bucket: store.orgs[orgId] };
}

export async function listClients(args: {
  orgId: string;
  search?: string;
  limit: number;
  offset: number;
}): Promise<{ total: number; clients: LocalClient[] }> {
  const { bucket } = await getOrgBucket(args.orgId);
  const q = (args.search || "").toLowerCase().trim();
  const filtered = q
    ? bucket.clients.filter((c) => {
        const hay = `${c.name || ""} ${c.email || ""} ${c.company || ""}`.toLowerCase();
        return hay.includes(q);
      })
    : bucket.clients.slice();

  filtered.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return {
    total: filtered.length,
    clients: filtered.slice(args.offset, args.offset + args.limit),
  };
}

export async function createClient(args: {
  orgId: string;
  userId: string;
  client: Omit<LocalClient, "id" | "org_id" | "created_at" | "updated_at"> & { name: string };
}): Promise<LocalClient> {
  const { store, bucket } = await getOrgBucket(args.orgId);

  if (args.client.email) {
    const email = String(args.client.email).toLowerCase().trim();
    const exists = bucket.clients.some((c) => String(c.email || "").toLowerCase() === email);
    if (exists) {
      const err: any = new Error("Contact with that email already exists");
      err.code = "DUPLICATE_EMAIL";
      throw err;
    }
  }

  const now = nowIso();
  const next: LocalClient = {
    id: uid("client"),
    org_id: args.orgId,
    created_by: args.userId,
    created_at: now,
    updated_at: now,
    tags: [],
    ...args.client,
  };

  bucket.clients.unshift(next);
  await writeStore(store);
  return next;
}

export async function getClient(args: { orgId: string; id: string }): Promise<LocalClient | null> {
  const { bucket } = await getOrgBucket(args.orgId);
  return bucket.clients.find((c) => c.id === args.id) || null;
}

export async function updateClient(args: {
  orgId: string;
  id: string;
  updates: Partial<Omit<LocalClient, "id" | "org_id" | "created_at" | "created_by">>;
}): Promise<LocalClient | null> {
  const { store, bucket } = await getOrgBucket(args.orgId);
  const idx = bucket.clients.findIndex((c) => c.id === args.id);
  if (idx === -1) return null;
  const cur = bucket.clients[idx];
  const next: LocalClient = { ...cur, ...args.updates, updated_at: nowIso() };
  bucket.clients[idx] = next;
  await writeStore(store);
  return next;
}

export async function deleteClient(args: { orgId: string; id: string }): Promise<boolean> {
  const { store, bucket } = await getOrgBucket(args.orgId);
  const before = bucket.clients.length;
  bucket.clients = bucket.clients.filter((c) => c.id !== args.id);
  if (bucket.clients.length === before) return false;
  await writeStore(store);
  return true;
}

export async function listGoals(args: {
  orgId: string;
  fromMonth: string;
  toMonthExclusive: string;
}): Promise<LocalGoal[]> {
  const { bucket } = await getOrgBucket(args.orgId);
  return bucket.goals
    .filter((g) => g.month >= args.fromMonth && g.month < args.toMonthExclusive)
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function upsertGoal(args: {
  orgId: string;
  userId: string;
  month: string;
  goalRevenue: number;
}): Promise<LocalGoal> {
  const { store, bucket } = await getOrgBucket(args.orgId);
  const month = args.month;
  const idx = bucket.goals.findIndex((g) => g.month === month);
  const next: LocalGoal = {
    org_id: args.orgId,
    month,
    goal_revenue: args.goalRevenue,
    created_by: args.userId,
    updated_at: nowIso(),
  };
  if (idx >= 0) {
    bucket.goals[idx] = { ...bucket.goals[idx], ...next };
  } else {
    bucket.goals.push(next);
  }
  await writeStore(store);
  return next;
}

export async function listProspects(args: { orgId: string }): Promise<LocalProspect[]> {
  const { bucket } = await getOrgBucket(args.orgId);
  return bucket.prospects.filter((p) => !p.deleted_at);
}

export async function listSalesGoals(args: {
  orgId: string;
  year: number;
}): Promise<LocalSalesGoal[]> {
  const { bucket } = await getOrgBucket(args.orgId);
  return bucket.salesGoals.filter((g) => g.year === args.year);
}

export async function upsertSalesGoal(args: {
  orgId: string;
  userId: string;
  year: number;
  annualTarget: number;
  monthlyTargets: Record<string, number>;
  conversionRatio: LocalSalesGoal["conversion_ratio"];
  pipelineTarget: number;
  createdBy?: string | null;
}): Promise<LocalSalesGoal> {
  const { store, bucket } = await getOrgBucket(args.orgId);
  const idx = bucket.salesGoals.findIndex(
    (g) => g.user_id === args.userId && g.year === args.year,
  );
  const next: LocalSalesGoal = {
    id: idx >= 0 ? bucket.salesGoals[idx].id : uid("sales_goal"),
    org_id: args.orgId,
    user_id: args.userId,
    year: args.year,
    annual_target: args.annualTarget,
    monthly_targets: args.monthlyTargets,
    conversion_ratio: args.conversionRatio,
    pipeline_target: args.pipelineTarget,
    created_by: args.createdBy || args.userId,
    updated_at: nowIso(),
  };
  if (idx >= 0) {
    bucket.salesGoals[idx] = { ...bucket.salesGoals[idx], ...next };
  } else {
    bucket.salesGoals.push(next);
  }
  await writeStore(store);
  return next;
}

export async function ensureLocalCrmSeed(orgId: string) {
  try {
    const { store, bucket } = await getOrgBucket(orgId);
    if (bucket.clients.length > 0 || bucket.prospects.length > 0) return;

    const now = new Date();
    const date = (d: Date) => d.toISOString().slice(0, 10);
    bucket.clients = [
      {
        id: uid("client"),
        org_id: orgId,
        name: "Acme Corp",
        email: "events@acme.test",
        company: "Acme Corporation",
        phone: null,
        tags: ["vip"],
        created_by: "seed",
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ];
    bucket.prospects = [
      {
        id: uid("prospect"),
        org_id: orgId,
        event_date: date(new Date(now.getTime() + 14 * 86400000)),
        estimated_revenue: 18000,
        status: "proposal",
      },
      {
        id: uid("prospect"),
        org_id: orgId,
        event_date: date(new Date(now.getTime() + 35 * 86400000)),
        estimated_revenue: 42000,
        status: "qualified",
      },
    ];
    await writeStore(store);
  } catch (error) {
    logger.warn("[LocalCRM] Failed to seed local CRM store", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

