import type { UserRole } from "./auth";
export type SessionRiskLevel = "low" | "medium" | "high";
export type GuardrailStatus = "active" | "monitoring" | "bypassed";
export interface SessionGuardrail {
  id: string;
  name: string;
  status: GuardrailStatus;
  description?: string;
  lastValidatedAt?: string;
}
export interface SessionFeature {
  id: string;
  name: string;
  allowed: boolean;
  reason?: string;
}
export interface SessionPersona {
  id: string;
  userId: string;
  name: string;
  email: string;
  title: string;
  description: string;
  role: UserRole;
  avatarUrl?: string;
  propertyIds: string[];
  sessionRisk: SessionRiskLevel;
  mfaVerified: boolean;
  guardrails: SessionGuardrail[];
  features: SessionFeature[];
}
export interface SessionEnvelope {
  token: string;
  personaId: string;
  userId: string;
  name: string;
  email: string;
  title: string;
  role: UserRole;
  avatarUrl?: string;
  issuedAt: string;
  expiresAt: string;
  lastActiveAt: string;
  propertyIds: string[];
  sessionRisk: SessionRiskLevel;
  mfaVerified: boolean;
  guardrails: SessionGuardrail[];
  features: SessionFeature[];
}
export interface SessionSummary {
  token: string;
  personaId: string;
  role: UserRole;
  expiresAt: string;
  lastActiveAt: string;
}
export function guardrailActive(
  guardrails: SessionGuardrail[],
  guardrailId: string,
) {
  return guardrails.some(
    (guardrail) =>
      guardrail.id === guardrailId && guardrail.status === "active",
  );
}
