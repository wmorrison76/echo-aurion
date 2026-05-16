/**
 * Inventory Management Service
 * Handles inventory tracking, scanned items, and stock management
 */

import { supabase } from "@/lib/auth-service";

export interface InventoryItem {
  id: string;
  outletId: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minimumStock: number;
  maximumStock: number;
  unitCost: number;
  supplier?: string;
  lastStockCheckDate?: number;
  expiryDate?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ScannedItem {
  id: string;
  inventoryItemId: string;
  outletId: string;
  sku: string;
  quantity: number;
  scannedAt: number;
  scannedBy: string;
  expiryDate?: number;
  lotNumber?: string;
  batchId?: string;
  receiptId?: string;
}

export interface InventoryTransaction {
  id: string;
  outletId: string;
  inventoryItemId: string;
  transactionType:
    | "scan"
    | "adjustment"
    | "use"
    | "transfer_out"
    | "transfer_in"
    | "damage"
    | "return";
  quantity: number;
  reason?: string;
  reference?: string; // recipe ID, transfer ID, etc.
  createdBy: string;
  createdAt: number;
  metadata?: Record<string, any>;
}

export interface StockAlert {
  id: string;
  outletId: string;
  inventoryItemId: string;
  itemName: string;
  alertType: "low_stock" | "expired" | "no_stock";
  currentLevel: number;
  threshold: number;
  createdAt: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
}

/**
 * Add or update inventory item
 */
export async function upsertInventoryItem(
  outletId: string,
  item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">,
): Promise<{ success: boolean; data?: InventoryItem; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    // Check if exists
    const { data: existing } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("outlet_id", outletId)
      .eq("sku", item.sku)
      .single();

    let result;

    if (existing) {
      // Update
      result = await supabase
        .from("inventory_items")
        .update({
          ...item,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      // Create
      result = await supabase
        .from("inventory_items")
        .insert({
          outlet_id: outletId,
          ...item,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
    }

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return {
      success: true,
      data: mapInventoryItem(result.data),
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get inventory items for outlet
 */
export async function getOutletInventory(
  outletId: string,
): Promise<InventoryItem[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("outlet_id", outletId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching inventory:", error);
      return [];
    }

    return data?.map(mapInventoryItem) || [];
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return [];
  }
}

/**
 * Search inventory items
 */
export async function searchInventory(
  outletId: string,
  query: string,
): Promise<InventoryItem[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("outlet_id", outletId)
      .or(
        `name.ilike.%${query}%,sku.ilike.%${query}%,category.ilike.%${query}%`,
      )
      .limit(20);

    if (error) {
      return [];
    }

    return data?.map(mapInventoryItem) || [];
  } catch (error) {
    return [];
  }
}

/**
 * Record scanned item
 */
export async function recordScannedItem(
  outletId: string,
  sku: string,
  quantity: number,
  scannedBy: string,
  metadata?: {
    expiryDate?: number;
    lotNumber?: string;
    batchId?: string;
    receiptId?: string;
  },
): Promise<{ success: boolean; data?: ScannedItem; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    // Get inventory item
    const { data: item } = await supabase
      .from("inventory_items")
      .select("id, quantity")
      .eq("outlet_id", outletId)
      .eq("sku", sku)
      .single();

    if (!item) {
      return { success: false, error: "Item not found in inventory" };
    }

    // Record scanned item
    const { data, error } = await supabase
      .from("scanned_items")
      .insert({
        inventory_item_id: item.id,
        outlet_id: outletId,
        sku,
        quantity,
        scanned_at: new Date().toISOString(),
        scanned_by: scannedBy,
        ...metadata,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Update inventory quantity
    const { data: updated } = await supabase
      .from("inventory_items")
      .update({
        quantity: item.quantity + quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .select()
      .single();

    // Log transaction
    await logTransaction(outletId, item.id, "scan", quantity, scannedBy, {
      scanned_item_id: data.id,
    });

    // Check stock levels
    await checkStockLevels(outletId, item.id, quantity);

    return {
      success: true,
      data: mapScannedItem(data),
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Record inventory adjustment
 */
export async function adjustInventory(
  outletId: string,
  inventoryItemId: string,
  quantityAdjustment: number,
  reason: string,
  adjustedBy: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const { data: item, error: fetchError } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("id", inventoryItemId)
      .eq("outlet_id", outletId)
      .single();

    if (fetchError || !item) {
      return { success: false, error: "Item not found" };
    }

    const newQuantity = Math.max(0, item.quantity + quantityAdjustment);

    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inventoryItemId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Log transaction
    await logTransaction(
      outletId,
      inventoryItemId,
      "adjustment",
      quantityAdjustment,
      adjustedBy,
      { reason },
    );

    // Check stock levels
    if (quantityAdjustment > 0) {
      await checkStockLevels(outletId, inventoryItemId, newQuantity);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get inventory transactions
 */
export async function getInventoryTransactions(
  outletId: string,
  itemId?: string,
  limit: number = 100,
): Promise<InventoryTransaction[]> {
  if (!supabase) {
    return [];
  }

  try {
    let query = supabase
      .from("inventory_transactions")
      .select("*")
      .eq("outlet_id", outletId);

    if (itemId) {
      query = query.eq("inventory_item_id", itemId);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return [];
    }

    return data?.map(mapTransaction) || [];
  } catch (error) {
    return [];
  }
}

/**
 * Get stock alerts
 */
export async function getStockAlerts(
  outletId: string,
  acknowledgedOnly: boolean = false,
): Promise<StockAlert[]> {
  if (!supabase) {
    return [];
  }

  try {
    let query = supabase
      .from("stock_alerts")
      .select("*")
      .eq("outlet_id", outletId);

    if (!acknowledgedOnly) {
      query = query.eq("acknowledged", false);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      return [];
    }

    return data?.map(mapAlert) || [];
  } catch (error) {
    return [];
  }
}

/**
 * Acknowledge stock alert
 */
export async function acknowledgeAlert(
  alertId: string,
  acknowledgedBy: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const { error } = await supabase
      .from("stock_alerts")
      .update({
        acknowledged: true,
        acknowledged_by: acknowledgedBy,
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    return { success: !error, error: error?.message };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Log inventory transaction
 */
async function logTransaction(
  outletId: string,
  inventoryItemId: string,
  type: InventoryTransaction["transactionType"],
  quantity: number,
  createdBy: string,
  metadata?: Record<string, any>,
): Promise<void> {
  if (!supabase) return;

  try {
    await supabase.from("inventory_transactions").insert({
      outlet_id: outletId,
      inventory_item_id: inventoryItemId,
      transaction_type: type,
      quantity,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      metadata,
    });
  } catch (error) {
    console.error("Error logging transaction:", error);
  }
}

/**
 * Check stock levels and create alerts
 */
async function checkStockLevels(
  outletId: string,
  itemId: string,
  currentQuantity: number,
): Promise<void> {
  if (!supabase) return;

  try {
    const { data: item } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("id", itemId)
      .single();

    if (!item) return;

    const existingAlert = await supabase
      .from("stock_alerts")
      .select("*")
      .eq("inventory_item_id", itemId)
      .eq("outlet_id", outletId)
      .eq("acknowledged", false)
      .single();

    if (existingAlert.data) {
      return; // Alert already exists
    }

    let alertType: StockAlert["alertType"] | null = null;

    if (currentQuantity === 0) {
      alertType = "no_stock";
    } else if (currentQuantity <= item.minimum_stock) {
      alertType = "low_stock";
    } else if (item.expiry_date && item.expiry_date < Date.now()) {
      alertType = "expired";
    }

    if (alertType) {
      await supabase.from("stock_alerts").insert({
        outlet_id: outletId,
        inventory_item_id: itemId,
        item_name: item.name,
        alert_type: alertType,
        current_level: currentQuantity,
        threshold:
          alertType === "no_stock"
            ? 0
            : alertType === "expired"
              ? 0
              : item.minimum_stock,
        created_at: new Date().toISOString(),
        acknowledged: false,
      });
    }
  } catch (error) {
    console.error("Error checking stock levels:", error);
  }
}

/**
 * Map database records to types
 */
function mapInventoryItem(record: any): InventoryItem {
  return {
    id: record.id,
    outletId: record.outlet_id,
    sku: record.sku,
    name: record.name,
    category: record.category,
    quantity: record.quantity,
    unit: record.unit,
    minimumStock: record.minimum_stock,
    maximumStock: record.maximum_stock,
    unitCost: record.unit_cost,
    supplier: record.supplier,
    lastStockCheckDate: record.last_stock_check_date
      ? new Date(record.last_stock_check_date).getTime()
      : undefined,
    expiryDate: record.expiry_date
      ? new Date(record.expiry_date).getTime()
      : undefined,
    createdAt: new Date(record.created_at).getTime(),
    updatedAt: new Date(record.updated_at).getTime(),
  };
}

function mapScannedItem(record: any): ScannedItem {
  return {
    id: record.id,
    inventoryItemId: record.inventory_item_id,
    outletId: record.outlet_id,
    sku: record.sku,
    quantity: record.quantity,
    scannedAt: new Date(record.scanned_at).getTime(),
    scannedBy: record.scanned_by,
    expiryDate: record.expiry_date
      ? new Date(record.expiry_date).getTime()
      : undefined,
    lotNumber: record.lot_number,
    batchId: record.batch_id,
    receiptId: record.receipt_id,
  };
}

function mapTransaction(record: any): InventoryTransaction {
  return {
    id: record.id,
    outletId: record.outlet_id,
    inventoryItemId: record.inventory_item_id,
    transactionType: record.transaction_type,
    quantity: record.quantity,
    reason: record.reason,
    reference: record.reference,
    createdBy: record.created_by,
    createdAt: new Date(record.created_at).getTime(),
    metadata: record.metadata,
  };
}

function mapAlert(record: any): StockAlert {
  return {
    id: record.id,
    outletId: record.outlet_id,
    inventoryItemId: record.inventory_item_id,
    itemName: record.item_name,
    alertType: record.alert_type,
    currentLevel: record.current_level,
    threshold: record.threshold,
    createdAt: new Date(record.created_at).getTime(),
    acknowledged: record.acknowledged,
    acknowledgedBy: record.acknowledged_by,
    acknowledgedAt: record.acknowledged_at
      ? new Date(record.acknowledged_at).getTime()
      : undefined,
  };
}
