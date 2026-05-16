import type { RequestHandler } from "express";
import {
  buildAuthenticatedProfile,
  type AuthenticatedProfileInput,
} from "../../shared/profile";
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function coerceArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
function isProfileUser(
  value: unknown,
): value is AuthenticatedProfileInput["user"] {
  if (!isRecord(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.email === "string" &&
    typeof record.title === "string" &&
    typeof record.department === "string" &&
    typeof record.entity === "string" &&
    typeof record.authenticationProvider === "string" &&
    typeof record.timezone === "string" &&
    Array.isArray(record.guardrails) &&
    record.guardrails.every((item) => typeof item === "string") &&
    Array.isArray(record.responsibilities) &&
    record.responsibilities.every((item) => typeof item === "string") &&
    typeof record.lastLoginAt === "string" &&
    typeof record.mfaEnrolled === "boolean"
  );
}
export const handleAuthenticatedProfile: RequestHandler = (req, res) => {
  const {
    user,
    sessions,
    connectors,
    automations,
    timeline,
    controls,
    currentTime,
  } = req.body ?? {};
  if (!isProfileUser(user)) {
    return res.status(400).json({ error: "user payload is required" });
  }
  const payload: AuthenticatedProfileInput = {
    user,
    sessions:
      coerceArray<AuthenticatedProfileInput["sessions"][number]>(sessions),
    connectors:
      coerceArray<AuthenticatedProfileInput["connectors"][number]>(connectors),
    automations:
      coerceArray<AuthenticatedProfileInput["automations"][number]>(
        automations,
      ),
    timeline:
      coerceArray<AuthenticatedProfileInput["timeline"][number]>(timeline),
    controls:
      coerceArray<AuthenticatedProfileInput["controls"][number]>(controls),
    currentTime: typeof currentTime === "string" ? currentTime : undefined,
  };
  try {
    const profile = buildAuthenticatedProfile(payload);
    res.json({ profile });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to compose authenticated profile.";
    res.status(500).json({ error: message });
  }
};
