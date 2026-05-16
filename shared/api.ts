/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

// ============================================================================
// GENERIC API RESPONSE TYPES
// ============================================================================

/**
 * Standardized API response shape for successful responses
 */
export interface ApiResponse<T = any> {
  success: true;
  data?: T;
}

/**
 * Standardized API error response shape
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  error_code?: string;
  details?: Record<string, any>;
}

/**
 * Union type for any API response
 */
export type ApiResponseUnion<T = any> = ApiResponse<T> | ApiErrorResponse;

// ============================================================================
// INVENTORY-SPECIFIC RESPONSE TYPES
// ============================================================================

/**
 * Re-export inventory types for client/server sharing
 */
export type {
  InventoryItem,
  InventoryTransaction,
  TransactionType,
  WasteCategory,
  LocationType,
  ReceiptLine,
  InventoryReceiptRequest,
  InventoryReceiptResponse,
  TransferLine,
  InventoryTransferRequest,
  InventoryTransferResponse,
  WasteLine,
  InventoryWasteRequest,
  InventoryWasteResponse,
  InventorySnapshot,
  TransactionHistoryQuery,
  TransactionHistoryResponse,
  WeightedAverageCost,
} from "./inventory-types";

export {
  TransactionType,
  WasteCategory,
  LocationType,
} from "./inventory-types";

// ============================================================================
// PURCHASING / RECEIVING UNIT HELPERS (shared)
// ============================================================================

export function normalizeUnit(u: string): string {
  const s = (u || "").toLowerCase().trim();
  const map: Record<string, string> = {
    oz: "oz",
    ounce: "oz",
    ounces: "oz",
    lb: "lb",
    lbs: "lb",
    pound: "lb",
    pounds: "lb",
    g: "g",
    gram: "g",
    grams: "g",
    kg: "kg",
    kilogram: "kg",
    kilograms: "kg",
    ml: "ml",
    l: "l",
    liter: "l",
    litres: "l",
    litre: "l",
    each: "each",
    ea: "each",
    ct: "each",
    count: "each",
    case: "case",
    cs: "case",
  };
  return map[s] || s;
}

function getSettingsConversions(): { from: string; to: string; factor: number }[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem("echo_settings");
    if (!raw) return [];
    const s = JSON.parse(raw);
    return (s.conversions || []).map((r: any) => ({
      from: normalizeUnit(r.from || ""),
      to: normalizeUnit(r.to || ""),
      factor: Number(r.factor || 1),
    }));
  } catch {
    return [];
  }
}

function defaultEdges() {
  return [
    { from: "lb", to: "oz", factor: 16 },
    { from: "g", to: "oz", factor: 1 / 28.3495 },
    { from: "kg", to: "oz", factor: 35.27396195 },
    { from: "ml", to: "oz", factor: 1 / 29.5735 },
    { from: "l", to: "oz", factor: 33.8140226 },
  ];
}

export const toOunces = (qty: number, unit: string): number => {
  const src = normalizeUnit(unit);
  if (src === "oz") return qty;

  const edges = [...defaultEdges(), ...getSettingsConversions()];
  const graph = new Map<string, { to: string; factor: number }[]>();
  const add = (a: string, b: string, f: number) => {
    const arr = graph.get(a) || [];
    arr.push({ to: b, factor: f });
    graph.set(a, arr);
  };

  for (const e of edges) {
    add(e.from, e.to, e.factor);
    add(e.to, e.from, 1 / Number(e.factor || 1));
  }

  const target = "oz";
  const q: { u: string; f: number }[] = [{ u: src, f: 1 }];
  const seen = new Set<string>([src]);
  while (q.length) {
    const cur = q.shift()!;
    if (cur.u === target) return qty * cur.f;
    for (const nxt of graph.get(cur.u) || []) {
      if (seen.has(nxt.to)) continue;
      seen.add(nxt.to);
      q.push({ u: nxt.to, f: cur.f * nxt.factor });
    }
  }

  switch (src) {
    case "lb":
      return qty * 16;
    case "g":
      return qty / 28.3495;
    case "kg":
      return (qty * 1000) / 28.3495;
    case "ml":
      return qty / 29.5735;
    case "l":
      return (qty * 1000) / 29.5735;
    default:
      return qty;
  }
};
