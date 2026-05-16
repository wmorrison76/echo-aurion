import type { BEODocument } from "@/../shared/types/beo";

const KEY = "luccca.beo.docs.v1";
const COUNTER_KEY = "luccca.beo.counter.v1";

/**
 * v1 storage: localStorage (reversible).
 * v2 storage: server/db (same function signatures).
 */

function loadAll(): Record<string, BEODocument> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveAll(map: Record<string, BEODocument>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

function nextBeoCounter(): number {
  const raw = localStorage.getItem(COUNTER_KEY);
  const n = raw ? Number(raw) : 3763; // default start; swap to server-generated later
  const next = Number.isFinite(n) ? n + 1 : 3764;
  localStorage.setItem(COUNTER_KEY, String(next));
  return next;
}

export function createBeoNumber(): string {
  const n = nextBeoCounter();
  return `BEO #: ${n}`;
}

export function upsertBeo(doc: BEODocument): BEODocument {
  const all = loadAll();
  all[doc.beoId] = doc;
  saveAll(all);
  return doc;
}

function buildChanges(prev: BEODocument, next: BEODocument) {
  const fields: Array<{ key: keyof BEODocument; label: string }> = [
    { key: "status", label: "Status" },
    { key: "approvalStatus", label: "Approval" },
    { key: "room", label: "Room" },
    { key: "outletName", label: "Outlet" },
    { key: "start", label: "Start" },
    { key: "end", label: "End" },
    { key: "exp", label: "Expected" },
    { key: "gtd", label: "Guaranteed" },
    { key: "set", label: "Set" },
  ];

  const changes = fields
    .filter(({ key }) => prev[key] !== next[key])
    .map(({ key, label }) => ({
      path: String(key),
      label,
      previous: prev[key],
      current: next[key],
    }));

  if (JSON.stringify(prev.menu || null) !== JSON.stringify(next.menu || null)) {
    changes.push({ path: "menu", label: "Menu", previous: prev.menu, current: next.menu });
  }
  if (JSON.stringify(prev.timeline || null) !== JSON.stringify(next.timeline || null)) {
    changes.push({ path: "timeline", label: "Timeline", previous: prev.timeline, current: next.timeline });
  }
  if (JSON.stringify(prev.setup || null) !== JSON.stringify(next.setup || null)) {
    changes.push({ path: "setup", label: "Setup", previous: prev.setup, current: next.setup });
  }
  return changes;
}

export function updateBeo(doc: BEODocument, changeSummary?: string): BEODocument {
  const existing = getBeo(doc.beoId);
  if (!existing) {
    return upsertBeo(doc);
  }
  const now = new Date().toISOString();
  const changes = buildChanges(existing, doc);
  const revision = Math.max(1, (existing.revisionNumber || 1) + 1);
  const revisions = [
    ...(existing.revisions || []),
    { revision, changedAt: now, changes },
  ];
  const updated = {
    ...doc,
    updatedAt: now,
    revisionNumber: revision,
    revisions,
    lastChangeSummary: changeSummary || doc.lastChangeSummary,
  };
  return upsertBeo(updated);
}

export function setBeoApproval(
  beoId: string,
  approval: { by: string; status: "approved" | "rejected"; notes?: string },
): BEODocument | null {
  const existing = getBeo(beoId);
  if (!existing) return null;
  const approvals = [...(existing.approvals || []), { ...approval, at: new Date().toISOString() }];
  return updateBeo(
    {
      ...existing,
      approvalStatus: approval.status,
      approvals,
    },
    `Approval ${approval.status}`,
  );
}

export function getBeo(beoId: string): BEODocument | null {
  const all = loadAll();
  return all[beoId] ?? null;
}

export function listBeosByEvent(eventId: string): BEODocument[] {
  const all = loadAll();
  return Object.values(all)
    .filter((d) => d.eventId === eventId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listBeos(): BEODocument[] {
  const all = loadAll();
  return Object.values(all).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
