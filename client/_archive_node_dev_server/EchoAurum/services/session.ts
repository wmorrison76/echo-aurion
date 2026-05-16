import { randomUUID } from "node:crypto";
import { ROLE_LABELS, isRoleAtLeast, type UserRole } from "../../shared/auth";
import {
  guardrailActive,
  type SessionEnvelope,
  type SessionFeature,
  type SessionGuardrail,
  type SessionPersona,
} from "../../shared/session";
const SESSION_DURATION_MS = 1000 * 60 * 90;
export const GUARDRAIL_IDS = {
  AP_RELEASE: "guard.ap.zelda",
  CASH_LIQUIDITY: "guard.cash.argus",
  COMPLIANCE_EVIDENCE: "guard.compliance.evidence",
  AUTOMATION_PIPELINE: "guard.automation.zapier",
  SENTINEL_RISK: "guard.security.sentinel",
} as const;
interface SessionRecord extends SessionEnvelope {}
const PERSONAS: SessionPersona[] = [
  {
    id: "persona-william-admin",
    userId: "user-william-admin",
    name: "William",
    email: "william@luccca.cloud",
    title: "System Administrator",
    description:
      "Full system access with admin privileges across all entities.",
    role: "admin",
    avatarUrl: "https://cdn.luccca.cloud/avatars/william.png",
    propertyIds: [
      "pacific-grove-resort",
      "echo-towers",
      "harborline-hotel",
      "sierra-crest-lodge",
    ],
    sessionRisk: "low",
    mfaVerified: true,
    guardrails: [
      {
        id: GUARDRAIL_IDS.AP_RELEASE,
        name: "Zelda AP release guardrail",
        status: "active",
        description:
          "All payment batches require Zelda policy checks before release.",
        lastValidatedAt: "2024-11-05T14:32:00Z",
      },
      {
        id: GUARDRAIL_IDS.CASH_LIQUIDITY,
        name: "Argus liquidity thresholds",
        status: "active",
        description:
          "Argus reconciles treasury balances against min liquidity policy.",
        lastValidatedAt: "2024-11-05T14:18:00Z",
      },
      {
        id: GUARDRAIL_IDS.COMPLIANCE_EVIDENCE,
        name: "Binder evidence notarization",
        status: "active",
        description:
          "CPA Bridge notarizes evidence packages with SOC 2 controls.",
        lastValidatedAt: "2024-11-04T21:45:00Z",
      },
      {
        id: GUARDRAIL_IDS.AUTOMATION_PIPELINE,
        name: "Zapier automation heartbeat",
        status: "active",
        description:
          "Zapier workflows orchestrate evidence capture and escalations.",
        lastValidatedAt: "2024-11-05T13:58:00Z",
      },
      {
        id: GUARDRAIL_IDS.SENTINEL_RISK,
        name: "EchoSentinel anomaly radar",
        status: "active",
        description:
          "Sentinel evaluates ledger, POS, and bank feeds for anomalies.",
        lastValidatedAt: "2024-11-05T12:06:00Z",
      },
    ],
    features: [
      {
        id: "feature.ap.workflow",
        name: "Accounts payable workflow",
        allowed: true,
      },
      { id: "feature.ledger.explorer", name: "Ledger explorer", allowed: true },
      {
        id: "feature.compliance.dashboard",
        name: "Compliance dashboard",
        allowed: true,
      },
      {
        id: "feature.cash.optimization",
        name: "Cash optimization",
        allowed: true,
      },
      {
        id: "feature.guardrails.sentinel",
        name: "EchoSentinel guardrails",
        allowed: true,
      },
    ],
  },
  {
    id: "persona-morgan-ellis",
    userId: "user-morgan-ellis",
    name: "Morgan Ellis",
    email: "morgan.ellis@luccca.cloud",
    title: "VP Finance & Treasury",
    description:
      "Treasury owner with end-to-end authority across LUCCCA holdings.",
    role: "admin",
    avatarUrl: "https://cdn.luccca.cloud/avatars/morgan-ellis.png",
    propertyIds: ["pacific-grove-resort", "echo-towers", "harborline-hotel"],
    sessionRisk: "low",
    mfaVerified: true,
    guardrails: [
      {
        id: GUARDRAIL_IDS.AP_RELEASE,
        name: "Zelda AP release guardrail",
        status: "active",
        description:
          "All payment batches require Zelda policy checks before release.",
        lastValidatedAt: "2024-11-05T14:32:00Z",
      },
      {
        id: GUARDRAIL_IDS.CASH_LIQUIDITY,
        name: "Argus liquidity thresholds",
        status: "active",
        description:
          "Argus reconciles treasury balances against min liquidity policy.",
        lastValidatedAt: "2024-11-05T14:18:00Z",
      },
      {
        id: GUARDRAIL_IDS.COMPLIANCE_EVIDENCE,
        name: "Binder evidence notarization",
        status: "active",
        description:
          "CPA Bridge notarizes evidence packages with SOC 2 controls.",
        lastValidatedAt: "2024-11-04T21:45:00Z",
      },
      {
        id: GUARDRAIL_IDS.AUTOMATION_PIPELINE,
        name: "Zapier automation heartbeat",
        status: "active",
        description:
          "Zapier workflows orchestrate evidence capture and escalations.",
        lastValidatedAt: "2024-11-05T13:58:00Z",
      },
      {
        id: GUARDRAIL_IDS.SENTINEL_RISK,
        name: "EchoSentinel anomaly radar",
        status: "active",
        description:
          "Sentinel evaluates ledger, POS, and bank feeds for anomalies.",
        lastValidatedAt: "2024-11-05T12:06:00Z",
      },
    ],
    features: [
      {
        id: "feature.ap.workflow",
        name: "Accounts payable workflow",
        allowed: true,
      },
      { id: "feature.ledger.explorer", name: "Ledger explorer", allowed: true },
      {
        id: "feature.compliance.dashboard",
        name: "Compliance dashboard",
        allowed: true,
      },
      {
        id: "feature.cash.optimization",
        name: "Cash optimization",
        allowed: true,
      },
      {
        id: "feature.guardrails.sentinel",
        name: "EchoSentinel guardrails",
        allowed: true,
      },
    ],
  },
  {
    id: "persona-alexis-roy",
    userId: "user-alexis-roy",
    name: "Alexis Roy",
    email: "alexis.roy@luccca.cloud",
    title: "Corporate Controller",
    description:
      "Controller scope with treasury and compliance guardrails enforced.",
    role: "controller",
    avatarUrl: "https://cdn.luccca.cloud/avatars/alexis-roy.png",
    propertyIds: ["pacific-grove-resort", "sierra-crest-lodge"],
    sessionRisk: "medium",
    mfaVerified: true,
    guardrails: [
      {
        id: GUARDRAIL_IDS.AP_RELEASE,
        name: "Zelda AP release guardrail",
        status: "active",
        description: "AP disbursements require Zelda variance sign-off.",
        lastValidatedAt: "2024-11-05T13:04:00Z",
      },
      {
        id: GUARDRAIL_IDS.CASH_LIQUIDITY,
        name: "Argus liquidity thresholds",
        status: "active",
        description: "Cash ladder guardrails monitor working capital daily.",
        lastValidatedAt: "2024-11-05T11:42:00Z",
      },
      {
        id: GUARDRAIL_IDS.COMPLIANCE_EVIDENCE,
        name: "Binder evidence notarization",
        status: "monitoring",
        description: "Evidence notarization scheduled nightly via CPA Bridge.",
        lastValidatedAt: "2024-11-04T22:30:00Z",
      },
      {
        id: GUARDRAIL_IDS.AUTOMATION_PIPELINE,
        name: "Zapier automation heartbeat",
        status: "active",
        description:
          "Automation workflows capture receiving variance evidence.",
        lastValidatedAt: "2024-11-05T13:11:00Z",
      },
      {
        id: GUARDRAIL_IDS.SENTINEL_RISK,
        name: "EchoSentinel anomaly radar",
        status: "active",
        description: "Sentinel monitors ledger balances for anomaly scores.",
        lastValidatedAt: "2024-11-05T11:18:00Z",
      },
    ],
    features: [
      {
        id: "feature.ap.workflow",
        name: "Accounts payable workflow",
        allowed: true,
      },
      { id: "feature.ledger.explorer", name: "Ledger explorer", allowed: true },
      {
        id: "feature.compliance.dashboard",
        name: "Compliance dashboard",
        allowed: true,
      },
      {
        id: "feature.cash.optimization",
        name: "Cash optimization",
        allowed: true,
      },
      {
        id: "feature.guardrails.sentinel",
        name: "EchoSentinel guardrails",
        allowed: true,
      },
    ],
  },
  {
    id: "persona-jordan-avery",
    userId: "user-jordan-avery",
    name: "Jordan Avery",
    email: "jordan.avery@luccca.cloud",
    title: "Compliance & Audit Liaison",
    description:
      "Audit-ready scope with evidence, ledger, and variance visibility.",
    role: "auditor",
    avatarUrl: "https://cdn.luccca.cloud/avatars/jordan-avery.png",
    propertyIds: ["echo-towers", "harborline-hotel"],
    sessionRisk: "low",
    mfaVerified: true,
    guardrails: [
      {
        id: GUARDRAIL_IDS.AP_RELEASE,
        name: "Zelda AP release guardrail",
        status: "monitoring",
        description: "Read-only audit of Zelda guardrail outcomes.",
        lastValidatedAt: "2024-11-04T20:55:00Z",
      },
      {
        id: GUARDRAIL_IDS.CASH_LIQUIDITY,
        name: "Argus liquidity thresholds",
        status: "monitoring",
        description: "Audit visibility into Argus liquidity compliance.",
        lastValidatedAt: "2024-11-05T07:50:00Z",
      },
      {
        id: GUARDRAIL_IDS.COMPLIANCE_EVIDENCE,
        name: "Binder evidence notarization",
        status: "active",
        description:
          "CPA Bridge guardrail notarizes evidence packages for audit.",
        lastValidatedAt: "2024-11-05T02:18:00Z",
      },
      {
        id: GUARDRAIL_IDS.AUTOMATION_PIPELINE,
        name: "Zapier automation heartbeat",
        status: "monitoring",
        description: "Automation telemetry exposed for audit review.",
        lastValidatedAt: "2024-11-05T09:34:00Z",
      },
      {
        id: GUARDRAIL_IDS.SENTINEL_RISK,
        name: "EchoSentinel anomaly radar",
        status: "active",
        description: "Audit evidence includes Sentinel anomaly narratives.",
        lastValidatedAt: "2024-11-05T08:41:00Z",
      },
    ],
    features: [
      {
        id: "feature.ap.workflow",
        name: "Accounts payable workflow",
        allowed: false,
        reason: "Audit personas operate in read-only mode.",
      },
      { id: "feature.ledger.explorer", name: "Ledger explorer", allowed: true },
      {
        id: "feature.compliance.dashboard",
        name: "Compliance dashboard",
        allowed: true,
      },
      {
        id: "feature.cash.optimization",
        name: "Cash optimization",
        allowed: false,
        reason: "Cash controls limited to controller personas.",
      },
      {
        id: "feature.guardrails.sentinel",
        name: "EchoSentinel guardrails",
        allowed: true,
      },
    ],
  },
];
const sessions = new Map<string, SessionRecord>();
export type { SessionRecord };
function cloneGuardrails(guardrails: SessionGuardrail[]) {
  return guardrails.map((guardrail) => ({ ...guardrail }));
}
function cloneFeatures(features: SessionFeature[]) {
  return features.map((feature) => ({ ...feature }));
}
function nowIso() {
  return new Date().toISOString();
}
export function listSessionPersonas(): SessionPersona[] {
  return PERSONAS.map((persona) => ({
    ...persona,
    guardrails: cloneGuardrails(persona.guardrails),
    features: cloneFeatures(persona.features),
  }));
}
export function issueSession(personaId: string): SessionRecord {
  const persona = PERSONAS.find((item) => item.id === personaId);
  if (!persona) {
    throw new Error("Persona not found");
  }
  const issuedAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  const token = `sess_${randomUUID()}`;
  const record: SessionRecord = {
    token,
    personaId: persona.id,
    userId: persona.userId,
    name: persona.name,
    email: persona.email,
    title: persona.title,
    role: persona.role,
    avatarUrl: persona.avatarUrl,
    issuedAt,
    expiresAt,
    lastActiveAt: issuedAt,
    propertyIds: [...persona.propertyIds],
    sessionRisk: persona.sessionRisk,
    mfaVerified: persona.mfaVerified,
    guardrails: cloneGuardrails(persona.guardrails),
    features: cloneFeatures(persona.features),
  };
  sessions.set(token, record);
  return record;
}
export function touchSession(token: string) {
  const session = sessions.get(token);
  if (session) {
    session.lastActiveAt = nowIso();
  }
}
export function getSession(token: string): SessionRecord | null {
  const session = sessions.get(token);
  if (!session) {
    return null;
  }
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return {
    ...session,
    guardrails: cloneGuardrails(session.guardrails),
    features: cloneFeatures(session.features),
  };
}
export function revokeSession(token: string) {
  sessions.delete(token);
}
export function ensureRole(session: SessionRecord, requiredRole: UserRole) {
  return isRoleAtLeast(session.role, requiredRole);
}
export function ensureGuardrails(
  session: SessionRecord,
  guardrailIds: string[],
) {
  const missing = guardrailIds.filter(
    (id) => !guardrailActive(session.guardrails, id),
  );
  return { allowed: missing.length === 0, missing };
}
export function ensurePropertyScope(
  session: SessionRecord,
  propertyId?: string | null,
) {
  if (!propertyId) {
    return true;
  }
  return session.propertyIds.includes(propertyId);
}
export function describeSession(session: SessionRecord) {
  return `${session.name} (${ROLE_LABELS[session.role]})`;
}
