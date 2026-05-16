/**
 * LUCCCA Inventory Framework - Service Layer
 * Core business logic for inventory operations
 * Handles cost calculations, validations, and transaction processing
 */

import type {
  InventoryItem,
  InventoryTransaction,
  TransactionType,
  ReceiptLine,
  TransferLine,
  WasteLine,
  WeightedAverageCost,
  WasteCategory,
  InventoryReceiptResponse,
  InventoryTransferResponse,
  InventoryWasteResponse,
} from "@shared/inventory-types";
import {
  getInventoryItem,
  upsertInventoryItem,
  logTransaction,
  logTransactionsBatch,
  upsertInventoryItemsBatch,
  getProductById,
  getLocationById,
  getInventorySnapshot,
  getTransactionHistory,
} from "./inventory-database";
import { emitTrace } from "./trace-emitter";

// ============================================================================
// COST CALCULATION
// ============================================================================

/**
 * Calculate weighted average cost
 * Formula: (existingQty * existingCost + newQty * newCost) / (existingQty + newQty)
 */
export function calculateWeightedAverageCost(
  existingQty: number,
  existingCost: number,
  newQty: number,
  newCost: number
): WeightedAverageCost {
  const totalQty = existingQty + newQty;

  if (totalQty === 0) {
    return {
      existingQty,
      existingCost,
      newQty,
      newCost,
      resultingQty: 0,
      resultingCost: 0,
    };
  }

  const resultingCost =
    (existingQty * existingCost + newQty * newCost) / totalQty;

  return {
    existingQty,
    existingCost,
    newQty,
    newCost,
    resultingQty: totalQty,
    resultingCost: Math.round(resultingCost * 100) / 100, // Round to 2 decimals
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that a product exists
 */
export async function validateProduct(
  productId: string
): Promise<{ valid: boolean; error?: string }> {
  const product = await getProductById(productId);

  if (!product) {
    return { valid: false, error: `Product ${productId} not found` };
  }

  if (!product.is_active) {
    return { valid: false, error: `Product ${productId} is inactive` };
  }

  return { valid: true };
}

/**
 * Validate that a location exists
 */
export async function validateLocation(
  locationId: string
): Promise<{ valid: boolean; error?: string }> {
  const location = await getLocationById(locationId);

  if (!location) {
    return { valid: false, error: `Location ${locationId} not found` };
  }

  if (location.status !== "active") {
    return { valid: false, error: `Location ${locationId} is not active` };
  }

  return { valid: true };
}

/**
 * Validate inventory move (sufficient stock)
 */
export async function validateInventoryMove(
  orgId: string,
  productId: string,
  fromLocationId: string,
  qty: number
): Promise<{ valid: boolean; error?: string; currentQty?: number }> {
  const item = await getInventoryItem(orgId, productId, fromLocationId);

  if (!item) {
    return {
      valid: false,
      error: `No inventory found for product ${productId} at location ${fromLocationId}`,
      currentQty: 0,
    };
  }

  if (item.on_hand_qty < qty) {
    return {
      valid: false,
      error: `Insufficient stock. Available: ${item.on_hand_qty}, Requested: ${qty}`,
      currentQty: item.on_hand_qty,
    };
  }

  return { valid: true, currentQty: item.on_hand_qty };
}

// ============================================================================
// RECEIPT PROCESSING
// ============================================================================

/**
 * Process inventory receipt (new stock arrival)
 * Updates inventory_items with new quantity and recalculates weighted average cost
 * Logs transaction for audit trail
 */
export async function processInventoryReceipt(
  orgId: string,
  lines: ReceiptLine[],
  userId?: string,
  sourceRef?: string,
  sourceModule: string = "MANUAL"
): Promise<InventoryReceiptResponse> {
  const errors: string[] = [];
  const transactionIds: string[] = [];
  const itemsUpdated: { item: InventoryItem; oldCost: number }[] = [];

  // Validate all lines first
  for (const line of lines) {
    if (!line.product_id || !line.location_id || !line.qty || !line.unit_cost) {
      errors.push(
        `Invalid receipt line: missing required fields (product_id, location_id, qty, unit_cost)`
      );
      continue;
    }

    if (line.qty <= 0) {
      errors.push(
        `Receipt quantity must be positive: product ${line.product_id}`
      );
      continue;
    }

    if (line.unit_cost < 0) {
      errors.push(
        `Unit cost must be non-negative: product ${line.product_id}`
      );
      continue;
    }

    const productValid = await validateProduct(line.product_id);
    if (!productValid.valid) {
      errors.push(productValid.error || "Product validation failed");
      continue;
    }

    const locationValid = await validateLocation(line.location_id);
    if (!locationValid.valid) {
      errors.push(locationValid.error || "Location validation failed");
      continue;
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      transaction_ids: [],
      items_created: 0,
      items_updated: 0,
      total_qty_received: 0,
      total_cost: 0,
    };
  }

  // Process each line
  let totalQtyReceived = 0;
  let totalCost = 0;

  for (const line of lines) {
    // Get current inventory
    const existingItem = await getInventoryItem(
      orgId,
      line.product_id,
      line.location_id
    );

    // Calculate new weighted average cost
    const existingQty = existingItem?.on_hand_qty || 0;
    const existingCost = existingItem?.avg_cost || 0;

    const waCalc = calculateWeightedAverageCost(
      existingQty,
      existingCost,
      line.qty,
      line.unit_cost
    );

    // Update inventory item
    const updatedItem = await upsertInventoryItem(
      orgId,
      line.product_id,
      line.location_id,
      {
        on_hand_qty: waCalc.resultingQty,
        avg_cost: waCalc.resultingCost,
        last_receipt_at: new Date().toISOString(),
        base_uom: existingItem?.base_uom || "EA",
      }
    );

    if (updatedItem) {
      itemsUpdated.push({
        item: updatedItem,
        oldCost: existingCost,
      });
    }

    // Log transaction
    const transactionCost = line.qty * line.unit_cost;
    const transaction = await logTransaction({
      org_id: orgId,
      type: "RECEIPT" as TransactionType,
      product_id: line.product_id,
      from_location_id: null,
      to_location_id: null,
      location_id: line.location_id,
      qty: line.qty,
      unit_cost: line.unit_cost,
      total_cost: transactionCost,
      occurred_at: new Date().toISOString(),
      source_module: sourceModule,
      source_ref: sourceRef || line.source_ref,
      created_by_user_id: userId || null,
    });

    if (transaction) {
      transactionIds.push(transaction.id);
      totalQtyReceived += line.qty;
      totalCost += transactionCost;
    }
  }

  const result = {
    success: true,
    transaction_ids: transactionIds,
    items_created: lines.length - itemsUpdated.length,
    items_updated: itemsUpdated.length,
    total_qty_received: totalQtyReceived,
    total_cost: Math.round(totalCost * 100) / 100,
  };

  // Emit trace for inventory receipt
  emitTrace(
    orgId,
    "inventory-receipt",
    `receipt-${transactionIds[0] || Date.now()}`,
    "inventory-service",
    "inventory",
    {
      action: "process_receipt",
      lineCount: lines.length,
      sourceModule,
      sourceRef: sourceRef || null,
    },
    {
      transactionIds,
      itemsCreated: result.items_created,
      itemsUpdated: result.items_updated,
      totalQtyReceived,
      totalCost: result.total_cost,
    },
    {
      userId,
      userRole: undefined, // Could be passed as parameter if needed
      downstreamImplications: [
        {
          type: "gl_impact",
          entityType: "gl-entry",
          entityId: `gl-receipt-${transactionIds[0] || Date.now()}`,
          impact: "Inventory receipt affects GL inventory asset account",
        },
        {
          type: "pnl_impact",
          entityType: "pnl",
          entityId: `pnl-${orgId}`,
          impact: "Inventory receipt may affect cost of goods sold calculations",
        },
      ],
      sourceRef,
    }
  ).catch(() => {
    // Ignore trace errors - graceful degradation
  });

  return result;
}

// ============================================================================
// TRANSFER PROCESSING
// ============================================================================

/**
 * Process inventory transfer between locations
 * Creates exactly 2 transactions (OUT and IN) per line
 * Cost is carried forward intelligently
 */
export async function processInventoryTransfer(
  orgId: string,
  lines: TransferLine[],
  userId?: string
): Promise<InventoryTransferResponse> {
  const errors: string[] = [];
  const transferIds: string[] = [];

  // Validate all lines first
  for (const line of lines) {
    if (!line.product_id || !line.from_location_id || !line.to_location_id) {
      errors.push(
        `Invalid transfer line: missing required fields (product_id, from_location_id, to_location_id)`
      );
      continue;
    }

    if (line.qty <= 0) {
      errors.push(
        `Transfer quantity must be positive: product ${line.product_id}`
      );
      continue;
    }

    const productValid = await validateProduct(line.product_id);
    if (!productValid.valid) {
      errors.push(productValid.error || "Product validation failed");
      continue;
    }

    const fromValid = await validateLocation(line.from_location_id);
    if (!fromValid.valid) {
      errors.push(fromValid.error || "Source location validation failed");
      continue;
    }

    const toValid = await validateLocation(line.to_location_id);
    if (!toValid.valid) {
      errors.push(toValid.error || "Destination location validation failed");
      continue;
    }

    const moveValid = await validateInventoryMove(
      orgId,
      line.product_id,
      line.from_location_id,
      line.qty
    );
    if (!moveValid.valid) {
      errors.push(moveValid.error || "Inventory move validation failed");
      continue;
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      transfer_ids: [],
      lines_processed: 0,
      total_qty_transferred: 0,
    };
  }

  // Process each transfer line
  let totalQtyTransferred = 0;

  for (const line of lines) {
    // Get source inventory (to get current cost)
    const sourceItem = await getInventoryItem(
      orgId,
      line.product_id,
      line.from_location_id
    );

    if (!sourceItem) {
      continue;
    }

    const transferCost = line.qty * sourceItem.avg_cost;

    // Transaction 1: TRANSFER_OUT from source location
    const outTransaction = await logTransaction({
      org_id: orgId,
      type: "TRANSFER_OUT" as TransactionType,
      product_id: line.product_id,
      from_location_id: line.from_location_id,
      to_location_id: line.to_location_id,
      location_id: line.from_location_id,
      qty: -line.qty, // Negative for outbound
      unit_cost: sourceItem.avg_cost,
      total_cost: -transferCost,
      occurred_at: new Date().toISOString(),
      source_module: "TRANSFER",
      created_by_user_id: userId || null,
    });

    if (outTransaction) {
      transferIds.push(outTransaction.id);
    }

    // Update source inventory
    await upsertInventoryItem(
      orgId,
      line.product_id,
      line.from_location_id,
      {
        on_hand_qty: sourceItem.on_hand_qty - line.qty,
      }
    );

    // Transaction 2: TRANSFER_IN to destination location
    const destItem = await getInventoryItem(
      orgId,
      line.product_id,
      line.to_location_id
    );

    const inTransaction = await logTransaction({
      org_id: orgId,
      type: "TRANSFER_IN" as TransactionType,
      product_id: line.product_id,
      from_location_id: line.from_location_id,
      to_location_id: line.to_location_id,
      location_id: line.to_location_id,
      qty: line.qty, // Positive for inbound
      unit_cost: sourceItem.avg_cost,
      total_cost: transferCost,
      occurred_at: new Date().toISOString(),
      source_module: "TRANSFER",
      created_by_user_id: userId || null,
    });

    if (inTransaction) {
      transferIds.push(inTransaction.id);
    }

    // Update destination inventory
    const destQty = destItem?.on_hand_qty || 0;
    const destCost = destItem?.avg_cost || 0;

    const waCalc = calculateWeightedAverageCost(
      destQty,
      destCost,
      line.qty,
      sourceItem.avg_cost
    );

    await upsertInventoryItem(
      orgId,
      line.product_id,
      line.to_location_id,
      {
        on_hand_qty: waCalc.resultingQty,
        avg_cost: waCalc.resultingCost,
        last_receipt_at: new Date().toISOString(),
        base_uom: destItem?.base_uom || sourceItem.base_uom,
      }
    );

    totalQtyTransferred += line.qty;
  }

  const result = {
    success: true,
    transfer_ids: transferIds,
    lines_processed: lines.length,
    total_qty_transferred: totalQtyTransferred,
  };

  // Emit trace for inventory transfer
  emitTrace(
    orgId,
    "inventory-transfer",
    `transfer-${transferIds[0] || Date.now()}`,
    "inventory-service",
    "inventory",
    {
      action: "process_transfer",
      lineCount: lines.length,
    },
    {
      transferIds,
      linesProcessed: result.lines_processed,
      totalQtyTransferred,
    },
    {
      userId,
      downstreamImplications: [
        {
          type: "inventory_location_change",
          entityType: "inventory-item",
          entityId: `item-transfer-${transferIds[0] || Date.now()}`,
          impact: "Transfer affects inventory quantities at multiple locations",
        },
      ],
    }
  ).catch(() => {
    // Ignore trace errors - graceful degradation
  });

  return result;
}

// ============================================================================
// WASTE PROCESSING
// ============================================================================

/**
 * Log inventory waste/disposal
 */
export async function processInventoryWaste(
  orgId: string,
  lines: WasteLine[],
  userId?: string,
  batchReason?: string,
  sourceModule: string = "WASTE_SHEET"
): Promise<InventoryWasteResponse> {
  const errors: string[] = [];
  const transactionIds: string[] = [];

  // Validate all lines first
  for (const line of lines) {
    if (!line.product_id || !line.location_id || !line.qty) {
      errors.push(
        `Invalid waste line: missing required fields (product_id, location_id, qty)`
      );
      continue;
    }

    if (line.qty <= 0) {
      errors.push(`Waste quantity must be positive: product ${line.product_id}`);
      continue;
    }

    const productValid = await validateProduct(line.product_id);
    if (!productValid.valid) {
      errors.push(productValid.error || "Product validation failed");
      continue;
    }

    const locationValid = await validateLocation(line.location_id);
    if (!locationValid.valid) {
      errors.push(locationValid.error || "Location validation failed");
      continue;
    }

    const moveValid = await validateInventoryMove(
      orgId,
      line.product_id,
      line.location_id,
      line.qty
    );
    if (!moveValid.valid) {
      errors.push(moveValid.error || "Inventory waste validation failed");
      continue;
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      transaction_ids: [],
      lines_processed: 0,
      total_qty_wasted: 0,
      total_cost_impact: 0,
    };
  }

  // Process each waste line
  let totalQtyWasted = 0;
  let totalCostImpact = 0;

  for (const line of lines) {
    // Get current inventory
    const item = await getInventoryItem(
      orgId,
      line.product_id,
      line.location_id
    );

    if (!item) {
      continue;
    }

    const wasteCost = line.qty * item.avg_cost;

    // Log waste transaction
    const transaction = await logTransaction({
      org_id: orgId,
      type: "WASTE" as TransactionType,
      product_id: line.product_id,
      from_location_id: null,
      to_location_id: null,
      location_id: line.location_id,
      qty: -line.qty, // Negative for disposal
      unit_cost: item.avg_cost,
      total_cost: -wasteCost,
      waste_category: line.category as WasteCategory,
      waste_reason: line.reason || batchReason,
      occurred_at: new Date().toISOString(),
      source_module: sourceModule,
      created_by_user_id: userId || null,
    });

    if (transaction) {
      transactionIds.push(transaction.id);
    }

    // Update inventory
    await upsertInventoryItem(
      orgId,
      line.product_id,
      line.location_id,
      {
        on_hand_qty: item.on_hand_qty - line.qty,
      }
    );

    totalQtyWasted += line.qty;
    totalCostImpact -= wasteCost; // Negative because we lost inventory
  }

  const result = {
    success: true,
    transaction_ids: transactionIds,
    lines_processed: lines.length,
    total_qty_wasted: totalQtyWasted,
    total_cost_impact: Math.round(totalCostImpact * 100) / 100,
  };

  // Emit trace for inventory waste
  emitTrace(
    orgId,
    "inventory-waste",
    `waste-${transactionIds[0] || Date.now()}`,
    "inventory-service",
    "inventory",
    {
      action: "process_waste",
      lineCount: lines.length,
      batchReason: batchReason || null,
      sourceModule,
    },
    {
      transactionIds,
      linesProcessed: result.lines_processed,
      totalQtyWasted,
      totalCostImpact: result.total_cost_impact,
    },
    {
      userId,
      downstreamImplications: [
        {
          type: "gl_impact",
          entityType: "gl-entry",
          entityId: `gl-waste-${transactionIds[0] || Date.now()}`,
          impact: "Waste affects GL expense account (cost of goods sold or waste expense)",
        },
        {
          type: "pnl_impact",
          entityType: "pnl",
          entityId: `pnl-${orgId}`,
          impact: "Waste reduces inventory value and increases expenses",
        },
      ],
    }
  ).catch(() => {
    // Ignore trace errors - graceful degradation
  });

  return result;
}

// ============================================================================
// REPORTING
// ============================================================================

/**
 * Get current inventory snapshot (all items for org or location)
 */
export async function getOrgInventorySnapshot(
  orgId: string,
  locationId?: string
) {
  return getInventorySnapshot(orgId, locationId);
}

/**
 * Get transaction audit trail
 */
export async function getTransactionAuditTrail(
  orgId: string,
  filters?: {
    productId?: string;
    locationId?: string;
    dateFrom?: string;
    dateTo?: string;
    sourceModule?: string;
    limit?: number;
    offset?: number;
  }
) {
  return getTransactionHistory(orgId, {
    productId: filters?.productId,
    locationId: filters?.locationId,
    dateFrom: filters?.dateFrom,
    dateTo: filters?.dateTo,
    sourceModule: filters?.sourceModule,
    limit: filters?.limit || 100,
    offset: filters?.offset || 0,
  });
}
