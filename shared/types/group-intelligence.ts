/**
 * Group Intelligence Types
 * Consolidates operational data across all events in a group (stay/booking)
 * Provides group-level purchasing, labor, and advisory insights
 */

export type GroupDayKey = string; // YYYY-MM-DD

export type GroupEventRef = {
  eventId: string;
  title: string;
  date: GroupDayKey;
  outletName?: string | null;
  room?: string | null;
  beoId?: string | null;
  revision?: number | null;
  counts?: { exp?: number; gtd?: number; set?: number } | null;
};

export type GroupPurchaseLine = {
  ingredientId: string;
  ingredientName: string;
  unit: string;

  requiredQuantity: number; // yield-aware
  toOrderQuantity: number; // after onHand/onOrder delta math (v1 assumes 0)
  optimized: {
    vendorName: string;
    packsToOrder: number;
    packSize: number;
    packUnit: string;
    totalQuantity: number;
    totalCost: number;
  } | null;

  sources: Array<{ beoId: string; station?: string; day: GroupDayKey }>;
};

export type GroupLaborLine = {
  station: string; // HOT/COLD/GARDE/PASTRY/BAR/OTHER
  day: GroupDayKey;

  requiredStaff: number;
  requiredHours: number;

  deltaStaff: number; // v1: required - scheduled (scheduled=0)
  deltaHours: number;

  sources: Array<{ beoId: string; day: GroupDayKey }>;
};

export type GroupIntelligenceSnapshot = {
  groupId: string;
  groupName: string;

  generatedAt: string;

  events: GroupEventRef[];

  purchasePlan: {
    totalCost: number;
    lines: GroupPurchaseLine[];
  };

  laborPlan: {
    totalHours: number;
    totalStaff: number;
    lines: GroupLaborLine[];
  };
};
