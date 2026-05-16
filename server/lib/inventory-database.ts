/**
 * LUCCCA Inventory Framework - Database Layer
 * Abstracts Supabase queries for inventory operations
 */

import { createClient } from "@supabase/supabase-js";
import type {
  InventoryItem,
  InventoryTransaction,
  TransactionType,
} from "@shared/inventory-types";

// ============================================================================
// DATABASE CLIENT
// ============================================================================

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error("Missing Supabase credentials in environment");
    }

    supabaseClient = createClient(url, key);
  }

  return supabaseClient;
}

// ============================================================================
// INVENTORY ITEMS QUERIES
// ============================================================================

/**
 * Get a single inventory item by org, product, and location
 */
export async function getInventoryItem(
  orgId: string,
  productId: string,
  locationId: string
): Promise<InventoryItem | null> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("inventory_items")
    .select("*")
    .eq("org_id", orgId)
    .eq("product_id", productId)
    .eq("location_id", locationId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found (expected)
    console.error("[InventoryDB] Failed to get inventory item:", error);
  }

  return data || null;
}

/**
 * Get all inventory items for an organization
 */
export async function getInventoryItemsByOrg(
  orgId: string,
  filters?: {
    productId?: string;
    locationId?: string;
    activeOnly?: boolean;
  }
): Promise<InventoryItem[]> {
  const client = getSupabaseClient();

  let query = client
    .from("inventory_items")
    .select("*")
    .eq("org_id", orgId);

  if (filters?.productId) {
    query = query.eq("product_id", filters.productId);
  }

  if (filters?.locationId) {
    query = query.eq("location_id", filters.locationId);
  }

  if (filters?.activeOnly !== false) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[InventoryDB] Failed to get inventory items:", error);
    return [];
  }

  return data || [];
}

/**
 * Create or update an inventory item
 * Returns the created/updated record
 */
export async function upsertInventoryItem(
  orgId: string,
  productId: string,
  locationId: string,
  updates: {
    on_hand_qty?: number;
    avg_cost?: number;
    last_receipt_at?: string;
    last_count_at?: string;
    base_uom?: string;
  }
): Promise<InventoryItem | null> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("inventory_items")
    .upsert(
      {
        org_id: orgId,
        product_id: productId,
        location_id: locationId,
        updated_at: new Date().toISOString(),
        ...updates,
      },
      {
        onConflict: "org_id,product_id,location_id",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("[InventoryDB] Failed to upsert inventory item:", error);
    return null;
  }

  return data || null;
}

/**
 * Get inventory snapshot for a location or org
 * Returns total quantities and valuation
 */
export async function getInventorySnapshot(
  orgId: string,
  locationId?: string
): Promise<{
  items: InventoryItem[];
  total_qty: number;
  total_valuation: number;
}> {
  const items = await getInventoryItemsByOrg(orgId, {
    locationId,
    activeOnly: true,
  });

  const total_qty = items.reduce((sum, item) => sum + item.on_hand_qty, 0);
  const total_valuation = items.reduce(
    (sum, item) => sum + item.on_hand_qty * item.avg_cost,
    0
  );

  return {
    items,
    total_qty,
    total_valuation,
  };
}

// ============================================================================
// INVENTORY TRANSACTIONS QUERIES
// ============================================================================

/**
 * Log a new transaction (immutable)
 */
export async function logTransaction(
  transaction: Omit<InventoryTransaction, "created_at" | "id">
): Promise<InventoryTransaction | null> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("inventory_transactions")
    .insert({
      ...transaction,
      occurred_at: transaction.occurred_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[InventoryDB] Failed to log transaction:", error);
    return null;
  }

  return data || null;
}

/**
 * Get transaction history with filters
 */
export async function getTransactionHistory(
  orgId: string,
  filters?: {
    productId?: string;
    locationId?: string;
    fromLocationId?: string;
    toLocationId?: string;
    transactionType?: TransactionType;
    sourceModule?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{
  transactions: InventoryTransaction[];
  total_count: number;
}> {
  const client = getSupabaseClient();

  let query = client
    .from("inventory_transactions")
    .select("*", { count: "exact" })
    .eq("org_id", orgId)
    .order("occurred_at", { ascending: false });

  if (filters?.productId) {
    query = query.eq("product_id", filters.productId);
  }

  if (filters?.locationId) {
    query = query.eq("location_id", filters.locationId);
  }

  if (filters?.fromLocationId) {
    query = query.eq("from_location_id", filters.fromLocationId);
  }

  if (filters?.toLocationId) {
    query = query.eq("to_location_id", filters.toLocationId);
  }

  if (filters?.transactionType) {
    query = query.eq("type", filters.transactionType);
  }

  if (filters?.sourceModule) {
    query = query.eq("source_module", filters.sourceModule);
  }

  if (filters?.dateFrom) {
    query = query.gte("occurred_at", filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte("occurred_at", filters.dateTo);
  }

  const limit = filters?.limit || 100;
  const offset = filters?.offset || 0;

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("[InventoryDB] Failed to get transaction history:", error);
    return { transactions: [], total_count: 0 };
  }

  return {
    transactions: data || [],
    total_count: count || 0,
  };
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(
  id: string
): Promise<InventoryTransaction | null> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("inventory_transactions")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[InventoryDB] Failed to get transaction:", error);
  }

  return data || null;
}

// ============================================================================
// PRODUCT QUERIES
// ============================================================================

/**
 * Get product by ID
 */
export async function getProductById(productId: string): Promise<any | null> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[InventoryDB] Failed to get product:", error);
  }

  return data || null;
}

/**
 * Get all products for an org
 */
export async function getProductsByOrg(orgId: string): Promise<any[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("org_id", orgId)
    .eq("is_active", true);

  if (error) {
    console.error("[InventoryDB] Failed to get products:", error);
    return [];
  }

  return data || [];
}

// ============================================================================
// LOCATION QUERIES
// ============================================================================

/**
 * Get location by ID
 */
export async function getLocationById(locationId: string): Promise<any | null> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("locations_inventory")
    .select("*")
    .eq("id", locationId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[InventoryDB] Failed to get location:", error);
  }

  return data || null;
}

/**
 * Get all locations for an org
 */
export async function getLocationsByOrg(orgId: string): Promise<any[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("locations_inventory")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active");

  if (error) {
    console.error("[InventoryDB] Failed to get locations:", error);
    return [];
  }

  return data || [];
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Log multiple transactions at once
 * Useful for batch receipts or transfers
 */
export async function logTransactionsBatch(
  transactions: Array<
    Omit<InventoryTransaction, "created_at" | "id">
  >
): Promise<InventoryTransaction[]> {
  if (transactions.length === 0) {
    return [];
  }

  const client = getSupabaseClient();

  const withTimestamps = transactions.map((t) => ({
    ...t,
    occurred_at: t.occurred_at || new Date().toISOString(),
    created_at: new Date().toISOString(),
  }));

  const { data, error } = await client
    .from("inventory_transactions")
    .insert(withTimestamps)
    .select();

  if (error) {
    console.error("[InventoryDB] Failed to batch log transactions:", error);
    return [];
  }

  return data || [];
}

/**
 * Upsert multiple inventory items
 */
export async function upsertInventoryItemsBatch(
  items: Array<Omit<InventoryItem, "created_at" | "updated_at">>
): Promise<InventoryItem[]> {
  if (items.length === 0) {
    return [];
  }

  const client = getSupabaseClient();

  const withTimestamps = items.map((item) => ({
    ...item,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await client
    .from("inventory_items")
    .upsert(withTimestamps, {
      onConflict: "org_id,product_id,location_id",
    })
    .select();

  if (error) {
    console.error("[InventoryDB] Failed to batch upsert inventory items:", error);
    return [];
  }

  return data || [];
}
