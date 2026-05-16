import type { OpsConfirmation, OpsConfirmationKind, OpsConfirmationStatus, OpsRole } from "@shared/types/confirmations";
import { getOpsRole } from "./ops-rbac";

const STORAGE_PREFIX = "ops:confirmations:";
const MAX_ENTRIES = 5000;

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(16).slice(2)}-${Date.now()}`;
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

function storageKey(orgId: string): string {
  return `${STORAGE_PREFIX}${orgId}`;
}

function safeParse(raw: string | null): OpsConfirmation[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OpsConfirmation[]) : [];
  } catch {
    return [];
  }
}

export function appendConfirmation(input: {
  eventId: string;
  beoId?: string;
  kind: OpsConfirmationKind;
  status?: OpsConfirmationStatus;
  message: string;
  link?: OpsConfirmation["link"];
}): OpsConfirmation {
  const orgId = getOrgId();
  const key = storageKey(orgId);
  const actor = getActor();

  const entry: OpsConfirmation = {
    id: uuid(),
    at: new Date().toISOString(),
    actor,
    eventId: input.eventId,
    beoId: input.beoId,
    kind: input.kind,
    status: input.status ?? "pending",
    message: input.message,
    link: input.link,
  };

  if (typeof window === "undefined") return entry;
  const list = safeParse(window.localStorage.getItem(key));
  const next = [entry, ...list].slice(0, MAX_ENTRIES);
  window.localStorage.setItem(key, JSON.stringify(next));
  return entry;
}

export function listConfirmations(params: { eventId: string; limit?: number }): OpsConfirmation[] {
  if (typeof window === "undefined") return [];
  const orgId = getOrgId();
  const key = storageKey(orgId);
  const list = safeParse(window.localStorage.getItem(key));
  return list.filter((e) => e.eventId === params.eventId).slice(0, Math.max(1, Math.min(500, params.limit ?? 50)));
}

export function setConfirmationStatus(params: { id: string; status: OpsConfirmationStatus }): void {
  if (typeof window === "undefined") return;
  const orgId = getOrgId();
  const key = storageKey(orgId);
  const list = safeParse(window.localStorage.getItem(key));
  const idx = list.findIndex((e) => e.id === params.id);
  if (idx < 0) return;
  const next = list.slice();
  next[idx] = { ...next[idx], status: params.status };
  window.localStorage.setItem(key, JSON.stringify(next));
}

