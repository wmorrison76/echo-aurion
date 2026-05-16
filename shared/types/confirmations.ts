import type { OpsRole } from "./audit";

export type OpsConfirmationKind =
  | "recipe.ai_generated"
  | "recipe.user_accepted"
  | "recipe.confirmed"
  | "recipe.opened"
  | "orders.generated"
  | "orders.completed";

export type OpsConfirmationStatus = "pending" | "confirmed";

export type OpsConfirmation = {
  id: string;
  at: string; // ISO datetime
  actor: {
    userId?: string;
    name?: string;
    role: OpsRole;
  };
  eventId: string;
  beoId?: string;
  kind: OpsConfirmationKind;
  status: OpsConfirmationStatus;
  message: string;
  link?: {
    kind: "recipe" | "menu_item" | "purchase_order" | "receiving";
    id?: string;
  };
};

