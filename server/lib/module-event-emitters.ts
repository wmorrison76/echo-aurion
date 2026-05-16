/**
 * Module Event Emitters for EchoStratus
 * 
 * Centralized event emission helpers for all LUCCCA modules.
 * Provides consistent API for emitting Stratus events from any module.
 * 
 * All text is i18n-ready
 */

import { emitStratusEvent } from './stratus-event-emitter.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// RECIPE MODULE EVENTS
// ============================================================================

export interface RecipeUpdatedPayload {
  tenant_id: string;
  org_id?: string;
  outlet_id?: string;
  recipe_id: string;
  recipe_name?: string;
  ingredients?: Array<{ id: string; name: string; quantity: number; unit: string }>;
  cost?: number;
  updated_by?: string;
  version?: string;
}

/**
 * Emit recipe updated event
 */
export async function emitRecipeUpdated(payload: RecipeUpdatedPayload): Promise<void> {
  try {
    await emitStratusEvent(
      'recipe.updated.v1',
      {
        tenant_id: payload.tenant_id,
        org_id: payload.org_id || payload.tenant_id,
        outlet_id: payload.outlet_id,
        recipe_id: payload.recipe_id,
        recipe_name: payload.recipe_name,
        ingredients: payload.ingredients,
        cost: payload.cost,
        updated_by: payload.updated_by,
        version: payload.version,
      },
      {
        priority: 'normal',
        producer: 'kitchen_library',
        aggregateType: 'recipe',
        aggregateId: payload.recipe_id,
      }
    );
    logger.debug(`[Recipe Event] Emitted recipe.updated.v1 for recipe ${payload.recipe_id}`);
  } catch (error) {
    logger.error(`[Recipe Event] Failed to emit recipe.updated.v1:`, error);
  }
}

export interface RecipeCreatedPayload {
  tenant_id: string;
  org_id?: string;
  outlet_id?: string;
  recipe_id: string;
  recipe_name: string;
  created_by?: string;
}

/**
 * Emit recipe created event
 */
export async function emitRecipeCreated(payload: RecipeCreatedPayload): Promise<void> {
  try {
    await emitStratusEvent(
      'recipe.created.v1',
      {
        tenant_id: payload.tenant_id,
        org_id: payload.org_id || payload.tenant_id,
        outlet_id: payload.outlet_id,
        recipe_id: payload.recipe_id,
        recipe_name: payload.recipe_name,
        created_by: payload.created_by,
      },
      {
        priority: 'normal',
        producer: 'kitchen_library',
        aggregateType: 'recipe',
        aggregateId: payload.recipe_id,
      }
    );
    logger.debug(`[Recipe Event] Emitted recipe.created.v1 for recipe ${payload.recipe_id}`);
  } catch (error) {
    logger.error(`[Recipe Event] Failed to emit recipe.created.v1:`, error);
  }
}

// ============================================================================
// POS MODULE EVENTS
// ============================================================================

export interface POSCheckClosedPayload {
  tenant_id: string;
  org_id?: string;
  outlet_id: string;
  check_id: string;
  check_number?: string;
  total_amount: number;
  items: Array<{ id: string; name: string; quantity: number; price: number }>;
  employee_id?: string;
  customer_id?: string;
  table_number?: string;
  payment_method?: string;
  closed_at?: string;
}

/**
 * Emit POS check closed event
 */
export async function emitPOSCheckClosed(payload: POSCheckClosedPayload): Promise<void> {
  try {
    await emitStratusEvent(
      'pos.check.closed.v1',
      {
        tenant_id: payload.tenant_id,
        org_id: payload.org_id || payload.tenant_id,
        outlet_id: payload.outlet_id,
        check_id: payload.check_id,
        check_number: payload.check_number,
        total_amount: payload.total_amount,
        totalAmount: payload.total_amount,
        items: payload.items,
        employee_id: payload.employee_id,
        employeeId: payload.employee_id,
        customer_id: payload.customer_id,
        customerId: payload.customer_id,
        table_number: payload.table_number,
        payment_method: payload.payment_method,
        closed_at: payload.closed_at || new Date().toISOString(),
      },
      {
        priority: 'high',
        producer: 'pos_system',
        aggregateType: 'check',
        aggregateId: payload.check_id,
      }
    );
    logger.debug(`[POS Event] Emitted pos.check.closed.v1 for check ${payload.check_id}`);
  } catch (error) {
    logger.error(`[POS Event] Failed to emit pos.check.closed.v1:`, error);
  }
}

export interface POSItemOrderedPayload {
  tenant_id: string;
  org_id?: string;
  outlet_id: string;
  check_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  price: number;
  ordered_at?: string;
}

/**
 * Emit POS item ordered event
 */
export async function emitPOSItemOrdered(payload: POSItemOrderedPayload): Promise<void> {
  try {
    await emitStratusEvent(
      'pos.item.ordered.v1',
      {
        tenant_id: payload.tenant_id,
        org_id: payload.org_id || payload.tenant_id,
        outlet_id: payload.outlet_id,
        check_id: payload.check_id,
        item_id: payload.item_id,
        item_name: payload.item_name,
        quantity: payload.quantity,
        price: payload.price,
        ordered_at: payload.ordered_at || new Date().toISOString(),
      },
      {
        priority: 'normal',
        producer: 'pos_system',
        aggregateType: 'check',
        aggregateId: payload.check_id,
      }
    );
    logger.debug(`[POS Event] Emitted pos.item.ordered.v1 for item ${payload.item_id}`);
  } catch (error) {
    logger.error(`[POS Event] Failed to emit pos.item.ordered.v1:`, error);
  }
}

// ============================================================================
// KDS MODULE EVENTS
// ============================================================================

export interface KDSTicketCompletedPayload {
  tenant_id: string;
  org_id?: string;
  outlet_id: string;
  ticket_id: string;
  station_id?: string;
  items: Array<{ id: string; name: string; quantity: number }>;
  started_at?: string;
  completed_at?: string;
  prep_time_ms?: number;
  status?: string;
}

/**
 * Emit KDS ticket completed event
 */
export async function emitKDSTicketCompleted(payload: KDSTicketCompletedPayload): Promise<void> {
  try {
    await emitStratusEvent(
      'kds.ticket.completed.v1',
      {
        tenant_id: payload.tenant_id,
        org_id: payload.org_id || payload.tenant_id,
        outlet_id: payload.outlet_id,
        ticket_id: payload.ticket_id,
        ticketId: payload.ticket_id,
        station_id: payload.station_id,
        stationId: payload.station_id,
        items: payload.items,
        started_at: payload.started_at,
        completed_at: payload.completed_at || new Date().toISOString(),
        prep_time_ms: payload.prep_time_ms,
        prepTimeMs: payload.prep_time_ms,
        status: payload.status || 'completed',
      },
      {
        priority: 'normal',
        producer: 'kds_system',
        aggregateType: 'ticket',
        aggregateId: payload.ticket_id,
      }
    );
    logger.debug(`[KDS Event] Emitted kds.ticket.completed.v1 for ticket ${payload.ticket_id}`);
  } catch (error) {
    logger.error(`[KDS Event] Failed to emit kds.ticket.completed.v1:`, error);
  }
}

export interface KDSTicketRemakePayload {
  tenant_id: string;
  org_id?: string;
  outlet_id: string;
  ticket_id: string;
  station_id?: string;
  reason?: string;
  original_ticket_id?: string;
  remake_at?: string;
}

/**
 * Emit KDS ticket remake event
 */
export async function emitKDSTicketRemake(payload: KDSTicketRemakePayload): Promise<void> {
  try {
    await emitStratusEvent(
      'kds.ticket.remake.v1',
      {
        tenant_id: payload.tenant_id,
        org_id: payload.org_id || payload.tenant_id,
        outlet_id: payload.outlet_id,
        ticket_id: payload.ticket_id,
        ticketId: payload.ticket_id,
        station_id: payload.station_id,
        stationId: payload.station_id,
        reason: payload.reason,
        original_ticket_id: payload.original_ticket_id,
        remake_at: payload.remake_at || new Date().toISOString(),
      },
      {
        priority: 'normal',
        producer: 'kds_system',
        aggregateType: 'ticket',
        aggregateId: payload.ticket_id,
      }
    );
    logger.debug(`[KDS Event] Emitted kds.ticket.remake.v1 for ticket ${payload.ticket_id}`);
  } catch (error) {
    logger.error(`[KDS Event] Failed to emit kds.ticket.remake.v1:`, error);
  }
}

// ============================================================================
// SCHEDULE/LABOR MODULE EVENTS
// ============================================================================

export interface LaborShiftPublishedPayload {
  tenant_id: string;
  org_id?: string;
  outlet_id: string;
  shift_id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  hourly_rate?: number;
  labor_cost?: number;
  role?: string;
  published_at?: string;
}

/**
 * Emit labor shift published event
 */
export async function emitLaborShiftPublished(payload: LaborShiftPublishedPayload): Promise<void> {
  try {
    await emitStratusEvent(
      'labor.shift.published.v1',
      {
        tenant_id: payload.tenant_id,
        org_id: payload.org_id || payload.tenant_id,
        outlet_id: payload.outlet_id,
        shift_id: payload.shift_id,
        shiftId: payload.shift_id,
        employee_id: payload.employee_id,
        employeeId: payload.employee_id,
        start_time: payload.start_time,
        startTime: payload.start_time,
        end_time: payload.end_time,
        endTime: payload.end_time,
        hourly_rate: payload.hourly_rate,
        hourlyRate: payload.hourly_rate,
        labor_cost: payload.labor_cost,
        laborCost: payload.labor_cost,
        role: payload.role,
        published_at: payload.published_at || new Date().toISOString(),
      },
      {
        priority: 'high',
        producer: 'schedule_module',
        aggregateType: 'shift',
        aggregateId: payload.shift_id,
      }
    );
    logger.debug(`[Labor Event] Emitted labor.shift.published.v1 for shift ${payload.shift_id}`);
  } catch (error) {
    logger.error(`[Labor Event] Failed to emit labor.shift.published.v1:`, error);
  }
}

export interface LaborShiftActualPayload {
  tenant_id: string;
  org_id?: string;
  outlet_id: string;
  shift_id: string;
  employee_id: string;
  actual_start_time?: string;
  actual_end_time?: string;
  actual_hours?: number;
  actual_labor_cost?: number;
  clocked_in_at?: string;
  clocked_out_at?: string;
}

/**
 * Emit labor shift actual event
 */
export async function emitLaborShiftActual(payload: LaborShiftActualPayload): Promise<void> {
  try {
    await emitStratusEvent(
      'labor.shift.actual.v1',
      {
        tenant_id: payload.tenant_id,
        org_id: payload.org_id || payload.tenant_id,
        outlet_id: payload.outlet_id,
        shift_id: payload.shift_id,
        shiftId: payload.shift_id,
        employee_id: payload.employee_id,
        employeeId: payload.employee_id,
        actual_start_time: payload.actual_start_time,
        actualStartTime: payload.actual_start_time,
        actual_end_time: payload.actual_end_time,
        actualEndTime: payload.actual_end_time,
        actual_hours: payload.actual_hours,
        actualHours: payload.actual_hours,
        actual_labor_cost: payload.actual_labor_cost,
        actualLaborCost: payload.actual_labor_cost,
        clocked_in_at: payload.clocked_in_at,
        clocked_out_at: payload.clocked_out_at,
      },
      {
        priority: 'high',
        producer: 'schedule_module',
        aggregateType: 'shift',
        aggregateId: payload.shift_id,
      }
    );
    logger.debug(`[Labor Event] Emitted labor.shift.actual.v1 for shift ${payload.shift_id}`);
  } catch (error) {
    logger.error(`[Labor Event] Failed to emit labor.shift.actual.v1:`, error);
  }
}

// ============================================================================
// INVENTORY MODULE EVENTS
// ============================================================================

export interface InventoryReceivedPayload {
  tenant_id: string;
  org_id?: string;
  outlet_id: string;
  receipt_id?: string;
  items: Array<{ id: string; name: string; quantity: number; unit_cost: number; total_cost: number }>;
  total_cost: number;
  received_at?: string;
  received_by?: string;
}

/**
 * Emit inventory received event
 */
export async function emitInventoryReceived(payload: InventoryReceivedPayload): Promise<void> {
  try {
    await emitStratusEvent(
      'inventory.received.v1',
      {
        tenant_id: payload.tenant_id,
        org_id: payload.org_id || payload.tenant_id,
        outlet_id: payload.outlet_id,
        receipt_id: payload.receipt_id,
        items: payload.items,
        total_cost: payload.total_cost,
        totalCost: payload.total_cost,
        received_at: payload.received_at || new Date().toISOString(),
        received_by: payload.received_by,
      },
      {
        priority: 'high',
        producer: 'inventory_engine',
        aggregateType: 'inventory',
        aggregateId: payload.receipt_id || `receipt_${Date.now()}`,
      }
    );
    logger.debug(`[Inventory Event] Emitted inventory.received.v1`);
  } catch (error) {
    logger.error(`[Inventory Event] Failed to emit inventory.received.v1:`, error);
  }
}

export interface InventoryConsumedPayload {
  tenant_id: string;
  org_id?: string;
  outlet_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  cost: number;
  consumed_at?: string;
  consumed_by?: string;
  reason?: string;
}

/**
 * Emit inventory consumed event
 */
export async function emitInventoryConsumed(payload: InventoryConsumedPayload): Promise<void> {
  try {
    await emitStratusEvent(
      'inventory.consumed.v1',
      {
        tenant_id: payload.tenant_id,
        org_id: payload.org_id || payload.tenant_id,
        outlet_id: payload.outlet_id,
        item_id: payload.item_id,
        item_name: payload.item_name,
        quantity: payload.quantity,
        cost: payload.cost,
        consumed_at: payload.consumed_at || new Date().toISOString(),
        consumed_by: payload.consumed_by,
        reason: payload.reason,
      },
      {
        priority: 'normal',
        producer: 'inventory_engine',
        aggregateType: 'inventory',
        aggregateId: payload.item_id,
      }
    );
    logger.debug(`[Inventory Event] Emitted inventory.consumed.v1 for item ${payload.item_id}`);
  } catch (error) {
    logger.error(`[Inventory Event] Failed to emit inventory.consumed.v1:`, error);
  }
}

// ============================================================================
// PURCHASING MODULE EVENTS
// ============================================================================

export interface InvoiceIngestedPayload {
  tenant_id: string;
  org_id?: string;
  outlet_id: string;
  invoice_id: string;
  vendor_id?: string;
  vendor_name?: string;
  total_amount: number;
  line_items?: Array<{ id: string; description: string; quantity: number; unit_price: number; total: number }>;
  invoice_date?: string;
  ingested_at?: string;
}

/**
 * Emit invoice ingested event
 */
export async function emitInvoiceIngested(payload: InvoiceIngestedPayload): Promise<void> {
  try {
    await emitStratusEvent(
      'invoice.ingested.v1',
      {
        tenant_id: payload.tenant_id,
        org_id: payload.org_id || payload.tenant_id,
        outlet_id: payload.outlet_id,
        invoice_id: payload.invoice_id,
        invoiceId: payload.invoice_id,
        vendor_id: payload.vendor_id,
        vendorId: payload.vendor_id,
        vendor_name: payload.vendor_name,
        vendorName: payload.vendor_name,
        total_amount: payload.total_amount,
        totalAmount: payload.total_amount,
        line_items: payload.line_items,
        lineItems: payload.line_items,
        invoice_date: payload.invoice_date,
        invoiceDate: payload.invoice_date,
        ingested_at: payload.ingested_at || new Date().toISOString(),
      },
      {
        priority: 'high',
        producer: 'purchasing_receiving',
        aggregateType: 'invoice',
        aggregateId: payload.invoice_id,
      }
    );
    logger.debug(`[Purchasing Event] Emitted invoice.ingested.v1 for invoice ${payload.invoice_id}`);
  } catch (error) {
    logger.error(`[Purchasing Event] Failed to emit invoice.ingested.v1:`, error);
  }
}

export interface PurchaseOrderCreatedPayload {
  tenant_id: string;
  org_id?: string;
  outlet_id: string;
  po_id: string;
  po_number?: string;
  vendor_id?: string;
  vendor_name?: string;
  total_amount: number;
  items?: Array<{ id: string; name: string; quantity: number; unit_price: number; total: number }>;
  created_at?: string;
  created_by?: string;
}

/**
 * Emit purchase order created event
 */
export async function emitPurchaseOrderCreated(payload: PurchaseOrderCreatedPayload): Promise<void> {
  try {
    await emitStratusEvent(
      'purchase.order.created.v1',
      {
        tenant_id: payload.tenant_id,
        org_id: payload.org_id || payload.tenant_id,
        outlet_id: payload.outlet_id,
        po_id: payload.po_id,
        poId: payload.po_id,
        po_number: payload.po_number,
        poNumber: payload.po_number,
        vendor_id: payload.vendor_id,
        vendorId: payload.vendor_id,
        vendor_name: payload.vendor_name,
        vendorName: payload.vendor_name,
        total_amount: payload.total_amount,
        totalAmount: payload.total_amount,
        items: payload.items,
        created_at: payload.created_at || new Date().toISOString(),
        created_by: payload.created_by,
      },
      {
        priority: 'high',
        producer: 'purchasing_receiving',
        aggregateType: 'invoice',
        aggregateId: payload.po_id,
      }
    );
    logger.debug(`[Purchasing Event] Emitted purchase.order.created.v1 for PO ${payload.po_id}`);
  } catch (error) {
    logger.error(`[Purchasing Event] Failed to emit purchase.order.created.v1:`, error);
  }
}

// ============================================================================
// GUEST FEEDBACK MODULE EVENTS
// ============================================================================

export interface GuestFeedbackLoggedPayload {
  tenant_id: string;
  org_id?: string;
  outlet_id: string;
  feedback_id: string;
  customer_id?: string;
  rating?: number;
  comment?: string;
  category?: string;
  logged_at?: string;
}

/**
 * Emit guest feedback logged event
 */
export async function emitGuestFeedbackLogged(payload: GuestFeedbackLoggedPayload): Promise<void> {
  try {
    await emitStratusEvent(
      'guest.feedback.logged.v1',
      {
        tenant_id: payload.tenant_id,
        org_id: payload.org_id || payload.tenant_id,
        outlet_id: payload.outlet_id,
        feedback_id: payload.feedback_id,
        feedbackId: payload.feedback_id,
        customer_id: payload.customer_id,
        customerId: payload.customer_id,
        rating: payload.rating,
        comment: payload.comment,
        category: payload.category,
        logged_at: payload.logged_at || new Date().toISOString(),
      },
      {
        priority: 'normal',
        producer: 'guest_feedback_system',
        aggregateType: 'guest',
        aggregateId: payload.feedback_id,
      }
    );
    logger.debug(`[Guest Event] Emitted guest.feedback.logged.v1 for feedback ${payload.feedback_id}`);
  } catch (error) {
    logger.error(`[Guest Event] Failed to emit guest.feedback.logged.v1:`, error);
  }
}
