export type LocationKind =
  | "OUTLET"
  | "STOREROOM"
  | "PRODUCTION_COMMISSARY"
  | "PASTRY_COMMISSARY";

export type InventoryCadence =
  | "PER_EVENT"
  | "DAILY"
  | "AM_PM"
  | "WEEKLY"
  | "MONTH_END"
  | "AS_NEEDED";

export type CostAttributionMode =
  | "RECEIVING_OUTLET_PAYS"
  | "PRODUCER_PAYS"
  | "SPLIT"
  | "MANUAL_OVERRIDE";

export type InternalFulfillmentRule = {
  fromLocationId: string;
  toOutletId: string;
  isEnabled: boolean;

  leadTimeHours: number;
  defaultDueTime: "ASAP" | "NEXT_DELIVERY_WINDOW" | "CUSTOM";

  notes?: string | null;
};

export type APNRule = {
  mode: CostAttributionMode;
  producerCreditEnabled: boolean;
  auditNotationsEnabled: boolean;
  allowSubBuckets: boolean;
};

export type GenesisBConfig = {
  version: 1;

  locations: Array<{
    id: string;
    name: string;
    kind: LocationKind;

    canActAsCommissary: boolean;
    cadence: InventoryCadence;

    notes?: string | null;
  }>;

  fulfillmentRules: InternalFulfillmentRule[];
  apn: APNRule;

  createdAtISO: string;
  updatedAtISO: string;
};
