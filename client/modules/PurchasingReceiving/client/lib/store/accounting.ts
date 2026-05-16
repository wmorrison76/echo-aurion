import type {
  FinanceControlSettings,
  FinanceAuditFlag,
  OutletInventoryControl,
} from "@shared/finance";
import type { Outlet } from "@shared/purchasing";
import type { Role } from "@shared/auth";
import {
  LS,
  read,
  write,
  id,
  sanitizeString,
  arrayShallowEqual,
  sanitizeNumber,
  normalizeDaysOfWeek,
} from "./shared";
const FINANCE_CONTROLS_EVENT = "echo:finance:controls";
export const FINANCE_CONTROLS_EVENT_NAME = FINANCE_CONTROLS_EVENT;
type AnyRecord = Record<string, unknown>;
export type GLGroup = {
  id: string;
  name: string;
  description?: string;
  codes: string[];
  aliases?: string[];
};
export type ProductGLMapping = {
  id: string;
  label: string;
  mode: "item" | "pattern";
  itemId?: string | null;
  pattern?: string | null;
  outletIds: string[];
  targetGlCode?: string | null;
  targetGlName?: string | null;
  groupId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};
const DEFAULT_GL_GROUPS: GLGroup[] = [
  {
    id: "kitchen-cost",
    name: "Kitchen Cost",
    description: "Core food cost codes for back-of-house",
    codes: [
      "5010-Produce",
      "5030-Proteins",
      "5050-Seafood",
      "5060-Dairy",
      "5070-DryGoods",
      "5075-OilsFats",
      "5095-Additives",
      "5120-Prepared",
      "5200-Frozen",
    ],
    aliases: ["kitchen", "kitchen cost", "boh"],
  },
  {
    id: "beverage-cost",
    name: "Beverage Cost",
    description: "Alcoholic beverages and bar mixers",
    codes: [
      "5110-Beer",
      "5111-Wine",
      "5112-Spirits",
      "5113-Mixers",
      "5114-Juices",
      "5115-Concentrates",
      "5030.110",
    ],
    aliases: ["beverage", "bar", "bev", "beverage cost"],
  },
  {
    id: "paper-plastic",
    name: "Paper & Plastic",
    description: "Disposables, packaging, and to-go supplies",
    codes: ["5030.110"],
    aliases: ["paper", "plastic", "paper and plastic", "disposables"],
  },
];
const ALL_ROLES: Role[] = ["Admin", "Manager", "Finance", "Chef", "Receiver"];
const defaultOrderingRuleForRole = (role: Role) => ({
  role,
  maxFrequencyMinutes: role === "Admin" ? null : 60,
  requiresVendorApproval: role === "Chef",
});
const defaultApprovalLimitForRole = (role: Role) => ({
  role,
  maxAmount: role === "Admin" ? null : role === "Manager" ? 5000 : 1000,
  requiresSecondApprovalOver: role === "Admin" ? null : 10000,
});
const createDefaultFinanceControls = (
  outlets: Outlet[],
): FinanceControlSettings => {
  const orderingAccess = ALL_ROLES.map((role) =>
    defaultOrderingRuleForRole(role),
  );
  const roleLimits = ALL_ROLES.map((role) => defaultApprovalLimitForRole(role));
  const inventoryWindows = outlets.map((outlet) => ({
    id: id(),
    outletId: outlet.id,
    name: `${outlet.name} Cycle`,
    daysOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    startTime: "05:00",
    endTime: "07:00",
  }));
  const outletControls = outlets.map((outlet) => ({
    outletId: outlet.id,
    outletName: outlet.name,
    active: false,
    lastStartedAt: null,
    lastStoppedAt: null,
    lockedUntil: null,
  }));
  return {
    orderingAccess,
    approvals: { autoApproveUnder: 250, varianceEscalationPct: 5, roleLimits },
    inventoryWindows,
    outletControls,
    aiAudit: {
      enabled: true,
      lastRunAt: null,
      flags: [],
      summary: { flagged: 0, critical: 0, warnings: 0 },
    },
  };
};
const normalizeAuditFlag = (input: unknown): FinanceAuditFlag | null => {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<FinanceAuditFlag> & AnyRecord;
  const itemId =
    typeof raw.itemId === "string" && raw.itemId ? raw.itemId : null;
  const itemName = sanitizeString(raw.itemName);
  const outletId =
    typeof raw.outletId === "string" && raw.outletId ? raw.outletId : null;
  if (!itemId || !itemName || !outletId) return null;
  const severity: FinanceAuditFlag["severity"] =
    raw.severity === "critical" ||
    raw.severity === "warning" ||
    raw.severity === "info"
      ? raw.severity
      : "warning";
  const message = sanitizeString(raw.message) ?? "Needs review";
  const outletName = sanitizeString(raw.outletName);
  const expectedQty =
    raw.expectedQty !== undefined ? sanitizeNumber(raw.expectedQty) : null;
  const actualQty =
    raw.actualQty !== undefined ? sanitizeNumber(raw.actualQty) : null;
  const variancePct =
    raw.variancePct !== undefined ? sanitizeNumber(raw.variancePct) : null;
  const context = sanitizeString(raw.context);
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : id(),
    itemId,
    itemName,
    outletId,
    outletName,
    severity,
    message,
    expectedQty,
    actualQty,
    variancePct,
    context,
  };
};
export const accountingStore = {
  listGLGroups(): GLGroup[] {
    return read(LS.glGroups, DEFAULT_GL_GROUPS);
  },
  saveGLGroup(g: GLGroup) {
    const list = this.listGLGroups();
    const idx = list.findIndex((x) => x.id === g.id);
    if (idx >= 0) list[idx] = g;
    else list.unshift(g);
    write(LS.glGroups, list);
    try {
      window.dispatchEvent(new CustomEvent(FINANCE_CONTROLS_EVENT));
    } catch {}
  },
  findGLGroupByCode(code: string): GLGroup | null {
    const list = this.listGLGroups();
    for (const group of list) {
      if (group.codes.includes(code)) return group;
      if (group.aliases?.some((alias) => code.toLowerCase().includes(alias)))
        return group;
    }
    return null;
  },
  listGLMappings(): ProductGLMapping[] {
    return read(LS.glMappings, []);
  },
  saveGLMapping(m: ProductGLMapping) {
    const list = this.listGLMappings();
    const idx = list.findIndex((x) => x.id === m.id);
    if (idx >= 0) list[idx] = m;
    else list.unshift(m);
    write(LS.glMappings, list);
    try {
      window.dispatchEvent(new CustomEvent(FINANCE_CONTROLS_EVENT));
    } catch {}
  },
  removeGLMapping(mappingId: string) {
    const list = this.listGLMappings();
    const filtered = list.filter((m) => m.id !== mappingId);
    write(LS.glMappings, filtered);
  },
  listFinanceControls(): FinanceControlSettings {
    return read(LS.financeControls, {
      orderingAccess: [],
      approvals: {
        autoApproveUnder: 250,
        varianceEscalationPct: 5,
        roleLimits: [],
      },
      inventoryWindows: [],
      outletControls: [],
      aiAudit: {
        enabled: true,
        lastRunAt: null,
        flags: [],
        summary: { flagged: 0, critical: 0, warnings: 0 },
      },
    });
  },
  updateFinanceControls(controls: FinanceControlSettings) {
    write(LS.financeControls, controls);
    try {
      window.dispatchEvent(
        new CustomEvent(FINANCE_CONTROLS_EVENT, { detail: controls }),
      );
    } catch {}
  },
  findAuditFlag(flagId: string): FinanceAuditFlag | null {
    const controls = this.listFinanceControls();
    return controls.aiAudit.flags.find((f) => f.id === flagId) ?? null;
  },
  addAuditFlag(flag: Partial<FinanceAuditFlag>) {
    const normalized = normalizeAuditFlag(flag);
    if (!normalized) return;
    const controls = this.listFinanceControls();
    controls.aiAudit.flags = controls.aiAudit.flags.filter(
      (f) => f.id !== normalized.id,
    );
    controls.aiAudit.flags.unshift(normalized);
    controls.aiAudit.summary.flagged = controls.aiAudit.flags.length;
    controls.aiAudit.summary.critical = controls.aiAudit.flags.filter(
      (f) => f.severity === "critical",
    ).length;
    controls.aiAudit.summary.warnings = controls.aiAudit.flags.filter(
      (f) => f.severity === "warning",
    ).length;
    this.updateFinanceControls(controls);
  },
  removeAuditFlag(flagId: string) {
    const controls = this.listFinanceControls();
    controls.aiAudit.flags = controls.aiAudit.flags.filter(
      (f) => f.id !== flagId,
    );
    controls.aiAudit.summary.flagged = controls.aiAudit.flags.length;
    controls.aiAudit.summary.critical = controls.aiAudit.flags.filter(
      (f) => f.severity === "critical",
    ).length;
    controls.aiAudit.summary.warnings = controls.aiAudit.flags.filter(
      (f) => f.severity === "warning",
    ).length;
    this.updateFinanceControls(controls);
  },
  getFinanceControls() {
    return this.listFinanceControls();
  },
  runInventoryAudit() {
    const controls = this.listFinanceControls();
    const updated = {
      ...controls,
      aiAudit: { ...controls.aiAudit, lastRunAt: new Date().toISOString() },
    };
    this.updateFinanceControls(updated);
    return updated;
  },
};
