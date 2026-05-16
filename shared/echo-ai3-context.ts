export type EchoSurface =
  | "global"
  | "module"
  | "schedule"
  | "finance"
  | "hr"
  | "operations"
  | "analytics"
  | "assistant";

export interface EchoPermissionProfile {
  normalizedRole: string;
  canAccessOperationalModules: boolean;
  canAccessFinanceModules: boolean;
  canAccessHrModules: boolean;
  canAccessCompensation: boolean;
  canAccessPayroll: boolean;
  canAskSensitiveData: boolean;
}

export interface EchoContextInput {
  pathname?: string;
  explicitModule?: string;
  selectedOutlet?: string;
  userRole?: string | null | undefined;
  payrollVerified?: boolean;
  surface?: EchoSurface;
}

export interface EchoResolvedContext {
  pathname: string;
  activeModule: string;
  moduleFamily: string;
  selectedOutlet: string;
  surface: EchoSurface;
  userRole?: string;
  permissions: EchoPermissionProfile;
}

const ROUTE_TO_MODULE_FAMILY: Record<string, string> = {
  schedule: "schedule",
  culinary: "culinary",
  pastry: "culinary",
  inventory: "inventory",
  "ordering-inventory": "inventory",
  purchasing: "inventory",
  supplychain: "supply-chain",
  "supply-chain": "supply-chain",
  finance: "finance",
  aurum: "finance",
  "echo-aurum": "finance",
  hr: "hr",
  "hr-payroll": "hr",
  payroll: "hr",
  analytics: "analytics",
  dashboard: "operations",
  guestexperience: "operations",
  "guest-experience": "operations",
  maestro: "operations",
};

const SENSITIVE_MODULE_FAMILIES = new Set(["finance", "hr"]);

export function normalizeEchoRole(role?: string | null): string {
  return String(role || "").trim().toLowerCase();
}

export function resolveEchoModuleFamily(moduleName?: string, pathname?: string): string {
  const normalizedModule = String(moduleName || "").trim().toLowerCase();
  if (normalizedModule && ROUTE_TO_MODULE_FAMILY[normalizedModule]) {
    return ROUTE_TO_MODULE_FAMILY[normalizedModule];
  }

  const pathModule = String(pathname || "")
    .replace(/^\//, "")
    .split("/")[0]
    .trim()
    .toLowerCase();

  if (pathModule && ROUTE_TO_MODULE_FAMILY[pathModule]) {
    return ROUTE_TO_MODULE_FAMILY[pathModule];
  }

  return normalizedModule || pathModule || "global";
}

export function resolveEchoPermissionProfile(
  role?: string | null,
  payrollVerified = false,
): EchoPermissionProfile {
  const normalizedRole = normalizeEchoRole(role);
  const privilegedRoles = new Set(["admin", "owner", "finance", "cpa"]);
  const operationalRoles = new Set([
    "admin",
    "owner",
    "manager",
    "chef",
    "staff",
    "director",
    "operations",
    "operations-manager",
  ]);
  const hrRoles = new Set(["admin", "owner", "hr", "manager"]);

  const canAccessFinanceModules = privilegedRoles.has(normalizedRole) || normalizedRole === "payroll";
  const canAccessHrModules = hrRoles.has(normalizedRole) || normalizedRole === "payroll";
  const canAccessCompensation = privilegedRoles.has(normalizedRole) || (normalizedRole === "payroll" && payrollVerified);
  const canAccessPayroll = normalizedRole === "payroll" ? payrollVerified : privilegedRoles.has(normalizedRole);

  return {
    normalizedRole,
    canAccessOperationalModules: operationalRoles.has(normalizedRole) || normalizedRole === "",
    canAccessFinanceModules,
    canAccessHrModules,
    canAccessCompensation,
    canAccessPayroll,
    canAskSensitiveData: canAccessCompensation || canAccessPayroll || privilegedRoles.has(normalizedRole),
  };
}

export function resolveEchoContext(input: EchoContextInput): EchoResolvedContext {
  const pathname = input.pathname || "/";
  const activeModule = (input.explicitModule || pathname.replace(/^\//, "").split("/")[0] || "global").trim().toLowerCase();
  const moduleFamily = resolveEchoModuleFamily(activeModule, pathname);
  const permissions = resolveEchoPermissionProfile(input.userRole, input.payrollVerified);

  return {
    pathname,
    activeModule,
    moduleFamily,
    selectedOutlet: input.selectedOutlet || "all outlets",
    surface: input.surface || (activeModule === "global" ? "global" : "module"),
    userRole: input.userRole || undefined,
    permissions,
  };
}

export function isSensitiveEchoPrompt(prompt: string, context?: { module?: string; currentPage?: string }): boolean {
  const text = prompt.toLowerCase();
  const moduleName = String(context?.module || "").toLowerCase();
  const pageName = String(context?.currentPage || "").toLowerCase();

  const compensationPatterns = [
    /\bsalary\b/i,
    /\bcompensation\b/i,
    /\bpay(?:\s*rate|roll|\s*band|\s*scale)?\b/i,
    /\bwages?\b/i,
    /\bhourly\s*rate\b/i,
    /\bannual\s*pay\b/i,
    /\bbonus\b/i,
    /\bwhat\s+is\s+the\s+salary\b/i,
    /\bhow\s+much\s+does\s+.*\s+make\b/i,
  ];

  const sensitiveModule = ["finance", "financial", "aurum", "echo-aurum", "hr", "payroll"].some(
    (entry) => moduleName.includes(entry) || pageName.includes(entry),
  );

  return sensitiveModule || compensationPatterns.some((pattern) => pattern.test(text));
}

export function getEchoPromptRiskLabel(context: EchoResolvedContext): string {
  if (SENSITIVE_MODULE_FAMILIES.has(context.moduleFamily)) return "restricted";
  if (context.permissions.canAskSensitiveData) return "trusted";
  return "standard";
}
