import { logger } from "../lib/logger";
import { safeRequire } from "../utils/safe-require";

type VercelPostgresModule = { sql: any };
const vercelPg = safeRequire<VercelPostgresModule>("@vercel/postgres");

export const sql =
  vercelPg?.sql ??
  ((..._args: any[]) => {
    throw new Error(
      "Event purchasing bridge requires @vercel/postgres, which is not installed in this environment.",
    );
  });

export interface PurchaseOrder {
  id: string;
  productionTaskId: string;
  eventId: string;
  outletId: string;
  poStatus: string;
  neededByDate: Date;
  totalCost: number;
  supplierName?: string;
  specialInstructions?: string;
}

export interface POLineItem {
  ingredientName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  supplierName?: string;
}

class EventPurchasingBridge {
  /**
   * Generate purchase order from ingredient list
   */
  async generatePurchaseOrder(
    productionTaskId: string,
    eventId: string,
    outletId: string,
    orgId: string,
    userId: string,
  ): Promise<string> {
    try {
      // Get event date
      const eventResult = await sql`
        SELECT start_time FROM calendar_events WHERE id = ${eventId};
      `;

      if (eventResult.rows.length === 0) {
        throw new Error("Event not found");
      }

      const eventDate = new Date(eventResult.rows[0].start_time);

      // Calculate needed_by_date (2 days before event to allow delivery/prep)
      const neededByDate = new Date(eventDate);
      neededByDate.setDate(neededByDate.getDate() - 2);

      // Calculate total cost from ingredients
      const costResult = await sql`
        SELECT COALESCE(SUM(total_cost), 0) as total_cost
        FROM scaled_ingredients
        WHERE production_task_id = ${productionTaskId};
      `;

      const totalCost = parseFloat(costResult.rows[0].total_cost || 0);

      // Create purchase order record
      const result = await sql`
        INSERT INTO event_purchase_orders (
          id,
          production_task_id,
          event_id,
          outlet_id,
          org_id,
          po_status,
          needed_by_date,
          total_cost,
          created_by,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          ${productionTaskId},
          ${eventId},
          ${outletId},
          ${orgId},
          'draft',
          ${neededByDate.toISOString().split("T")[0]}::DATE,
          ${totalCost},
          ${userId},
          NOW(),
          NOW()
        )
        RETURNING id;
      `;

      const poId = result.rows[0].id;

      logger.info("[EventPurchasingBridge] Purchase order created", {
        poId,
        productionTaskId,
        totalCost,
        neededByDate: neededByDate.toISOString().split("T")[0],
      });

      return poId;
    } catch (error) {
      logger.error(
        "[EventPurchasingBridge] Error generating purchase order:",
        error,
      );
      throw error;
    }
  }

  /**
   * Get purchase order details
   */
  async getPurchaseOrder(poId: string): Promise<PurchaseOrder | null> {
    try {
      const result = await sql`
        SELECT
          id,
          production_task_id,
          event_id,
          outlet_id,
          po_status,
          needed_by_date,
          total_cost,
          supplier_name,
          special_instructions
        FROM event_purchase_orders
        WHERE id = ${poId};
      `;

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        productionTaskId: row.production_task_id,
        eventId: row.event_id,
        outletId: row.outlet_id,
        poStatus: row.po_status,
        neededByDate: new Date(row.needed_by_date),
        totalCost: parseFloat(row.total_cost),
        supplierName: row.supplier_name,
        specialInstructions: row.special_instructions,
      };
    } catch (error) {
      logger.error(
        "[EventPurchasingBridge] Error fetching purchase order:",
        error,
      );
      throw error;
    }
  }

  /**
   * Get line items for a purchase order
   */
  async getPOLineItems(poId: string): Promise<POLineItem[]> {
    try {
      const poResult = await sql`
        SELECT production_task_id FROM event_purchase_orders WHERE id = ${poId};
      `;

      if (poResult.rows.length === 0) {
        return [];
      }

      const productionTaskId = poResult.rows[0].production_task_id;

      const result = await sql`
        SELECT
          ingredient_name,
          purchase_quantity_needed as quantity,
          purchase_unit as unit,
          unit_cost,
          total_cost,
          supplier_name
        FROM scaled_ingredients
        WHERE production_task_id = ${productionTaskId}
        ORDER BY ingredient_name ASC;
      `;

      return result.rows.map((row) => ({
        ingredientName: row.ingredient_name,
        quantity: parseFloat(row.quantity),
        unit: row.unit,
        unitCost: parseFloat(row.unit_cost || 0),
        totalCost: parseFloat(row.total_cost || 0),
        supplierName: row.supplier_name,
      }));
    } catch (error) {
      logger.error(
        "[EventPurchasingBridge] Error fetching PO line items:",
        error,
      );
      throw error;
    }
  }

  /**
   * Update purchase order status
   */
  async updatePOStatus(poId: string, newStatus: string): Promise<boolean> {
    try {
      const result = await sql`
        UPDATE event_purchase_orders
        SET po_status = ${newStatus},
            updated_at = NOW()
        WHERE id = ${poId}
        RETURNING id;
      `;

      if (result.rows.length === 0) {
        return false;
      }

      logger.info("[EventPurchasingBridge] PO status updated", {
        poId,
        newStatus,
      });

      return true;
    } catch (error) {
      logger.error("[EventPurchasingBridge] Error updating PO status:", error);
      throw error;
    }
  }

  /**
   * Link event PO to Purchasing module PO
   */
  async linkToPurchasingModule(
    eventPoId: string,
    purchasingPoId: string,
    poNumber: string,
  ): Promise<boolean> {
    try {
      const result = await sql`
        UPDATE event_purchase_orders
        SET purchase_order_id = ${purchasingPoId},
            po_number = ${poNumber},
            updated_at = NOW()
        WHERE id = ${eventPoId}
        RETURNING id;
      `;

      if (result.rows.length === 0) {
        return false;
      }

      logger.info("[EventPurchasingBridge] PO linked to Purchasing module", {
        eventPoId,
        purchasingPoId,
        poNumber,
      });

      return true;
    } catch (error) {
      logger.error(
        "[EventPurchasingBridge] Error linking to Purchasing module:",
        error,
      );
      throw error;
    }
  }

  /**
   * Get all purchase orders for an event
   */
  async getEventPurchaseOrders(eventId: string): Promise<PurchaseOrder[]> {
    try {
      const result = await sql`
        SELECT
          id,
          production_task_id,
          event_id,
          outlet_id,
          po_status,
          needed_by_date,
          total_cost,
          supplier_name,
          special_instructions
        FROM event_purchase_orders
        WHERE event_id = ${eventId}
        ORDER BY created_at DESC;
      `;

      return result.rows.map((row) => ({
        id: row.id,
        productionTaskId: row.production_task_id,
        eventId: row.event_id,
        outletId: row.outlet_id,
        poStatus: row.po_status,
        neededByDate: new Date(row.needed_by_date),
        totalCost: parseFloat(row.total_cost),
        supplierName: row.supplier_name,
        specialInstructions: row.special_instructions,
      }));
    } catch (error) {
      logger.error("[EventPurchasingBridge] Error fetching event POs:", error);
      throw error;
    }
  }

  /**
   * Calculate total procurement cost for event
   */
  async getEventTotalProcurementCost(eventId: string): Promise<number> {
    try {
      const result = await sql`
        SELECT COALESCE(SUM(total_cost), 0) as total_cost
        FROM event_purchase_orders
        WHERE event_id = ${eventId}
          AND po_status NOT IN ('cancelled', 'draft');
      `;

      return parseFloat(result.rows[0].total_cost || 0);
    } catch (error) {
      logger.error(
        "[EventPurchasingBridge] Error calculating procurement cost:",
        error,
      );
      throw error;
    }
  }

  /**
   * Get special order items (those needing advance notice)
   */
  async getSpecialOrderItems(productionTaskId: string): Promise<any[]> {
    try {
      const result = await sql`
        SELECT
          ingredient_name,
          scaled_quantity,
          scaled_unit,
          needs_special_order,
          lead_time_days,
          supplier_name
        FROM scaled_ingredients
        WHERE production_task_id = ${productionTaskId}
          AND needs_special_order = TRUE
        ORDER BY lead_time_days DESC;
      `;

      return result.rows;
    } catch (error) {
      logger.error(
        "[EventPurchasingBridge] Error getting special order items:",
        error,
      );
      throw error;
    }
  }

  /**
   * Mark PO as received
   */
  async markPOAsReceived(poId: string): Promise<boolean> {
    try {
      const result = await sql`
        UPDATE event_purchase_orders
        SET po_status = 'received',
            received_at = NOW(),
            updated_at = NOW()
        WHERE id = ${poId}
        RETURNING id;
      `;

      if (result.rows.length === 0) {
        return false;
      }

      logger.info("[EventPurchasingBridge] PO marked as received", { poId });

      return true;
    } catch (error) {
      logger.error(
        "[EventPurchasingBridge] Error marking PO as received:",
        error,
      );
      throw error;
    }
  }

  /**
   * Get procurement summary for event
   */
  async getEventProcurementSummary(eventId: string): Promise<any> {
    try {
      const result = await sql`
        SELECT
          COUNT(DISTINCT epo.id) as po_count,
          COUNT(DISTINCT si.id) as ingredient_count,
          COALESCE(SUM(epo.total_cost), 0) as total_cost,
          COUNT(CASE WHEN epo.po_status = 'received' THEN 1 END) as received_count,
          COUNT(CASE WHEN si.needs_special_order = TRUE THEN 1 END) as special_order_count
        FROM event_purchase_orders epo
        LEFT JOIN maestro_production_tasks mpt ON epo.production_task_id = mpt.id
        LEFT JOIN scaled_ingredients si ON mpt.id = si.production_task_id
        WHERE epo.event_id = ${eventId};
      `;

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        poCount: parseInt(row.po_count),
        ingredientCount: parseInt(row.ingredient_count),
        totalCost: parseFloat(row.total_cost),
        receivedCount: parseInt(row.received_count),
        specialOrderCount: parseInt(row.special_order_count),
      };
    } catch (error) {
      logger.error(
        "[EventPurchasingBridge] Error getting procurement summary:",
        error,
      );
      throw error;
    }
  }
}

export const eventPurchasingBridge = new EventPurchasingBridge();
