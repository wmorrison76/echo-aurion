export type OpsRole =
  | "Admin"
  | "Planner"
  | "Sales"
  | "Chef"
  | "Sous"
  | "Purchasing"
  | "Receiving"
  | "BanquetCaptain"
  | "Staff"
  | "Viewer";

export type OpsAuditEntityType = "event" | "task" | "order" | "receiving" | "revision" | "menu_lock";

export type OpsAuditAction =
  | "task.shift_bulk"
  | "task.status_change"
  | "task.percent_change"
  | "menu.lock"
  | "menu.unlock"
  | "order.received"
  | "receiving.exception";

export type OpsAuditEntry = {
  id: string;
  at: string; // ISO datetime
  actor: {
    userId?: string;
    name?: string;
    role: OpsRole;
  };
  eventId?: string;
  beoId?: string;
  entityType: OpsAuditEntityType;
  entityId: string;
  action: OpsAuditAction;
  summary: string;
  details?: Record<string, unknown>;
};

