import type { UUID } from "@shared/purchasing";
import type { Role } from "@shared/auth";
export type FinanceAuditSeverity = "info" | "warning" | "critical";
export interface FinanceAuditFlag {
  id: UUID;
  itemId: UUID;
  itemName: string;
  outletId: UUID;
  outletName?: string | null;
  severity: FinanceAuditSeverity;
  message: string;
  expectedQty?: number | null;
  actualQty?: number | null;
  variancePct?: number | null;
  context?: string | null;
}
export interface OrderingAccessRule {
  role: Role;
  canOrder: boolean;
  canPunchout: boolean;
  maxOrderAmount?: number | null;
}
export interface InvoiceApprovalRoleLimit {
  role: Role;
  maxAmount: number;
  requiresSecondApprovalOver?: number | null;
}
export interface InventoryWindowSetting {
  id: UUID;
  outletId: UUID;
  name: string;
  daysOfWeek: string[];
  startTime: string; // HH:MM 24h format endTime: string; // HH:MM 24h format
}
export interface OutletInventoryControl {
  outletId: UUID;
  outletName?: string | null;
  active: boolean;
  lastStartedAt?: string | null;
  lastStoppedAt?: string | null;
  lockedUntil?: string | null;
}
export interface FinanceControlSettings {
  orderingAccess: OrderingAccessRule[];
  approvals: {
    autoApproveUnder?: number | null;
    varianceEscalationPct?: number | null;
    roleLimits: InvoiceApprovalRoleLimit[];
  };
  inventoryWindows: InventoryWindowSetting[];
  outletControls: OutletInventoryControl[];
  aiAudit: {
    enabled: boolean;
    lastRunAt?: string | null;
    flags: FinanceAuditFlag[];
    summary?: { flagged: number; critical: number; warnings: number } | null;
  };
}
