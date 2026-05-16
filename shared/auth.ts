export const ROLE_VALUES = [
  "Admin",
  "Manager",
  "Receiver",
  "Chef",
  "Finance",
  "Staff",
] as const;

export type Role = (typeof ROLE_VALUES)[number];

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  role: Role;
  outlet?: string | null;
  org_id?: string;
}

function normalizeRoleString(raw: string): Role {
  const lowered = raw.trim().toLowerCase().replace(/[_-]+/g, " ");

  if (
    lowered === "admin" ||
    lowered === "owner" ||
    lowered === "administrator" ||
    lowered === "super admin" ||
    lowered === "superadmin" ||
    lowered === "sysadmin" ||
    lowered === "system admin" ||
    lowered === "root"
  ) {
    return "Admin";
  }

  if (
    lowered === "manager" ||
    lowered === "gm" ||
    lowered === "general manager" ||
    lowered === "purchasing" ||
    lowered === "purchaser" ||
    lowered === "buyer" ||
    lowered === "purchasing manager"
  ) {
    return "Manager";
  }

  if (
    lowered === "receiver" ||
    lowered === "receiving" ||
    lowered === "receiving clerk" ||
    lowered === "stock receiver"
  ) {
    return "Receiver";
  }

  if (
    lowered === "chef" ||
    lowered === "cook" ||
    lowered === "kitchen" ||
    lowered === "head chef" ||
    lowered === "executive chef"
  ) {
    return "Chef";
  }

  if (
    lowered === "finance" ||
    lowered === "accounting" ||
    lowered === "accountant" ||
    lowered === "controller" ||
    lowered === "bookkeeper"
  ) {
    return "Finance";
  }

  if (lowered === "staff" || lowered === "employee" || lowered === "team") {
    return "Staff";
  }

  return "Staff";
}

function extractRoleCandidate(input: unknown): unknown {
  if (typeof input === "string") return input;
  if (Array.isArray(input)) return input.find((v) => typeof v === "string");

  if (input && typeof input === "object") {
    const obj = input as any;
    return (
      obj.role ??
      obj.roles ??
      obj.user_metadata?.role ??
      obj.app_metadata?.role ??
      obj.profile?.role ??
      obj.claims?.role
    );
  }

  return undefined;
}

export function normalizeRole(input: unknown): Role {
  const candidate = extractRoleCandidate(input);
  if (typeof candidate === "string") return normalizeRoleString(candidate);
  return "Staff";
}

export function isRole(input: unknown): input is Role {
  return (
    typeof input === "string" &&
    (ROLE_VALUES as readonly string[]).includes(input)
  );
}
