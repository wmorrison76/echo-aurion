/**
 * Genesis D — Attribution Rule Store (Local v1)
 * Stores rules + audit trail. Refresh-safe.
 */

import type {
  AttributionRule,
  RuleChangeAudit,
} from "@/../shared/types/attribution";

const RULES_KEY = "luccca:attribution_rules:v1";
const AUDIT_KEY = "luccca:attribution_rule_audit:v1";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const memoryStore = new Map<string, string>();

function getStorage(): StorageLike {
  if (typeof window === "undefined") {
    return {
      getItem: (k) => memoryStore.get(k) ?? null,
      setItem: (k, v) => {
        memoryStore.set(k, v);
      },
    };
  }

  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // ignore
  }

  return {
    getItem: (k) => memoryStore.get(k) ?? null,
    setItem: (k, v) => {
      memoryStore.set(k, v);
    },
  };
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function listAttributionRules(): AttributionRule[] {
  const storage = getStorage();
  const rules = safeParse<AttributionRule[]>(storage.getItem(RULES_KEY), []);
  return rules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

export function listAttributionAudit(): RuleChangeAudit[] {
  const storage = getStorage();
  const audits = safeParse<RuleChangeAudit[]>(storage.getItem(AUDIT_KEY), []);
  return audits.sort((a, b) =>
    (b.changedAtISO || "").localeCompare(a.changedAtISO || ""),
  );
}

function writeRules(rules: AttributionRule[]) {
  const storage = getStorage();
  storage.setItem(RULES_KEY, JSON.stringify(rules));
}

function writeAudit(audits: RuleChangeAudit[]) {
  const storage = getStorage();
  storage.setItem(AUDIT_KEY, JSON.stringify(audits));
}

function pushAudit(entry: RuleChangeAudit) {
  const audits = listAttributionAudit();
  audits.push(entry);
  writeAudit(audits);
}

export function initializeGenesisDRules(): AttributionRule[] {
  const existing = listAttributionRules();
  if (existing.length) return existing;

  const now = new Date().toISOString();
  const seed: AttributionRule[] = [
    {
      ruleId: uid("rule"),
      name: "Default — Receiving Outlet Pays (credit producer)",
      enabled: true,
      priority: 100,
      scope: { flowType: "INTERNAL_FULFILLMENT" },
      mode: "RECEIVING_PAYS",
      split: null,
      creditProducer: true,
      note: "Default commissary fulfillment: receiving outlet absorbs COGS; producer gets internal credit.",
      createdAtISO: now,
      updatedAtISO: now,
    },
    {
      ruleId: uid("rule"),
      name: "Vendor Purchase — Location Ordering Pays",
      enabled: true,
      priority: 90,
      scope: { flowType: "VENDOR_PURCHASE" },
      mode: "RECEIVING_PAYS",
      split: null,
      creditProducer: false,
      note: "External vendor purchases hit the ordering location as COGS.",
      createdAtISO: now,
      updatedAtISO: now,
    },
  ];

  writeRules(seed);

  pushAudit({
    auditId: uid("audit"),
    changedAtISO: now,
    actorId: "system",
    action: "BULK_IMPORT",
    ruleId: "seed",
    before: null,
    after: { name: "Genesis D seed rules installed" },
    note: "Genesis D initialized with default cost attribution rules.",
  });

  return seed;
}

export function upsertAttributionRule(
  rule: AttributionRule,
  actorId: string | null = "admin",
): AttributionRule {
  const rules = listAttributionRules();
  const now = new Date().toISOString();

  const idx = rules.findIndex((r) => r.ruleId === rule.ruleId);
  const before = idx >= 0 ? rules[idx] : null;

  const next: AttributionRule = {
    ...rule,
    updatedAtISO: now,
    createdAtISO: rule.createdAtISO || now,
  };

  if (idx >= 0) rules[idx] = next;
  else rules.push(next);

  writeRules(rules);

  pushAudit({
    auditId: uid("audit"),
    changedAtISO: now,
    actorId,
    action: idx >= 0 ? "UPDATE" : "CREATE",
    ruleId: next.ruleId,
    before: before ?? null,
    after: next,
    note:
      idx >= 0
        ? `Rule updated: ${next.name}. Any P&L impacts will be auto-notated.`
        : `Rule created: ${next.name}. Any P&L impacts will be auto-notated.`,
  });

  return next;
}

export function deleteAttributionRule(
  ruleId: string,
  actorId: string | null = "admin",
): boolean {
  const rules = listAttributionRules();
  const now = new Date().toISOString();
  const idx = rules.findIndex((r) => r.ruleId === ruleId);
  if (idx < 0) return false;

  const before = rules[idx];
  rules.splice(idx, 1);
  writeRules(rules);

  pushAudit({
    auditId: uid("audit"),
    changedAtISO: now,
    actorId,
    action: "DELETE",
    ruleId,
    before,
    after: null,
    note: `Rule deleted: ${before.name}. Any P&L impacts will be auto-notated.`,
  });

  return true;
}

export function toggleAttributionRule(
  ruleId: string,
  enabled: boolean,
  actorId: string | null = "admin",
): AttributionRule | null {
  const rules = listAttributionRules();
  const now = new Date().toISOString();
  const idx = rules.findIndex((r) => r.ruleId === ruleId);
  if (idx < 0) return null;

  const before = rules[idx];
  const after = { ...before, enabled, updatedAtISO: now };
  rules[idx] = after;
  writeRules(rules);

  pushAudit({
    auditId: uid("audit"),
    changedAtISO: now,
    actorId,
    action: "TOGGLE",
    ruleId,
    before,
    after,
    note: `Rule ${enabled ? "enabled" : "disabled"}: ${before.name}. Auto-notation will record this change.`,
  });

  return after;
}
