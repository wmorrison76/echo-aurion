/**
 * Genesis E — Internal Fulfillment Canon
 * Commissary -> Outlet ordering (finished goods, prep, ingredients).
 * Supports: BEO-driven, REO-driven, standing pars, and adhoc chef requests.
 */

export type FulfillmentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "PICKING"
  | "READY"
  | "DELIVERED"
  | "RECEIVED"
  | "CANCELLED";

export type FulfillmentSourceType =
  | "REO"
  | "BEO"
  | "PAR_REPLENISH"
  | "ADHOC"
  | "SHORTAGE_RECOVERY";

export type FulfillmentLine = {
  lineId: string;

  itemName: string;
  unit: string;
  quantity: number;

  ingredientId?: string | null;
  recipeId?: string | null;
  category?: string | null;

  fulfillFromInventory: boolean;
  allowSubstitutions: boolean;

  notes?: string | null;
};

export type InternalFulfillmentOrder = {
  ifoId: string;

  createdAtISO: string;
  updatedAtISO: string;

  status: FulfillmentStatus;

  requestingLocationId: string;
  fulfillingLocationId: string;

  dueAtISO: string;
  deliveryWindow?: {
    startISO: string;
    endISO: string;
  } | null;

  sourceType: FulfillmentSourceType;
  sourceId?: string | null;

  costPolicyHint?: "AUTO" | "RECEIVING_PAYS" | "PRODUCER_PAYS" | "SPLIT";

  lines: FulfillmentLine[];

  systemNote?: string | null;
};
