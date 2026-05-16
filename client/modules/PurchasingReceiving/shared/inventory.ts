import type { UUID } from "./purchasing";
import type { Tier1Category, Tier2Category, Tier3Category } from "./api";

export interface PurchaseUnit {
  vendorId: UUID | null;
  sku?: string | null;
  pack?: string | null;
  unit: string; // purchase unit (ea, case, lb)
  lastUnitPrice?: number | null; // price per purchase unit
}

export type StorageAreaType =
  | "dry"
  | "cooler"
  | "freezer"
  | "cage"
  | "bar"
  | "custom";

export interface StorageLayoutRect {
  x: number;
  y: number;
  width: number;
  depth: number;
  rotation?: number | null;
}

export interface StorageLayoutBox extends StorageLayoutRect {
  height: number;
}

export interface StorageLocation {
  outletId: UUID;
  name: string; // legacy free-form label
  bin?: string | null;
}

export interface StorageArea {
  id: UUID;
  outletId: UUID;
  name: string;
  type: StorageAreaType;
  description?: string | null;
  tags?: string[] | null;
  layout?: StorageLayoutRect | null;
  locked?: boolean | null;
}

export type StorageRackType =
  | "shelf"
  | "rack"
  | "cage"
  | "freezer_basket"
  | "custom";

export interface StorageRack {
  id: UUID;
  areaId: UUID;
  name: string;
  type: StorageRackType;
  levels: number;
  columns: number;
  notes?: string | null;
  layout?: StorageLayoutBox | null;
}

export interface StorageBin {
  id: UUID;
  rackId: UUID;
  level: number; // 1 = top
  column: number; // 1 = left
  label: string;
  capacity?: string | null;
  itemId?: UUID | null;
  parQty?: number | null;
  notes?: string | null;
  layout?: StorageLayoutRect | null;
}

export interface ItemHistoryEvent {
  id: UUID;
  type: "receipt" | "count" | "transfer_out" | "transfer_in" | "adjustment";
  date: string; // ISO qty: number; // in purchase units or standardized; simple aggregation for MVP unit: string; referenceId?: UUID | null; // receipt id, count id, etc location?: string | null; bin?: string | null; notes?: string | null;
} /* MCP integration note: - Lots/expiry tracking should be normalized in DB; link lots to receipts and outlets for recall.
 */
export interface LotInfo {
  lot?: string | null;
  expiry?: string | null;
  receivedDate?: string | null;
  receiptId?: UUID | null;
}
export interface CountLine {
  itemId: UUID;
  qty: number;
  unit: string;
  location?: string | null;
  bin?: string | null;
}
export interface CountSession {
  id: UUID;
  outletId: UUID;
  startedAt: string;
  completedAt?: string | null;
  lines: CountLine[];
}
export type QuickCountCadence = "daily" | "weekly" | "monthly" | "event";
export interface QuickCountTemplateItem {
  itemId: UUID;
  parQty?: number | null;
  binId?: UUID | null;
}
export interface QuickCountTemplate {
  id: UUID;
  outletId: UUID;
  name: string;
  cadence: QuickCountCadence;
  daysOfWeek?: string[] | null;
  notes?: string | null;
  items: QuickCountTemplateItem[];
  lastRunAt?: string | null;
}
export interface ParSuggestion {
  itemId: UUID;
  outletId: UUID;
  currentPar?: number | null;
  recommendedPar: number;
  variancePct: number;
  rationale: string;
}
export interface InventoryItem {
  id: UUID;
  name: string;
  outletId: UUID;
  standardUnit?: string | null;
  categories?: {
    tier1: Tier1Category;
    tier2?: Tier2Category;
    tier3?: Tier3Category;
  } | null;
  glCode?: string | null;
  glName?: string | null;
  glGroupId?: string | null;
  glManualOverride?: boolean | null;
  glOverrideSourceId?: string | null;
  purchaseUnits: PurchaseUnit[]; // one per vendor/pack storage: StorageLocation[]; departments?: string[]; lastReceiptDate?: string | null; lots?: LotInfo[]; // optional lot tracking history: ItemHistoryEvent[]; defaultBinId?: UUID | null;
}
export interface StandardCostInsight {
  id: UUID;
  standardProductId: UUID;
  productName: string;
  baseUnit: string;
  outletId?: UUID | null;
  outletName?: string | null;
  vendorId?: UUID | null;
  vendorName?: string | null;
  capturedOn?: string | null;
  purchaseQuantity?: number | null;
  purchaseUnit?: string | null;
  totalCost?: number | null;
  totalStandardUnits?: number | null;
  costPerStandardUnit?: number | null;
  packSize?: number | null;
  packLabel?: string | null;
  metadata?: Record<string, unknown> | null;
}
export interface VoiceInventoryInsight {
  productName: string;
  outletId?: UUID | null;
  sampleCount: number;
  lastCapturedAt?: string | null;
  lastQuantity?: number | null;
  lastUnit?: string | null;
  lastBin?: string | null;
  lastConfidence?: number | null;
  averageQuantity?: number | null;
  stdDeviation?: number | null;
  anomalyThreshold?: number | null;
  recommendedRange?: { min: number | null; max: number | null } | null;
}
export type InventoryInsightStatus = "ok" | "degraded";
export interface PhysicalInventoryInsightsResponse {
  generatedAt: string;
  status: InventoryInsightStatus;
  outletId?: UUID | null;
  message?: string;
  voiceInsights: VoiceInventoryInsight[];
  standardCosts: StandardCostInsight[];
}
export interface InventoryReviewFlag {
  id: UUID;
  itemName: string;
  outletId?: UUID | null;
  itemId?: UUID | null;
  flaggedBy?: string | null;
  flaggedAt: string;
  reviewed: boolean;
  reviewedAt?: string | null;
  notes?: string | null;
}
export interface InventoryReviewFlagRequest {
  itemName: string;
  outletId?: UUID | null;
  itemId?: UUID | null;
  flaggedBy?: string | null;
  reviewed?: boolean;
  notes?: string | null;
}
