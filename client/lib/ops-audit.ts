import type { OpsAuditEntry, OpsAuditEntityType, OpsAuditAction, OpsRole } from "@shared/types/audit";
import { getOpsRole } from "./ops-rbac";

const STORAGE_PREFIX = "ops:audit:";
const MAX_ENTRIES = 5000;

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function storageKey(orgId: string): string {
  return `${STORAGE_PREFIX}${orgId}`;
}

function getOrgId(): string {
  if (typeof window === "undefined") return "default";
  const raw = window.localStorage.getItem("auth_org");
  if (raw) {
    try {
      const parsed: any = JSON.parse(raw);
      const id = String(parsed?.id || "").trim();
      if (id) return id;
    } catch {
      // ignore
    }
  }
  const userRaw = window.localStorage.getItem("auth_user");
  if (userRaw) {
    try {
      const parsed: any = JSON.parse(userRaw);
      const id = String(parsed?.org_id || "").trim();
      if (id) return id;
    } catch {
      // ignore
    }
  }
  return String(window.localStorage.getItem("orgId") || "default");
}

function getActor(): { userId?: string; name?: string; role: OpsRole } {
  const role = getOpsRole();
  if (typeof window === "undefined") return { role };
  const raw = window.localStorage.getItem("auth_user");
  if (!raw) return { role };
  try {
    const parsed: any = JSON.parse(raw);
    return {
      userId: parsed?.id ? String(parsed.id) : undefined,
      name: parsed?.name ? String(parsed.name) : undefined,
      role,
    };
  } catch {
    return { role };
  }
}

function safeParse(raw: string | null): OpsAuditEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OpsAuditEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendAuditEntry(input: {
  eventId?: string;
  beoId?: string;
  entityType: OpsAuditEntityType;
  entityId: string;
  action: OpsAuditAction;
  summary: string;
  details?: Record<string, unknown>;
}): OpsAuditEntry {
  const orgId = getOrgId();
  const key = storageKey(orgId);
  const actor = getActor();

  const entry: OpsAuditEntry = {
    id: uuid(),
    at: new Date().toISOString(),
    actor,
    eventId: input.eventId,
    beoId: input.beoId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    summary: input.summary,
    details: input.details,
  };

  if (typeof window === "undefined") return entry;
  const list = safeParse(window.localStorage.getItem(key));
  const next = [entry, ...list].slice(0, MAX_ENTRIES);
  window.localStorage.setItem(key, JSON.stringify(next));
  return entry;
}

export function listAuditEntries(params?: {
  eventId?: string;
  entityType?: OpsAuditEntityType;
  entityId?: string;
  limit?: number;
}): OpsAuditEntry[] {
  if (typeof window === "undefined") return [];
  const orgId = getOrgId();
  const key = storageKey(orgId);
  const list = safeParse(window.localStorage.getItem(key));

  const filtered = list.filter((e) => {
    if (params?.eventId && e.eventId !== params.eventId) return false;
    if (params?.entityType && e.entityType !== params.entityType) return false;
    if (params?.entityId && e.entityId !== params.entityId) return false;
    return true;
  });
  return filtered.slice(0, Math.max(1, Math.min(500, params?.limit ?? 100)));
}

