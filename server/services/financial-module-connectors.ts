/**
 * Financial Module Connectors
 * Bridges between Culinary, Inventory, and Purchasing modules
 * Emits financial events when costs change in these modules
 *
 * Phase 5: Module Integration
 * Ensures all operational costs flow into the centralized P&L engine
 */

import { financialEventEmitter } from '../lib/financial-event-emitter';
import { logger } from '../lib/logger';

/**
 * Typed financial event for module connectors
 * Extended from base FinancialEventPayload with new event types
 */
export interface TypedFinancialEvent {
  type: 'INVENTORY_RECEIPT' | 'INVENTORY_WASTE' | 'PURCHASE_ORDER_CREATED' |
        'INVOICE_RECEIVED' | 'RECIPE_COST_UPDATED' | 'MENU_ENGINEERING_UPDATED' |
        'SHIFT_COST_UPDATED';
  org_id: string;
  outlet_id: string;
  period: string;
  timestamp: number;
  data: Record<string, any>;
}

// ============================================================================
// INVENTORY CONNECTOR
// ============================================================================

export interface InventoryEventData {
  product_id: string;
  product_name?: string;
  location_id: string;
  qty: number;
  unit_cost: number;
  total_cost: number;
  transaction_type: 'RECEIPT' | 'WASTE' | 'TRANSFER_OUT' | 'TRANSFER_IN';
  waste_category?: string;
  source_ref?: string;
}

/**
 * Emit inventory receipt event (COGS impact)
 * Called when inventory is received from suppliers
 */
export async function emitInventoryReceipt(
  orgId: string,
  outletId: string,
  data: InventoryEventData,
  period?: string
): Promise<void> {
  try {
    const currentPeriod = period || getCurrentPeriod();

    financialEventEmitter.emit('inventory:receipt', {
      type: 'INVENTORY_RECEIPT',
      org_id: orgId,
      outlet_id: outletId,
      period: currentPeriod,
      timestamp: Date.now(),
      data: {
        product_id: data.product_id,
        product_name: data.product_name,
        location_id: data.location_id,
        qty: data.qty,
        unit_cost: data.unit_cost,
        total_cost: data.total_cost,
        source_ref: data.source_ref,
      },
    } as TypedFinancialEvent);

    // Emit to Stratus
    try {
      const { stratusEventEmitter } = await import('../lib/stratus-event-emitter.js');
      await stratusEventEmitter.emit(
        'inventory.received.v1',
        data.product_id,
        {
          itemId: data.product_id,
          itemName: data.product_name,
          quantity: data.qty,
          unitCost: data.unit_cost,
          totalCost: data.total_cost,
          locationId: data.location_id,
          avgCost: data.unit_cost, // Will be calculated from weighted average
        },
        {
          tenantId: orgId,
          producer: 'inventory_connector',
        }
      );
    } catch (error) {
      logger.error('[InventoryConnector] Failed to emit Stratus event:', error);
    }

    logger.debug('[InventoryConnector] Receipt emitted', {
      orgId,
      outletId,
      productId: data.product_id,
      totalCost: data.total_cost,
    });
  } catch (error) {
    logger.error('[InventoryConnector] Failed to emit receipt event', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Emit inventory waste event (COGS impact)
 * Called when inventory is wasted/spoiled
 */
export function emitInventoryWaste(
  orgId: string,
  outletId: string,
  data: InventoryEventData & { waste_category: string },
  period?: string
): void {
  try {
    const currentPeriod = period || getCurrentPeriod();

    financialEventEmitter.emit('inventory:waste', {
      type: 'INVENTORY_WASTE',
      org_id: orgId,
      outlet_id: outletId,
      period: currentPeriod,
      timestamp: Date.now(),
      data: {
        product_id: data.product_id,
        product_name: data.product_name,
        location_id: data.location_id,
        qty: data.qty,
        unit_cost: data.unit_cost,
        total_cost: data.total_cost,
        waste_category: data.waste_category,
      },
    } as TypedFinancialEvent);

    logger.debug('[InventoryConnector] Waste emitted', {
      orgId,
      outletId,
      productId: data.product_id,
      category: data.waste_category,
      totalCost: data.total_cost,
    });
  } catch (error) {
    logger.error('[InventoryConnector] Failed to emit waste event', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Batch emit multiple inventory events
 * Useful for consolidating multiple receipts/waste events in a single transaction
 */
export function emitInventoryBatchEvents(
  orgId: string,
  outletId: string,
  events: Array<{
    data: InventoryEventData;
    type: 'RECEIPT' | 'WASTE';
  }>,
  period?: string
): void {
  try {
    for (const event of events) {
      if (event.type === 'RECEIPT') {
        emitInventoryReceipt(orgId, outletId, event.data, period);
      } else if (event.type === 'WASTE') {
        emitInventoryWaste(orgId, outletId, event.data as InventoryEventData & { waste_category: string }, period);
      }
    }
  } catch (error) {
    logger.error('[InventoryConnector] Failed to emit batch events', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// PURCHASING CONNECTOR
// ============================================================================

export interface PurchasingEventData {
  po_id: string;
  po_number: string;
  vendor_id: string;
  vendor_name?: string;
  line_items: Array<{
    item_id: string;
    description: string;
    qty: number;
    unit_price: number;
    line_total: number;
  }>;
  total_amount: number;
  order_date: string;
  expected_delivery_date?: string;
}

/**
 * Emit purchase order creation event
 * Called when a PO is created (provisional cost)
 */
export function emitPurchaseOrderCreated(
  orgId: string,
  outletId: string,
  data: PurchasingEventData,
  period?: string
): void {
  try {
    const currentPeriod = period || getCurrentPeriod();

    financialEventEmitter.emit('purchasing:po-created', {
      type: 'PURCHASE_ORDER_CREATED',
      org_id: orgId,
      outlet_id: outletId,
      period: currentPeriod,
      timestamp: Date.now(),
      data: {
        po_id: data.po_id,
        po_number: data.po_number,
        vendor_id: data.vendor_id,
        vendor_name: data.vendor_name,
        line_items: data.line_items,
        total_amount: data.total_amount,
        order_date: data.order_date,
        expected_delivery_date: data.expected_delivery_date,
      },
    } as TypedFinancialEvent);

    logger.debug('[PurchasingConnector] PO created', {
      orgId,
      outletId,
      poNumber: data.po_number,
      totalAmount: data.total_amount,
    });
  } catch (error) {
    logger.error('[PurchasingConnector] Failed to emit PO created event', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Emit invoice received event
 * Called when an invoice is received and matched to a PO
 */
export interface InvoiceEventData {
  invoice_id: string;
  invoice_number: string;
  po_id?: string;
  vendor_id: string;
  vendor_name?: string;
  total_amount: number;
  line_items: Array<{
    item_id: string;
    description: string;
    qty: number;
    unit_price: number;
    line_total: number;
  }>;
  invoice_date: string;
}

export function emitInvoiceReceived(
  orgId: string,
  outletId: string,
  data: InvoiceEventData,
  period?: string
): void {
  try {
    const currentPeriod = period || getCurrentPeriod();

    financialEventEmitter.emit('purchasing:invoice-received', {
      type: 'INVOICE_RECEIVED',
      org_id: orgId,
      outlet_id: outletId,
      period: currentPeriod,
      timestamp: Date.now(),
      data: {
        invoice_id: data.invoice_id,
        invoice_number: data.invoice_number,
        po_id: data.po_id,
        vendor_id: data.vendor_id,
        vendor_name: data.vendor_name,
        total_amount: data.total_amount,
        line_items: data.line_items,
        invoice_date: data.invoice_date,
      },
    } as TypedFinancialEvent);

    logger.debug('[PurchasingConnector] Invoice received', {
      orgId,
      outletId,
      invoiceNumber: data.invoice_number,
      totalAmount: data.total_amount,
    });
  } catch (error) {
    logger.error('[PurchasingConnector] Failed to emit invoice event', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// CULINARY CONNECTOR
// ============================================================================

export interface RecipeCostEventData {
  recipe_id: string;
  recipe_name: string;
  method_type: 'PLATING' | 'MISE_EN_PLACE' | 'FABRICATION' | 'ASSEMBLY';
  ingredient_costs: number;
  labor_cost: number;
  overhead_cost: number;
  total_cost: number;
  cost_per_portion: number;
  portion_size: number;
  yield_percent: number;
  waste_value: number;
}

/**
 * Emit recipe cost updated event
 * Called when a recipe's cost is calculated or updated (ingredient prices change)
 * This impacts the theoretical COGS when the recipe is used in a dish
 */
export function emitRecipeCostUpdated(
  orgId: string,
  outletId: string,
  data: RecipeCostEventData,
  period?: string
): void {
  try {
    const currentPeriod = period || getCurrentPeriod();

    financialEventEmitter.emit('culinary:recipe-cost-updated', {
      type: 'RECIPE_COST_UPDATED',
      org_id: orgId,
      outlet_id: outletId,
      period: currentPeriod,
      timestamp: Date.now(),
      data: {
        recipe_id: data.recipe_id,
        recipe_name: data.recipe_name,
        method_type: data.method_type,
        ingredient_costs: data.ingredient_costs,
        labor_cost: data.labor_cost,
        overhead_cost: data.overhead_cost,
        total_cost: data.total_cost,
        cost_per_portion: data.cost_per_portion,
        portion_size: data.portion_size,
        yield_percent: data.yield_percent,
        waste_value: data.waste_value,
      },
    } as TypedFinancialEvent);

    // Emit to Stratus
    void import('../lib/stratus-event-emitter.js')
      .then(async (m: any) => {
        const emitStratusEvent = m?.emitStratusEvent;
        if (typeof emitStratusEvent !== 'function') return;

        await emitStratusEvent(
          'recipe.cost.updated.v1',
          {
            tenant_id: orgId,
            org_id: orgId,
            outlet_id: outletId,
            recipe_id: data.recipe_id,
            recipeId: data.recipe_id,
            recipe_name: data.recipe_name,
            recipeName: data.recipe_name,
            totalCost: data.total_cost,
            costPerServing: data.cost_per_portion,
            ingredientCosts: data.ingredient_costs,
            laborCost: data.labor_cost,
            overheadCost: data.overhead_cost,
            method_type: data.method_type,
            portion_size: data.portion_size,
            yield_percent: data.yield_percent,
            waste_value: data.waste_value,
          },
          {
            priority: 'high',
            producer: 'culinary_connector',
            aggregateType: 'recipe',
            aggregateId: data.recipe_id,
          }
        );
      })
      .catch((error) => {
        logger.error('[CulinaryConnector] Failed to emit Stratus event:', error);
      });

    logger.debug('[CulinaryConnector] Recipe cost updated', {
      orgId,
      outletId,
      recipeId: data.recipe_id,
      totalCost: data.total_cost,
    });
  } catch (error) {
    logger.error('[CulinaryConnector] Failed to emit recipe cost event', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Emit menu engineering event
 * Called when menu pricing or target margins are updated
 */
export interface MenuEngineringEventData {
  menu_item_id: string;
  menu_item_name: string;
  recipe_id: string;
  plate_cost: number;
  selling_price: number;
  target_margin_percent: number;
  actual_margin_percent: number;
  portion_count?: number;
}

export function emitMenuEngineeringUpdated(
  orgId: string,
  outletId: string,
  data: MenuEngineringEventData,
  period?: string
): void {
  try {
    const currentPeriod = period || getCurrentPeriod();

    financialEventEmitter.emit('culinary:menu-engineering-updated', {
      type: 'MENU_ENGINEERING_UPDATED',
      org_id: orgId,
      outlet_id: outletId,
      period: currentPeriod,
      timestamp: Date.now(),
      data: {
        menu_item_id: data.menu_item_id,
        menu_item_name: data.menu_item_name,
        recipe_id: data.recipe_id,
        plate_cost: data.plate_cost,
        selling_price: data.selling_price,
        target_margin_percent: data.target_margin_percent,
        actual_margin_percent: data.actual_margin_percent,
        portion_count: data.portion_count,
      },
    } as TypedFinancialEvent);

    logger.debug('[CulinaryConnector] Menu engineering updated', {
      orgId,
      outletId,
      menuItemId: data.menu_item_id,
      actualMargin: data.actual_margin_percent,
    });
  } catch (error) {
    logger.error('[CulinaryConnector] Failed to emit menu engineering event', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// LABOR/SCHEDULE CONNECTOR (already integrated via schedule.ts)
// ============================================================================

/**
 * Emit shift cost event
 * Called when shifts are created/updated
 * Note: This is already integrated in server/routes/schedule.ts
 */
export interface ShiftCostEventData {
  shift_id: string;
  employee_id: string;
  employee_name?: string;
  start_time: string;
  end_time: string;
  hours: number;
  hourly_rate: number;
  total_cost: number;
  position?: string;
  outlet_id?: string;
}

export function emitShiftCostUpdated(
  orgId: string,
  outletId: string,
  data: ShiftCostEventData,
  period?: string
): void {
  try {
    const currentPeriod = period || getCurrentPeriod();

    financialEventEmitter.emit('schedule:shift-cost-updated', {
      type: 'SHIFT_COST_UPDATED',
      org_id: orgId,
      outlet_id: outletId,
      period: currentPeriod,
      timestamp: Date.now(),
      data: {
        shift_id: data.shift_id,
        employee_id: data.employee_id,
        employee_name: data.employee_name,
        start_time: data.start_time,
        end_time: data.end_time,
        hours: data.hours,
        hourly_rate: data.hourly_rate,
        total_cost: data.total_cost,
        position: data.position,
      },
    } as TypedFinancialEvent);

    logger.debug('[ScheduleConnector] Shift cost updated', {
      orgId,
      outletId,
      employeeId: data.employee_id,
      totalCost: data.total_cost,
    });
  } catch (error) {
    logger.error('[ScheduleConnector] Failed to emit shift cost event', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current period in YYYY-MM format
 */
function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Validate that org_id and outlet_id are provided before emitting
 */
function validateEventPrerequisites(orgId: string, outletId: string): boolean {
  if (!orgId || !outletId) {
    logger.warn('[ModuleConnector] Event prerequisites not met', { orgId, outletId });
    return false;
  }
  return true;
}

export default {
  // Inventory
  emitInventoryReceipt,
  emitInventoryWaste,
  emitInventoryBatchEvents,

  // Purchasing
  emitPurchaseOrderCreated,
  emitInvoiceReceived,

  // Culinary
  emitRecipeCostUpdated,
  emitMenuEngineeringUpdated,

  // Schedule
  emitShiftCostUpdated,

  // Utils
  validateEventPrerequisites,
};
