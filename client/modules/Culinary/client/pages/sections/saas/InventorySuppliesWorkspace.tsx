import React, { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ALLERGENS, formatCurrency, generateId, percent } from "./shared";

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  leadTimeDays: number;
  reliability: number; // 0-1
  certifications: string[];
  allergensHandled: string[];
  notes?: string;
};

export type CatalogUnit = {
  display: string;
  toBase: number;
};

export type CatalogItem = {
  id: string;
  sku: string;
  name: string;
  supplierId: string;
  category: string;
  storageArea: string;
  baseUnit: string;
  units: Record<string, CatalogUnit>;
  costPerBase: number;
  currency: string;
  parLevelBase: number;
  onHandBase: number;
  safetyStockBase: number;
  allergens: string[];
  critical: boolean;
  lastAuditISO: string;
};

export type PurchaseOrderLine = {
  id: string;
  itemId: string;
  qty: number;
  unit: string;
};

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  status: "draft" | "submitted" | "confirmed" | "in_transit" | "received";
  expectedDate: string;
  createdAt: string;
  submittedBy: string;
  notes?: string;
  lines: PurchaseOrderLine[];
};

const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: "sup-blue-farms",
    name: "Blue Farms Dairy",
    contact: "support@bluefarmsdairy.com · +1 404-555-2211",
    leadTimeDays: 2,
    reliability: 0.96,
    certifications: ["USDA Organic", "SQF Level 2"],
    allergensHandled: ["Milk"],
    notes: "Refrigerated deliveries by 8am. Requires dock seal.",
  },
  {
    id: "sup-green-market",
    name: "Green Market Produce Co",
    contact: "orders@greenmarket.co · +1 212-555-8710",
    leadTimeDays: 1,
    reliability: 0.91,
    certifications: ["GFSI", "PrimusGFS"],
    allergensHandled: ["Tree Nuts", "Peanuts"],
    notes:
      "Allocates allergens on separate pallets. Shared allergen manifest available.",
  },
  {
    id: "sup-coastal-seafood",
    name: "Coastal Seafood Imports",
    contact: "logistics@coastalseafood.io · +1 305-555-0345",
    leadTimeDays: 3,
    reliability: 0.88,
    certifications: ["MSC Chain of Custody", "HACCP"],
    allergensHandled: ["Fish", "Shellfish"],
    notes:
      "Requires temp probe on receipt. FedEx Freight tracking shared automatically.",
  },
];

const INITIAL_CATALOG: CatalogItem[] = [
  {
    id: "item-butter-eu",
    sku: "BF-DAIRY-25KG",
    name: "European Butter 82% Fat",
    supplierId: "sup-blue-farms",
    category: "Dairy",
    storageArea: "Cooler • Shelf 2",
    baseUnit: "kg",
    units: {
      kg: { display: "Kilogram", toBase: 1 },
      case: { display: "Case (10 x 2.5kg)", toBase: 25 },
      lb: { display: "Pound", toBase: 0.453592 },
    },
    costPerBase: 5.15,
    currency: "USD",
    parLevelBase: 60,
    onHandBase: 42,
    safetyStockBase: 20,
    allergens: ["Milk"],
    critical: true,
    lastAuditISO: new Date().toISOString(),
  },
  {
    id: "item-pistachio",
    sku: "GM-NUT-11LB",
    name: "Shelled Pistachios",
    supplierId: "sup-green-market",
    category: "Dry Storage",
    storageArea: "Dry • Rack B3",
    baseUnit: "kg",
    units: {
      kg: { display: "Kilogram", toBase: 1 },
      lb: { display: "Pound", toBase: 0.453592 },
      case: { display: "Case (5 kg)", toBase: 5 },
    },
    costPerBase: 14.9,
    currency: "USD",
    parLevelBase: 25,
    onHandBase: 12,
    safetyStockBase: 8,
    allergens: ["Tree Nuts"],
    critical: true,
    lastAuditISO: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "item-cream-38",
    sku: "BF-CREAM-2L",
    name: "Heavy Cream 38%",
    supplierId: "sup-blue-farms",
    category: "Dairy",
    storageArea: "Cooler • Shelf 1",
    baseUnit: "l",
    units: {
      l: { display: "Litre", toBase: 1 },
      case: { display: "Case (12 x 1L)", toBase: 12 },
      ml: { display: "Millilitre", toBase: 0.001 },
    },
    costPerBase: 3.45,
    currency: "USD",
    parLevelBase: 80,
    onHandBase: 66,
    safetyStockBase: 40,
    allergens: ["Milk"],
    critical: true,
    lastAuditISO: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "item-salmon-atl",
    sku: "CS-ATL-TRIM",
    name: "Atlantic Salmon Portions",
    supplierId: "sup-coastal-seafood",
    category: "Seafood",
    storageArea: "Freezer • Rack F1",
    baseUnit: "kg",
    units: {
      kg: { display: "Kilogram", toBase: 1 },
      case: { display: "Case (20 x 200g)", toBase: 4 },
      portion: { display: "Portion 200g", toBase: 0.2 },
    },
    costPerBase: 18.75,
    currency: "USD",
    parLevelBase: 35,
    onHandBase: 18,
    safetyStockBase: 12,
    allergens: ["Fish"],
    critical: false,
    lastAuditISO: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(),
  },
];

const INITIAL_POS: PurchaseOrder[] = [
  {
    id: "po-2403",
    supplierId: "sup-green-market",
    status: "confirmed",
    expectedDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    submittedBy: "William Morrison",
    lines: [
      { id: "pol-1", itemId: "item-pistachio", qty: 3, unit: "case" },
      { id: "pol-2", itemId: "item-butter-eu", qty: 2, unit: "case" },
    ],
  },
  {
    id: "po-2404",
    supplierId: "sup-blue-farms",
    status: "draft",
    expectedDate: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    submittedBy: "William Morrison",
    notes: "Hold shipment until cream tank sanitized (ticket QA-18).",
    lines: [{ id: "pol-3", itemId: "item-cream-38", qty: 4, unit: "case" }],
  },
];

const STATUS_LABEL: Record<PurchaseOrder["status"], string> = {
  draft: "Draft",
  submitted: "Submitted",
  confirmed: "Confirmed",
  in_transit: "In transit",
  received: "Received",
};

const STATUS_FLOW: PurchaseOrder["status"][] = [
  "draft",
  "submitted",
  "confirmed",
  "in_transit",
  "received",
];

const BUILDER_PUBLIC_API_KEY = "accc7891edf04665961a321335d9540b";
const BUILDER_PURCHASING_MODEL = "Purchasing_Receiving";
const BUILDER_CONTENT_ENDPOINT = "https://cdn.builder.io/api/v3/content";

type BuilderContentResponse = {
  results?: Array<{
    data?: unknown;
  }>;
  data?: unknown;
};

type NormalizedBuilderData = {
  suppliers: Supplier[];
  items: CatalogItem[];
  orders: PurchaseOrder[];
};

type ImportMetrics = {
  suppliers: number;
  items: number;
  orders: number;
};

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>);
  }
  return [value];
}

function stringFrom(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return value
      .map((entry) => stringFrom(entry))
      .filter((entry) => entry.length > 0)
      .join(", ");
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = ["text", "value", "label", "name", "title"];
    for (const key of keys) {
      if (typeof obj[key] === "string" && obj[key]) {
        return stringFrom(obj[key]);
      }
    }
  }
  return "";
}

function normalizeNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.,-]+/g, "").replace(/,/g, ".");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const candidate = normalizeNumber(entry, Number.NaN);
      if (Number.isFinite(candidate)) return candidate;
    }
  }
  return fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeReliability(value: unknown): number {
  const normalized = normalizeNumber(value, NaN);
  if (Number.isFinite(normalized)) {
    if (normalized > 1.5) {
      return clamp(normalized / 100, 0, 1);
    }
    return clamp(normalized, 0, 1);
  }
  return 0.9;
}

function normalizeStringArray(value: unknown): string[] {
  const result = new Set<string>();
  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = stringFrom(entry);
      if (text) result.add(text);
      else if (
        entry &&
        typeof entry === "object" &&
        typeof (entry as Record<string, unknown>).name === "string"
      ) {
        const fallback = stringFrom((entry as Record<string, unknown>).name);
        if (fallback) result.add(fallback);
      }
    }
  } else {
    const text = stringFrom(value);
    if (text) result.add(text);
  }
  return Array.from(result);
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "entry"
  );
}

function ensureUniqueId(base: string, used: Set<string>): string {
  let candidate = base;
  let suffix = 1;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix++}`;
  }
  used.add(candidate);
  return candidate;
}

function extractRefKey(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const directKeys = ["id", "code", "sku", "key", "value", "name", "ref"];
  for (const key of directKeys) {
    const candidate = obj[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  const where = obj.where;
  if (where && typeof where === "object") {
    for (const candidate of Object.values(where as Record<string, unknown>)) {
      const nested = extractRefKey(candidate);
      if (nested) return nested;
    }
  }
  if (Array.isArray(obj.ids)) {
    for (const candidate of obj.ids) {
      const nested = extractRefKey(candidate);
      if (nested) return nested;
    }
  }
  return null;
}

function addRefKey(map: Map<string, string>, value: unknown, id: string) {
  const key = extractRefKey(value);
  if (!key) return;
  const normalized = key.toLowerCase();
  if (!map.has(normalized)) {
    map.set(normalized, id);
  }
}

function resolveRef(
  value: unknown,
  map: Map<string, string>,
): string | null {
  const key = extractRefKey(value);
  if (!key) return null;
  return map.get(key.toLowerCase()) ?? null;
}

function normalizeUnits(
  value: unknown,
  baseUnit: string,
): Record<string, CatalogUnit> {
  const result: Record<string, CatalogUnit> = {};
  const addUnit = (key: string, entry: Record<string, unknown>) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) return;
    const display =
      stringFrom(entry.display ?? entry.label ?? entry.name) || normalizedKey;
    const factor = normalizeNumber(
      entry.toBase ?? entry.factor ?? entry.multiplier ?? entry.value,
      NaN,
    );
    const toBase = Number.isFinite(factor) && factor !== 0 ? factor : 1;
    result[normalizedKey] = { display, toBase };
  };

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== "object") continue;
      const obj = entry as Record<string, unknown>;
      const key =
        stringFrom(obj.key ?? obj.code ?? obj.unit ?? obj.name) || baseUnit;
      addUnit(key, obj);
    }
  } else if (value && typeof value === "object") {
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      addUnit(key, obj);
    }
  }

  if (baseUnit && !result[baseUnit]) {
    result[baseUnit] = { display: baseUnit, toBase: 1 };
  }
  if (Object.keys(result).length === 0) {
    const fallback = baseUnit || "each";
    result[fallback] = { display: fallback, toBase: 1 };
  }
  return result;
}

type CatalogNormalizationResult = {
  items: CatalogItem[];
  map: Map<string, string>;
  unitDefaults: Map<string, string>;
};

function normalizeSuppliers(rawList: unknown[]): {
  suppliers: Supplier[];
  map: Map<string, string>;
} {
  const map = new Map<string, string>();
  const usedIds = new Set<string>();
  const suppliers: Supplier[] = [];

  rawList.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const obj = entry as Record<string, unknown>;
    const candidate =
      extractRefKey(obj.id) ??
      extractRefKey(obj.supplierId) ??
      extractRefKey(obj.vendorId) ??
      extractRefKey(obj.code) ??
      extractRefKey(obj.name);
    const baseId = candidate
      ? `builder-sup-${slugify(candidate)}`
      : `builder-sup-${index + 1}`;
    const id = ensureUniqueId(baseId, usedIds);
    addRefKey(map, candidate, id);
    addRefKey(map, obj.id, id);
    addRefKey(map, obj.supplierId, id);
    addRefKey(map, obj.vendorId, id);
    addRefKey(map, obj.code, id);
    addRefKey(map, obj.name, id);

    const name =
      stringFrom(obj.name ?? obj.title ?? obj.label) ||
      `Supplier ${index + 1}`;
    const contact =
      stringFrom(
        obj.contact ??
          obj.email ??
          obj.phone ??
          obj.primaryContact ??
          obj.contactInfo,
      ) || "Contact not provided";
    const leadTime = normalizeNumber(
      obj.leadTimeDays ?? obj.leadTime ?? obj.leadDays ?? obj.lead_time,
      2,
    );
    const reliability = normalizeReliability(
      obj.reliability ??
        obj.reliabilityPercent ??
        obj.ontimePercent ??
        obj.onTimeRate ??
        obj.score,
    );
    const certifications = normalizeStringArray(
      obj.certifications ??
        obj.certificationsList ??
        obj.badges ??
        obj.qualityMarks,
    );
    const allergensHandled = normalizeStringArray(
      obj.allergensHandled ??
        obj.allergens ??
        obj.allergenZones ??
        obj.allergenFlags,
    );
    const notes =
      stringFrom(
        obj.notes ??
          obj.description ??
          obj.remarks ??
          obj.comment ??
          obj.memo,
      ) || undefined;

    suppliers.push({
      id,
      name,
      contact,
      leadTimeDays: clamp(Math.round(leadTime), 0, 365),
      reliability,
      certifications,
      allergensHandled,
      notes,
    });
  });

  return { suppliers, map };
}

function normalizeCatalogItems(
  rawList: unknown[],
  supplierMap: Map<string, string>,
  suppliers: Supplier[],
): CatalogNormalizationResult {
  const map = new Map<string, string>();
  const unitDefaults = new Map<string, string>();
  const usedIds = new Set<string>();
  const items: CatalogItem[] = [];

  rawList.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const obj = entry as Record<string, unknown>;
    const candidate =
      extractRefKey(obj.id) ??
      extractRefKey(obj.itemId) ??
      extractRefKey(obj.catalogId) ??
      extractRefKey(obj.sku) ??
      extractRefKey(obj.code) ??
      extractRefKey(obj.name);
    const baseId = candidate
      ? `builder-item-${slugify(candidate)}`
      : `builder-item-${index + 1}`;
    const id = ensureUniqueId(baseId, usedIds);
    addRefKey(map, candidate, id);
    addRefKey(map, obj.id, id);
    addRefKey(map, obj.itemId, id);
    addRefKey(map, obj.catalogId, id);
    addRefKey(map, obj.sku, id);
    addRefKey(map, obj.code, id);
    addRefKey(map, obj.name, id);

    const name =
      stringFrom(obj.name ?? obj.title ?? obj.displayName) ||
      `Catalog item ${index + 1}`;
    const sku =
      stringFrom(obj.sku ?? obj.code ?? obj.catalogCode ?? obj.id) ||
      name.toUpperCase().replace(/\s+/g, "-");
    const baseUnit =
      stringFrom(
        obj.baseUnit ??
          obj.unit ??
          obj.defaultUnit ??
          obj.purchaseUnit ??
          obj.inventoryUnit,
      ).toLowerCase() || "each";
    const units = normalizeUnits(
      obj.units ?? obj.conversions ?? obj.unitOptions ?? obj.unitVariants,
      baseUnit,
    );
    const supplierId =
      resolveRef(
        obj.supplierId ??
          obj.supplier ??
          obj.vendor ??
          obj.vendorId ??
          obj.distributor,
        supplierMap,
      ) ?? suppliers[0]?.id ?? "supplier-unknown";

    const costPerBase = normalizeNumber(
      obj.costPerBase ?? obj.costPerBaseUnit ?? obj.cost ?? obj.unitCost,
      0,
    );
    const parLevel = normalizeNumber(
      obj.parLevelBase ?? obj.parLevel ?? obj.par ?? obj.par_units,
      0,
    );
    const onHand = normalizeNumber(
      obj.onHandBase ?? obj.onHand ?? obj.stockOnHand ?? obj.quantityOnHand,
      0,
    );
    const safetyStock = normalizeNumber(
      obj.safetyStockBase ?? obj.safetyStock ?? obj.safety ?? obj.buffer,
      0,
    );
    const allergens = normalizeStringArray(
      obj.allergens ??
        obj.allergenFlags ??
        obj.allergenTags ??
        obj.allergenNotes,
    );
    const critical =
      typeof obj.critical === "boolean"
        ? obj.critical
        : Boolean(obj.criticalItem ?? obj.isCritical ?? obj.criticalFlag);

    const lastAudit =
      stringFrom(obj.lastAuditISO ?? obj.lastAuditAt ?? obj.updatedAt) ||
      undefined;

    const item: CatalogItem = {
      id,
      sku,
      name,
      supplierId,
      category:
        stringFrom(obj.category ?? obj.categoryName ?? obj.type) || "General",
      storageArea:
        stringFrom(obj.storageArea ?? obj.storage ?? obj.location) ||
        "Storage",
      baseUnit,
      units,
      costPerBase: Math.max(0, Math.round(costPerBase * 100) / 100),
      currency:
        stringFrom(obj.currency ?? obj.currencyCode ?? obj.currency_symbol) ||
        "USD",
      parLevelBase: Math.max(0, parLevel),
      onHandBase: Math.max(0, onHand),
      safetyStockBase: Math.max(0, safetyStock),
      allergens,
      critical,
      lastAuditISO: lastAudit ? ensureIso(lastAudit) : new Date().toISOString(),
    };

    items.push(item);
    unitDefaults.set(id, baseUnit);
  });

  return { items, map, unitDefaults };
}

function normalizeStatus(value: unknown): PurchaseOrder["status"] {
  if (typeof value !== "string") return "draft";
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const alias: Record<string, PurchaseOrder["status"]> = {
    draft: "draft",
    submitted: "submitted",
    confirmed: "confirmed",
    in_transit: "in_transit",
    intransit: "in_transit",
    transit: "in_transit",
    shipped: "in_transit",
    pending: "submitted",
    approved: "confirmed",
    completed: "received",
    closed: "received",
    received: "received",
  };
  return (
    alias[key] ??
    (STATUS_FLOW.includes(key as PurchaseOrder["status"])
      ? (key as PurchaseOrder["status"])
      : "draft")
  );
}

function ensureIso(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    const time = Date.parse(value);
    if (!Number.isNaN(time)) {
      return new Date(time).toISOString();
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

function cloneSupplier(supplier: Supplier): Supplier {
  return {
    ...supplier,
    certifications: [...supplier.certifications],
    allergensHandled: [...supplier.allergensHandled],
  };
}

function cloneCatalogUnits(units: Record<string, CatalogUnit>): Record<string, CatalogUnit> {
  return Object.fromEntries(
    Object.entries(units).map(([key, entry]) => [key, { ...entry }]),
  );
}

function cloneCatalogItem(item: CatalogItem): CatalogItem {
  return {
    ...item,
    units: cloneCatalogUnits(item.units),
    allergens: [...item.allergens],
  };
}

function clonePurchaseOrderLine(line: PurchaseOrderLine): PurchaseOrderLine {
  return { ...line };
}

function clonePurchaseOrder(order: PurchaseOrder): PurchaseOrder {
  return {
    ...order,
    lines: order.lines.map(clonePurchaseOrderLine),
  };
}

const FALLBACK_PURCHASING_TEMPLATE: NormalizedBuilderData = {
  suppliers: INITIAL_SUPPLIERS.map(cloneSupplier),
  items: INITIAL_CATALOG.map(cloneCatalogItem),
  orders: INITIAL_POS.map(clonePurchaseOrder),
};

function getFallbackPurchasingData(): NormalizedBuilderData {
  return {
    suppliers: FALLBACK_PURCHASING_TEMPLATE.suppliers.map(cloneSupplier),
    items: FALLBACK_PURCHASING_TEMPLATE.items.map(cloneCatalogItem),
    orders: FALLBACK_PURCHASING_TEMPLATE.orders.map(clonePurchaseOrder),
  };
}

function normalizePurchaseOrders(
  rawList: unknown[],
  supplierMap: Map<string, string>,
  suppliers: Supplier[],
  itemMap: Map<string, string>,
  unitDefaults: Map<string, string>,
): PurchaseOrder[] {
  const orders: PurchaseOrder[] = [];
  const usedIds = new Set<string>();

  rawList.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const obj = entry as Record<string, unknown>;
    const candidate =
      extractRefKey(obj.id) ??
      extractRefKey(obj.poNumber) ??
      extractRefKey(obj.number) ??
      extractRefKey(obj.po);
    const baseId = candidate
      ? `builder-po-${slugify(candidate)}`
      : `builder-po-${index + 1}`;
    const id = ensureUniqueId(baseId, usedIds);

    const supplierId =
      resolveRef(
        obj.supplierId ??
          obj.supplier ??
          obj.vendor ??
          obj.vendorId ??
          obj.account,
        supplierMap,
      ) ?? suppliers[0]?.id ?? "supplier-unknown";

    const status = normalizeStatus(obj.status ?? obj.state ?? obj.stage);
    const expectedDate = ensureIso(
      obj.expectedDate ??
        obj.expected ??
        obj.deliveryDate ??
        obj.eta ??
        obj.receiveBy,
    );
    const createdAt = ensureIso(
      obj.createdAt ??
        obj.created ??
        obj.submittedAt ??
        obj.updatedAt ??
        Date.now(),
    );
    const submittedBy =
      stringFrom(obj.submittedBy ?? obj.createdBy ?? obj.owner ?? obj.user) ||
      "System";
    const notes =
      stringFrom(obj.notes ?? obj.note ?? obj.comments ?? obj.memo) || undefined;

    const rawLines =
      Array.isArray(obj.lines)
        ? obj.lines
        : Array.isArray(obj.items)
          ? obj.items
          : Array.isArray(obj.entries)
            ? obj.entries
            : [];

    const lines: PurchaseOrderLine[] = [];
    rawLines.forEach((lineEntry, lineIndex) => {
      if (!lineEntry || typeof lineEntry !== "object") return;
      const line = lineEntry as Record<string, unknown>;
      const itemRef =
        line.itemId ??
        line.item ??
        line.catalogItem ??
        line.product ??
        line.sku ??
        line.code;
      const itemId = resolveRef(itemRef, itemMap);
      if (!itemId) return;

      const qty = normalizeNumber(
        line.qty ?? line.quantity ?? line.amount ?? line.units,
        0,
      );
      if (!Number.isFinite(qty) || qty <= 0) return;

      const unit =
        stringFrom(line.unit ?? line.uom ?? line.measure) ||
        unitDefaults.get(itemId) ||
        "each";

      const lineId =
        extractRefKey(line.id ?? line.lineId) ??
        `builder-pol-${slugify(id)}-${lineIndex + 1}`;

      lines.push({
        id: lineId,
        itemId,
        qty,
        unit,
      });
    });

    if (!lines.length) return;

    orders.push({
      id,
      supplierId,
      status,
      expectedDate,
      createdAt,
      submittedBy,
      notes,
      lines,
    });
  });

  return orders;
}

async function fetchPurchasingReceivingData(): Promise<NormalizedBuilderData> {
  const url = `${BUILDER_CONTENT_ENDPOINT}/${encodeURIComponent(
    BUILDER_PURCHASING_MODEL,
  )}?apiKey=${BUILDER_PUBLIC_API_KEY}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        "Purchasing_Receiving model not found in Builder.io. Ensure the dataset exists and is published.",
      );
    }
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      detail = "";
    }
    throw new Error(
      `Builder.io responded with ${res.status}. ${detail}`.trim(),
    );
  }
  const body = (await res.json()) as BuilderContentResponse;
  const entry =
    Array.isArray(body.results) && body.results.length > 0
      ? body.results[0]?.data
      : body.data;
  if (!entry || typeof entry !== "object") {
    throw new Error(
      "Builder.io response did not include Purchasing_Receiving data.",
    );
  }
  const payload = entry as Record<string, unknown>;

  const suppliersRaw = toArray(
    payload.suppliers ??
      payload.supplierCatalog ??
      payload.vendors ??
      payload.supplier_list ??
      [],
  );
  const { suppliers, map: supplierMap } = normalizeSuppliers(suppliersRaw);

  const itemsRaw = toArray(
    payload.catalog ??
      payload.items ??
      payload.catalogItems ??
      payload.inventoryItems ??
      payload.inventory ??
      [],
  );
  const {
    items,
    map: itemMap,
    unitDefaults,
  } = normalizeCatalogItems(itemsRaw, supplierMap, suppliers);

  const ordersRaw = toArray(
    payload.purchaseOrders ??
      payload.orders ??
      payload.po ??
      payload.purchasing ??
      payload.receiving ??
      [],
  );
  const orders = normalizePurchaseOrders(
    ordersRaw,
    supplierMap,
    suppliers,
    itemMap,
    unitDefaults,
  );

  return { suppliers, items, orders };
}

function findStatusStep(status: PurchaseOrder["status"]) {
  return STATUS_FLOW.indexOf(status);
}

function convertToBase(item: CatalogItem, qty: number, unit: string) {
  const def = item.units[unit];
  if (!def) return qty;
  return qty * def.toBase;
}

function convertFromBase(item: CatalogItem, baseQty: number, unit: string) {
  const def = item.units[unit];
  if (!def) return baseQty;
  return baseQty / def.toBase;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function BuilderImportToolbar({
  isLoading,
  onImport,
  lastImportAt,
  metrics,
}: {
  isLoading: boolean;
  onImport: () => void;
  lastImportAt: number | null;
  metrics: ImportMetrics | null;
}) {
  const summary = metrics
    ? `${metrics.suppliers} suppliers · ${metrics.items} catalog items · ${metrics.orders} purchase orders`
    : "Import the latest supplier catalog and purchase orders from Builder.io.";
  const lastImportLabel = lastImportAt
    ? new Date(lastImportAt).toLocaleString()
    : null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-white/95 p-4 ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-sky-500/15 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="text-sm font-semibold">Purchasing & Receiving</div>
        <p className="text-xs text-muted-foreground">{summary}</p>
      </div>
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
        {lastImportLabel ? (
          <span className="text-xs text-muted-foreground">
            Last import: {lastImportLabel}
          </span>
        ) : null}
        <Button
          type="button"
          size="sm"
          onClick={onImport}
          disabled={isLoading}
          className="whitespace-nowrap"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Importing…
            </>
          ) : (
            "Import from Builder.io"
          )}
        </Button>
      </div>
    </div>
  );
}

function SupplierGrid({
  suppliers,
  onCreateSupplier,
}: {
  suppliers: Supplier[];
  onCreateSupplier: (input: Omit<Supplier, "id">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<Supplier, "id">>({
    name: "",
    contact: "",
    leadTimeDays: 2,
    reliability: 0.9,
    certifications: [],
    allergensHandled: [],
    notes: "",
  });
  const [certDraft, setCertDraft] = useState("");
  const canSave =
    draft.name.trim().length > 0 && draft.contact.trim().length > 0;
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Supplier catalog</CardTitle>
        <CardDescription>
          Preferred partners with lead times, certifications, and allergen
          separation notes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            {suppliers.length} approved suppliers · SLA monitored
          </div>
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) {
                setDraft({
                  name: "",
                  contact: "",
                  leadTimeDays: 2,
                  reliability: 0.9,
                  certifications: [],
                  allergensHandled: [],
                  notes: "",
                });
                setCertDraft("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">New supplier</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add supplier</DialogTitle>
                <DialogDescription>
                  Capture allergen handling and compliance information for
                  onboarding.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Supplier name"
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <Input
                  placeholder="Primary contact (email · phone)"
                  value={draft.contact}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, contact: e.target.value }))
                  }
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col text-sm">
                    <span className="text-muted-foreground">
                      Lead time (days)
                    </span>
                    <Input
                      type="number"
                      min={0}
                      value={draft.leadTimeDays}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          leadTimeDays: Number(e.target.value ?? 0),
                        }))
                      }
                    />
                  </label>
                  <label className="flex flex-col text-sm">
                    <span className="text-muted-foreground">Reliability %</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(draft.reliability * 100)}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          reliability: Math.max(
                            0,
                            Math.min(1, Number(e.target.value) / 100 || 0),
                          ),
                        }))
                      }
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">
                    Certifications
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {draft.certifications.map((item) => (
                      <Badge
                        key={item}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            certifications: prev.certifications.filter(
                              (c) => c !== item,
                            ),
                          }))
                        }
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add certification"
                      value={certDraft}
                      onChange={(e) => setCertDraft(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (!certDraft.trim()) return;
                        setDraft((prev) => ({
                          ...prev,
                          certifications: Array.from(
                            new Set([...prev.certifications, certDraft.trim()]),
                          ),
                        }));
                        setCertDraft("");
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">
                    Allergens handled
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {ALLERGENS.map((allergen) => {
                      const active = draft.allergensHandled.includes(allergen);
                      return (
                        <button
                          key={allergen}
                          type="button"
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:text-foreground",
                          )}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              allergensHandled: active
                                ? prev.allergensHandled.filter(
                                    (a) => a !== allergen,
                                  )
                                : [...prev.allergensHandled, allergen],
                            }))
                          }
                        >
                          {allergen}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Textarea
                  rows={3}
                  placeholder="Receiving notes, cut-off times, QA requirements"
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
              <DialogFooter className="pt-4">
                <Button
                  disabled={!canSave}
                  onClick={() => {
                    if (!canSave) return;
                    onCreateSupplier(draft);
                    setOpen(false);
                  }}
                >
                  Save supplier
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="rounded-lg border bg-white/80 p-4 shadow-sm dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{supplier.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {supplier.contact}
                  </div>
                </div>
                <Badge
                  variant={
                    supplier.reliability > 0.93 ? "default" : "secondary"
                  }
                >
                  {Math.round(supplier.reliability * 100)}% OTIF
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-foreground/80">
                <div className="flex justify-between">
                  <span>Lead time</span>
                  <span>{supplier.leadTimeDays} days</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {supplier.certifications.map((cert) => (
                    <Badge key={cert} variant="outline">
                      {cert}
                    </Badge>
                  ))}
                </div>
                <div>
                  <div className="font-medium text-foreground">
                    Allergen zones
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {supplier.allergensHandled.length === 0 ? (
                      <span className="text-muted-foreground">
                        None declared
                      </span>
                    ) : (
                      supplier.allergensHandled.map((a) => (
                        <Badge key={a} variant="secondary">
                          {a}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                {supplier.notes ? (
                  <p className="rounded-md bg-muted/60 p-2 text-muted-foreground">
                    {supplier.notes}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InventoryHealth({
  items,
  suppliers,
}: {
  items: CatalogItem[];
  suppliers: Supplier[];
}) {
  const totalValue = useMemo(
    () =>
      items.reduce((sum, item) => sum + item.onHandBase * item.costPerBase, 0),
    [items],
  );
  const lowStock = useMemo(
    () =>
      items
        .filter((item) => item.onHandBase < item.parLevelBase)
        .sort((a, b) => a.onHandBase - b.onHandBase),
    [items],
  );
  const bySupplier = useMemo(() => {
    const map = new Map<string, { value: number; count: number }>();
    for (const item of items) {
      const supplier = item.supplierId;
      const entry = map.get(supplier) || { value: 0, count: 0 };
      entry.value += item.onHandBase * item.costPerBase;
      entry.count += 1;
      map.set(supplier, entry);
    }
    return Array.from(map.entries()).map(([supplierId, snapshot]) => ({
      supplierId,
      ...snapshot,
    }));
  }, [items]);
  const criticalExposure = useMemo(() => {
    const totalCritical = items.filter((item) => item.critical).length;
    const lowCritical = items.filter(
      (item) => item.critical && item.onHandBase < item.safetyStockBase,
    ).length;
    return { totalCritical, lowCritical };
  }, [items]);

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Inventory health</CardTitle>
        <CardDescription>
          Snapshot of stock value, reorder priorities, and safety stock
          coverage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-primary/10 p-4">
            <div className="text-xs text-muted-foreground">On-hand value</div>
            <div className="text-2xl font-semibold">
              {formatCurrency(totalValue, items[0]?.currency ?? "USD")}
            </div>
            <div className="text-xs text-muted-foreground">
              {items.length} tracked catalog items
            </div>
          </div>
          <div className="rounded-lg bg-secondary p-4">
            <div className="text-xs text-secondary-foreground">
              Critical exposure
            </div>
            <div className="text-2xl font-semibold text-secondary-foreground">
              {criticalExposure.lowCritical}/{criticalExposure.totalCritical}
            </div>
            <div className="text-xs text-secondary-foreground">
              Below safety stock threshold
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-sm font-medium">Reorder priorities</div>
          <div className="mt-2 grid gap-2 text-xs">
            {lowStock.length === 0 ? (
              <span className="text-muted-foreground">
                All items above par levels.
              </span>
            ) : (
              lowStock.map((item) => {
                const supplier = suppliers.find(
                  (s) => s.id === item.supplierId,
                );
                const deficit = item.parLevelBase - item.onHandBase;
                const toCase = convertFromBase(
                  item,
                  Math.max(deficit, item.safetyStockBase - item.onHandBase),
                  "case",
                );
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded border bg-muted/60 px-3 py-2"
                  >
                    <div>
                      <div className="font-medium text-foreground/90">
                        {item.name}
                      </div>
                      <div className="text-muted-foreground">
                        {supplier?.name ?? "Supplier unknown"} · Par{" "}
                        {Math.round(item.parLevelBase)} {item.baseUnit}
                      </div>
                    </div>
                    <Badge variant="destructive">
                      Order {Math.max(1, Math.ceil(toCase))} case
                      {Math.max(1, Math.ceil(toCase)) > 1 ? "s" : ""}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-sm font-medium">Value by supplier</div>
          <div className="mt-2 space-y-2 text-xs">
            {bySupplier.map((row) => {
              const supplier = suppliers.find((s) => s.id === row.supplierId);
              return (
                <div
                  key={row.supplierId}
                  className="flex items-center justify-between"
                >
                  <div>{supplier?.name ?? row.supplierId}</div>
                  <div className="text-foreground/80">
                    {formatCurrency(row.value, items[0]?.currency ?? "USD")} (
                    {percent(row.value, totalValue)})
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CatalogTable({
  items,
  suppliers,
  onAdjustStock,
  onUpdatePar,
}: {
  items: CatalogItem[];
  suppliers: Supplier[];
  onAdjustStock: (itemId: string, nextBase: number) => void;
  onUpdatePar: (
    itemId: string,
    nextParBase: number,
    safetyStockBase: number,
  ) => void;
}) {
  const [selectedSupplier, setSelectedSupplier] = useState<string | "all">(
    "all",
  );
  const filtered = useMemo(() => {
    if (selectedSupplier === "all") return items;
    return items.filter((item) => item.supplierId === selectedSupplier);
  }, [items, selectedSupplier]);

  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("0");
  const [editUnit, setEditUnit] = useState("case");
  const [editPar, setEditPar] = useState("0");
  const [editSafety, setEditSafety] = useState("0");

  const openAdjustDialog = useCallback(
    (item: CatalogItem, mode: "stock" | "par") => {
      setEditItemId(item.id);
      if (mode === "stock") {
        setEditQty("0");
        const defaultUnit = item.units.case ? "case" : item.baseUnit;
        setEditUnit(defaultUnit);
        setEditPar("0");
        setEditSafety("0");
      } else {
        setEditPar(String(Math.round(item.parLevelBase)));
        setEditSafety(String(Math.round(item.safetyStockBase)));
        setEditQty("0");
        const defaultUnit = item.units.case ? "case" : item.baseUnit;
        setEditUnit(defaultUnit);
      }
    },
    [],
  );

  const itemForEdit =
    filtered.find((item) => item.id === editItemId) ??
    items.find((item) => item.id === editItemId) ??
    null;

  const [mode, setMode] = useState<"stock" | "par">("stock");

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Catalog & stock counts</CardTitle>
          <CardDescription>
            Track on-hand levels, allergen tagging, and convert purchase packs
            to production units.
          </CardDescription>
        </div>
        <Select
          value={selectedSupplier}
          onValueChange={(value) =>
            setSelectedSupplier(value as typeof selectedSupplier)
          }
        >
          <SelectTrigger className="w-[230px]">
            <SelectValue placeholder="Filter by supplier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All suppliers</SelectItem>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="max-h-[420px] rounded-lg border">
          <table className="w-full min-w-[720px] table-fixed text-left text-xs">
            <thead className="bg-muted/70 text-muted-foreground">
              <tr>
                <th className="p-3">Item</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">On hand</th>
                <th className="p-3">Par / Safety</th>
                <th className="p-3">Allergens</th>
                <th className="p-3">Cost / base</th>
                <th className="p-3">Last audit</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const supplier = suppliers.find(
                  (s) => s.id === item.supplierId,
                );
                const deficit = item.parLevelBase - item.onHandBase;
                const warning = deficit > 0;
                return (
                  <tr key={item.id} className="border-t">
                    <td className="p-3 align-top">
                      <div className="font-medium text-foreground/90">
                        {item.name}
                      </div>
                      <div className="text-muted-foreground">{item.sku}</div>
                      <div className="mt-1 text-muted-foreground">
                        {item.storageArea}
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <div>{supplier?.name ?? "Unknown"}</div>
                      <div className="text-muted-foreground">
                        {supplier
                          ? `${supplier.leadTimeDays} day SLA`
                          : "No SLA"}
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <div className="font-medium">
                        {Math.round(item.onHandBase)} {item.baseUnit}
                      </div>
                      {item.units.case ? (
                        <div className="text-muted-foreground">
                          {Math.round(
                            convertFromBase(item, item.onHandBase, "case") * 10,
                          ) / 10}{" "}
                          cases
                        </div>
                      ) : null}
                      {warning ? (
                        <div className="mt-1 text-destructive">
                          Short {Math.round(deficit)} {item.baseUnit}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-3 align-top">
                      <div>
                        {Math.round(item.parLevelBase)} {item.baseUnit}
                      </div>
                      <div className="text-muted-foreground">
                        Safety {Math.round(item.safetyStockBase)}
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        {item.allergens.length === 0 ? (
                          <Badge variant="outline">None</Badge>
                        ) : (
                          item.allergens.map((allergen) => (
                            <Badge key={allergen} variant="destructive">
                              {allergen}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <div>
                        {formatCurrency(item.costPerBase, item.currency)} /{" "}
                        {item.baseUnit}
                      </div>
                      {item.units.case ? (
                        <div className="text-muted-foreground">
                          {formatCurrency(
                            item.costPerBase * item.units.case.toBase,
                            item.currency,
                          )}{" "}
                          / case
                        </div>
                      ) : null}
                    </td>
                    <td className="p-3 align-top">
                      <div>{formatDate(item.lastAuditISO)}</div>
                      <div className="text-muted-foreground">
                        {new Intl.RelativeTimeFormat("en", {
                          numeric: "auto",
                        }).format(
                          Math.round(
                            (new Date(item.lastAuditISO).getTime() -
                              Date.now()) /
                              (24 * 3600 * 1000),
                          ),
                          "day",
                        )}
                      </div>
                    </td>
                    <td className="p-3 align-top text-right">
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs"
                          variant="secondary"
                          onClick={() => {
                            setMode("stock");
                            openAdjustDialog(item, "stock");
                          }}
                        >
                          Record count
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs"
                          variant="ghost"
                          onClick={() => {
                            setMode("par");
                            openAdjustDialog(item, "par");
                          }}
                        >
                          Update par
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
        <Dialog
          open={Boolean(editItemId)}
          onOpenChange={(next) => {
            if (!next) {
              setEditItemId(null);
              setEditQty("0");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {mode === "stock" ? "Record stock count" : "Update par levels"}
              </DialogTitle>
              <DialogDescription>
                {mode === "stock"
                  ? "Capture the latest cycle count with unit conversion handled automatically."
                  : "Adjust par and safety stock for demand planning."}
              </DialogDescription>
            </DialogHeader>
            {itemForEdit ? (
              <div className="space-y-3">
                <div className="rounded-md bg-muted/60 p-3 text-sm">
                  {itemForEdit.name}
                </div>
                {mode === "stock" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex flex-col text-sm">
                      <span className="text-muted-foreground">
                        Quantity counted
                      </span>
                      <Input
                        type="number"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col text-sm">
                      <span className="text-muted-foreground">
                        Counted unit
                      </span>
                      <Select value={editUnit} onValueChange={setEditUnit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(itemForEdit.units).map(
                            ([unitKey, unit]) => (
                              <SelectItem key={unitKey} value={unitKey}>
                                {unit.display}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col text-sm">
                      <span className="text-muted-foreground">
                        Par (base unit)
                      </span>
                      <Input
                        value={editPar}
                        onChange={(e) => setEditPar(e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col text-sm">
                      <span className="text-muted-foreground">
                        Safety stock
                      </span>
                      <Input
                        value={editSafety}
                        onChange={(e) => setEditSafety(e.target.value)}
                      />
                    </label>
                  </div>
                )}
              </div>
            ) : null}
            <DialogFooter className="pt-4">
              <Button
                onClick={() => {
                  if (!itemForEdit) return;
                  if (mode === "stock") {
                    const qty = Number(editQty);
                    if (!Number.isFinite(qty)) return;
                    const nextBase =
                      itemForEdit.onHandBase +
                      convertToBase(itemForEdit, qty, editUnit);
                    onAdjustStock(itemForEdit.id, Math.max(0, nextBase));
                  } else {
                    const par = Number(editPar);
                    const safety = Number(editSafety);
                    if (!Number.isFinite(par) || !Number.isFinite(safety))
                      return;
                    onUpdatePar(
                      itemForEdit.id,
                      Math.max(0, par),
                      Math.max(0, safety),
                    );
                  }
                  setEditItemId(null);
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function PurchaseOrderBoard({
  items,
  suppliers,
  orders,
  onAdvance,
  onReceive,
  onCreate,
}: {
  items: CatalogItem[];
  suppliers: Supplier[];
  orders: PurchaseOrder[];
  onAdvance: (orderId: string) => void;
  onReceive: (orderId: string) => void;
  onCreate: (draft: Omit<PurchaseOrder, "id" | "status" | "createdAt">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftSupplier, setDraftSupplier] = useState<string>(
    suppliers[0]?.id ?? "",
  );
  const [expectedDate, setExpectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseOrderLine[]>([
    {
      id: generateId("pol"),
      itemId: items[0]?.id ?? "",
      qty: 1,
      unit:
        items[0] && items[0].units.case ? "case" : (items[0]?.baseUnit ?? ""),
    },
  ]);

  const supplierOrders = useMemo(() => {
    const bySupplier = new Map<string, PurchaseOrder[]>();
    for (const order of orders) {
      const arr = bySupplier.get(order.supplierId) ?? [];
      arr.push(order);
      bySupplier.set(order.supplierId, arr);
    }
    return bySupplier;
  }, [orders]);

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Purchase orders</CardTitle>
        <CardDescription>
          Track lifecycle from draft to receipt and trigger auto-receiving into
          stock levels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) {
                setDraftSupplier(suppliers[0]?.id ?? "");
                setExpectedDate(new Date().toISOString().slice(0, 10));
                setNotes("");
                setLines([
                  {
                    id: generateId("pol"),
                    itemId: items[0]?.id ?? "",
                    qty: 1,
                    unit:
                      items[0] && items[0].units.case
                        ? "case"
                        : (items[0]?.baseUnit ?? ""),
                  },
                ]);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">Create PO</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New purchase order</DialogTitle>
                <DialogDescription>
                  Draft a purchase order with allergen-aware routing for inbound
                  QC.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col text-sm">
                    <span className="text-muted-foreground">Supplier</span>
                    <Select
                      value={draftSupplier}
                      onValueChange={setDraftSupplier}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="flex flex-col text-sm">
                    <span className="text-muted-foreground">
                      Expected delivery
                    </span>
                    <Input
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Line items</div>
                  <div className="space-y-2">
                    {lines.map((line, index) => {
                      const item = items.find((it) => it.id === line.itemId);
                      return (
                        <div
                          key={line.id}
                          className="grid gap-2 rounded-md border p-2 sm:grid-cols-[2fr_1fr_1fr_auto]"
                        >
                          <Select
                            value={line.itemId}
                            onValueChange={(value) =>
                              setLines((prev) =>
                                prev.map((l) =>
                                  l.id === line.id
                                    ? {
                                        ...l,
                                        itemId: value,
                                        unit: items.find(
                                          (it) => it.id === value,
                                        )?.units.case
                                          ? "case"
                                          : (items.find((it) => it.id === value)
                                              ?.baseUnit ?? ""),
                                      }
                                    : l,
                                ),
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Item" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((it) => (
                                <SelectItem key={it.id} value={it.id}>
                                  {it.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={line.qty}
                            onChange={(e) =>
                              setLines((prev) =>
                                prev.map((l) =>
                                  l.id === line.id
                                    ? { ...l, qty: Number(e.target.value) }
                                    : l,
                                ),
                              )
                            }
                          />
                          <Select
                            value={line.unit}
                            onValueChange={(value) =>
                              setLines((prev) =>
                                prev.map((l) =>
                                  l.id === line.id ? { ...l, unit: value } : l,
                                ),
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {item
                                ? Object.entries(item.units).map(([key, u]) => (
                                    <SelectItem key={key} value={key}>
                                      {u.display}
                                    </SelectItem>
                                  ))
                                : null}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center justify-end">
                            {index > 0 ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Remove line"
                                onClick={() =>
                                  setLines((prev) =>
                                    prev.filter((l) => l.id !== line.id),
                                  )
                                }
                              >
                                ×
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setLines((prev) => [
                        ...prev,
                        {
                          id: generateId("pol"),
                          itemId: items[0]?.id ?? "",
                          qty: 1,
                          unit:
                            items[0] && items[0].units.case
                              ? "case"
                              : (items[0]?.baseUnit ?? ""),
                        },
                      ])
                    }
                  >
                    Add line
                  </Button>
                </div>
                <Textarea
                  rows={3}
                  placeholder="Receiving notes, QA holds, trajectory tracking"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button
                  onClick={() => {
                    if (
                      !draftSupplier ||
                      lines.some((line) => !line.itemId || line.qty <= 0)
                    )
                      return;
                    onCreate({
                      supplierId: draftSupplier,
                      expectedDate: new Date(expectedDate).toISOString(),
                      submittedBy: "System",
                      lines,
                      notes,
                    });
                    setOpen(false);
                  }}
                >
                  Create draft
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-3">
          {suppliers.map((supplier) => {
            const supplierPOs = supplierOrders.get(supplier.id) ?? [];
            return (
              <div key={supplier.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{supplier.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {supplierPOs.length} open orders · {supplier.leadTimeDays}{" "}
                      day SLA
                    </div>
                  </div>
                </div>
                {supplierPOs.length === 0 ? (
                  <div className="pt-3 text-xs text-muted-foreground">
                    No open orders.
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {supplierPOs.map((order) => (
                      <div
                        key={order.id}
                        className="grid gap-2 rounded-md border bg-muted/60 p-3 md:grid-cols-[1fr_auto]"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <Badge variant="outline">{order.id}</Badge>
                            <Badge
                              variant={
                                order.status === "received"
                                  ? "default"
                                  : order.status === "draft"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {STATUS_LABEL[order.status]}
                            </Badge>
                            <span className="text-muted-foreground">
                              ETA {formatDate(order.expectedDate)}
                            </span>
                          </div>
                          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {order.lines.map((line) => {
                              const item = items.find(
                                (it) => it.id === line.itemId,
                              );
                              return (
                                <li key={line.id}>
                                  {line.qty} {line.unit} ��{" "}
                                  {item?.name ?? "Unknown"}
                                </li>
                              );
                            })}
                          </ul>
                          {order.notes ? (
                            <p className="mt-2 rounded bg-background/60 p-2 text-xs">
                              {order.notes}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-col justify-center gap-2">
                          {order.status !== "received" ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                if (
                                  findStatusStep(order.status) >=
                                  STATUS_FLOW.length - 1
                                )
                                  return;
                                if (order.status === "in_transit")
                                  onReceive(order.id);
                                else onAdvance(order.id);
                              }}
                            >
                              {order.status === "in_transit"
                                ? "Receive"
                                : "Advance"}
                            </Button>
                          ) : (
                            <Badge variant="secondary">Closed</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function UnitConverter({ items }: { items: CatalogItem[] }) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [fromUnit, setFromUnit] = useState("case");
  const [toUnit, setToUnit] = useState("kg");
  const [qty, setQty] = useState("1");

  const item = items.find((it) => it.id === itemId);
  const result = useMemo(() => {
    if (!item) return null;
    const quantity = Number(qty);
    if (!Number.isFinite(quantity)) return null;
    const base = convertToBase(item, quantity, fromUnit);
    const converted = convertFromBase(item, base, toUnit);
    if (!Number.isFinite(converted)) return null;
    return converted;
  }, [item, qty, fromUnit, toUnit]);

  React.useEffect(() => {
    if (!item) return;
    if (!item.units[fromUnit]) {
      const next = Object.keys(item.units)[0];
      setFromUnit(next);
    }
    if (!item.units[toUnit]) {
      const next = Object.keys(item.units)[0];
      setToUnit(next);
    }
  }, [item, fromUnit, toUnit]);

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Unit conversion</CardTitle>
        <CardDescription>
          Convert supplier pack sizes to production units with density-aware
          factors per item.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col text-sm">
          <span className="text-muted-foreground">Item</span>
          <Select
            value={itemId}
            onValueChange={(value) => {
              setItemId(value);
              const defaultUnits = Object.keys(
                items.find((it) => it.id === value)?.units ?? {},
              );
              setFromUnit(defaultUnits[0] ?? "");
              setToUnit(defaultUnits[defaultUnits.length - 1] ?? "");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((it) => (
                <SelectItem key={it.id} value={it.id}>
                  {it.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col text-sm">
            <span className="text-muted-foreground">Quantity</span>
            <Input value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>
          <label className="flex flex-col text-sm">
            <span className="text-muted-foreground">From unit</span>
            <Select value={fromUnit} onValueChange={setFromUnit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {item
                  ? Object.entries(item.units).map(([key, unit]) => (
                      <SelectItem key={key} value={key}>
                        {unit.display}
                      </SelectItem>
                    ))
                  : null}
              </SelectContent>
            </Select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col text-sm">
            <span className="text-muted-foreground">Converted unit</span>
            <Select value={toUnit} onValueChange={setToUnit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {item
                  ? Object.entries(item.units).map(([key, unit]) => (
                      <SelectItem key={key} value={key}>
                        {unit.display}
                      </SelectItem>
                    ))
                  : null}
              </SelectContent>
            </Select>
          </label>
          <div className="flex flex-col justify-end rounded-md border bg-muted/60 p-3 text-sm">
            <span className="text-muted-foreground">Result</span>
            <span className="text-lg font-semibold">
              {result === null
                ? "—"
                : `${Math.round(result * 100) / 100} ${toUnit}`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InventorySuppliesWorkspace() {
  const [suppliers, setSuppliers] = useState(INITIAL_SUPPLIERS);
  const [items, setItems] = useState(INITIAL_CATALOG);
  const [orders, setOrders] = useState(INITIAL_POS);
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [lastImportAt, setLastImportAt] = useState<number | null>(null);
  const [importMetrics, setImportMetrics] = useState<ImportMetrics | null>(null);

  const handleImportFromBuilder = useCallback(async () => {
    if (isImporting) return;
    setIsImporting(true);
    try {
      const data = await fetchPurchasingReceivingData();
      if (!data.suppliers.length && !data.items.length && !data.orders.length) {
        throw new Error("No Purchasing_Receiving records found in Builder.io.");
      }
      setSuppliers((prev) => (data.suppliers.length ? data.suppliers : prev));
      setItems((prev) => (data.items.length ? data.items : prev));
      setOrders((prev) => (data.orders.length ? data.orders : prev));

      const metrics: ImportMetrics = {
        suppliers: data.suppliers.length ? data.suppliers.length : suppliers.length,
        items: data.items.length ? data.items.length : items.length,
        orders: data.orders.length ? data.orders.length : orders.length,
      };
      setImportMetrics(metrics);
      setLastImportAt(Date.now());
      toast({
        title: "Purchasing data synced",
        description: `Suppliers ${metrics.suppliers}, catalog ${metrics.items}, orders ${metrics.orders}.`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to import Purchasing_Receiving data.";
      console.error("Builder import failed", error);
      const fallback = getFallbackPurchasingData();
      setSuppliers(fallback.suppliers);
      setItems(fallback.items);
      setOrders(fallback.orders);
      const metrics: ImportMetrics = {
        suppliers: fallback.suppliers.length,
        items: fallback.items.length,
        orders: fallback.orders.length,
      };
      setImportMetrics(metrics);
      setLastImportAt(Date.now());
      toast({
        title: "Builder import unavailable",
        description: `${message} Loaded demo Purchasing_Receiving data instead.`,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  }, [isImporting, toast, suppliers.length, items.length, orders.length]);

  const handleCreateSupplier = useCallback((input: Omit<Supplier, "id">) => {
    setSuppliers((prev) => [...prev, { id: generateId("sup"), ...input }]);
  }, []);

  const handleAdjustStock = useCallback((itemId: string, nextBase: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              onHandBase: Math.round(nextBase * 100) / 100,
              lastAuditISO: new Date().toISOString(),
            }
          : item,
      ),
    );
  }, []);

  const handleUpdatePar = useCallback(
    (itemId: string, parBase: number, safetyBase: number) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                parLevelBase: Math.round(parBase * 100) / 100,
                safetyStockBase: Math.round(safetyBase * 100) / 100,
              }
            : item,
        ),
      );
    },
    [],
  );

  const handleAdvanceOrder = useCallback((orderId: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const currentStep = findStatusStep(order.status);
        const nextStatus =
          STATUS_FLOW[Math.min(currentStep + 1, STATUS_FLOW.length - 1)];
        return { ...order, status: nextStatus };
      }),
    );
  }, []);

  const handleReceiveOrder = useCallback(
    (orderId: string) => {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: "received" } : order,
        ),
      );
      setItems((prev) => {
        const order = orders.find((o) => o.id === orderId);
        if (!order) return prev;
        const next = prev.map((item) => {
          const lines = order.lines.filter((line) => line.itemId === item.id);
          if (lines.length === 0) return item;
          const receivedBase = lines.reduce(
            (sum, line) => sum + convertToBase(item, line.qty, line.unit),
            0,
          );
          return {
            ...item,
            onHandBase:
              Math.round((item.onHandBase + receivedBase) * 100) / 100,
            lastAuditISO: new Date().toISOString(),
          };
        });
        return next;
      });
    },
    [orders],
  );

  const handleCreateOrder = useCallback(
    (draft: Omit<PurchaseOrder, "id" | "status" | "createdAt">) => {
      setOrders((prev) => [
        {
          ...draft,
          id: generateId("po"),
          createdAt: new Date().toISOString(),
          status: "draft",
        },
        ...prev,
      ]);
    },
    [],
  );

  return (
    <div className="space-y-4">
      <BuilderImportToolbar
        isLoading={isImporting}
        onImport={handleImportFromBuilder}
        lastImportAt={lastImportAt}
        metrics={importMetrics}
      />
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <SupplierGrid
          suppliers={suppliers}
          onCreateSupplier={handleCreateSupplier}
        />
        <InventoryHealth items={items} suppliers={suppliers} />
      </div>
      <CatalogTable
        items={items}
        suppliers={suppliers}
        onAdjustStock={handleAdjustStock}
        onUpdatePar={handleUpdatePar}
      />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <PurchaseOrderBoard
          items={items}
          suppliers={suppliers}
          orders={orders}
          onAdvance={handleAdvanceOrder}
          onReceive={handleReceiveOrder}
          onCreate={handleCreateOrder}
        />
        <UnitConverter items={items} />
      </div>
    </div>
  );
}
