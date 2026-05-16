import db from "./db-client.js";
import { DateTime } from "luxon";

/**
 * Compute month-end cost summary for a venue
 * Calculates: Opening inventory + Purchases - Closing inventory = COGS
 * Then: COGS % = (COGS / Revenue) * 100
 * @param {string} venueId - UUID of the venue
 * @param {string} month - format 'YYYY-MM'
 * @returns {object} { venueId, month, opening, purchases, closing, cogs, costPct }
 */
export async function computeMonthEnd(venueId, month) {
  try {
    const monthDate = DateTime.fromFormat(month, "yyyy-MM");
    if (!monthDate.isValid) {
      throw new Error("Invalid month format. Use YYYY-MM");
    }

    const start = monthDate.startOf("month").toISODate();
    const end = monthDate.endOf("month").toISODate();

    // Opening inventory (bottles as of start of month)
    const openingResult = await db.query(
      `SELECT COALESCE(SUM(qty_bottles * cost_per_bottle), 0) AS val
       FROM inventory_lots
       WHERE venue_id = $1 AND received_date < $2`,
      [venueId, start],
    );

    // Closing inventory (as of end of month)
    const closingResult = await db.query(
      `SELECT COALESCE(SUM(qty_bottles * cost_per_bottle), 0) AS val
       FROM inventory_lots
       WHERE venue_id = $1 AND received_date <= $2`,
      [venueId, end],
    );

    // Purchases during month
    const purchasesResult = await db.query(
      `SELECT COALESCE(SUM(total_cost), 0) AS val
       FROM purchases
       WHERE created_at >= $1 AND created_at <= $2`,
      [start, end],
    );

    // Revenue (if sales table exists; otherwise return 0)
    let revenueVal = 0;
    try {
      const revenueResult = await db.query(
        `SELECT COALESCE(SUM(total), 0) AS val
         FROM sales
         WHERE venue_id = $1 AND created_at >= $2 AND created_at <= $3`,
        [venueId, start, end],
      );
      revenueVal = Number(revenueResult.rows[0].val) || 0;
    } catch (err) {
      console.warn(
        "Sales table not available or error querying; revenue defaulting to 0",
      );
    }

    const opening = Number(openingResult.rows[0].val) || 0;
    const closing = Number(closingResult.rows[0].val) || 0;
    const purchases = Number(purchasesResult.rows[0].val) || 0;

    // COGS = Opening + Purchases - Closing
    const cogs = opening + purchases - closing;

    // Beverage Cost % = (COGS / Revenue) * 100
    const costPct =
      revenueVal > 0 ? ((cogs / revenueVal) * 100).toFixed(2) : "N/A";

    return {
      venueId,
      month,
      opening: parseFloat(opening.toFixed(2)),
      purchases: parseFloat(purchases.toFixed(2)),
      closing: parseFloat(closing.toFixed(2)),
      cogs: parseFloat(cogs.toFixed(2)),
      costPct,
      revenue: parseFloat(revenueVal.toFixed(2)),
    };
  } catch (error) {
    console.error("Error in computeMonthEnd:", error);
    throw error;
  }
}

/**
 * Get variance analysis: expected vs actual inventory movement
 * @param {string} venueId
 * @param {string} month
 * @returns {object} variance metrics
 */
export async function getVarianceAnalysis(venueId, month) {
  try {
    const monthDate = DateTime.fromFormat(month, "yyyy-MM");
    const start = monthDate.startOf("month").toISODate();
    const end = monthDate.endOf("month").toISODate();

    // Par levels and current stock
    const parResult = await db.query(
      `SELECT wine_id, SUM(par_level) as expected_qty, SUM(qty_bottles) as actual_qty
       FROM inventory_lots
       WHERE venue_id = $1 AND received_date <= $2
       GROUP BY wine_id`,
      [venueId, end],
    );

    const variances = parResult.rows.map((row) => ({
      wine_id: row.wine_id,
      expected_qty: row.expected_qty,
      actual_qty: row.actual_qty,
      variance: row.actual_qty - row.expected_qty,
      variance_pct:
        row.expected_qty > 0
          ? (
              ((row.actual_qty - row.expected_qty) / row.expected_qty) *
              100
            ).toFixed(2)
          : "N/A",
    }));

    return {
      venueId,
      month,
      variances,
      totalVariance: variances.reduce((sum, v) => sum + v.variance, 0),
    };
  } catch (error) {
    console.error("Error in getVarianceAnalysis:", error);
    throw error;
  }
}

/**
 * Record a new purchase order
 * @param {object} data - { supplier_id, invoice_number, total_cost }
 * @returns {object} result
 */
export async function recordPurchase(data) {
  try {
    const { supplier_id, invoice_number, total_cost } = data;

    if (!invoice_number || !total_cost) {
      throw new Error("invoice_number and total_cost are required");
    }

    const result = await db.query(
      `INSERT INTO purchases (supplier_id, invoice_number, total_cost)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [supplier_id || null, invoice_number, total_cost],
    );

    return {
      status: "recorded",
      purchase_id: result.rows[0].id,
      created_at: result.rows[0].created_at,
    };
  } catch (error) {
    console.error("Error recording purchase:", error);
    throw error;
  }
}

/**
 * Get all purchases for a date range
 * @param {string} startDate - ISO format
 * @param {string} endDate - ISO format
 * @returns {array} purchases
 */
export async function getPurchaseHistory(startDate, endDate) {
  try {
    const result = await db.query(
      `SELECT * FROM purchases
       WHERE created_at >= $1 AND created_at <= $2
       ORDER BY created_at DESC`,
      [startDate, endDate],
    );
    return result.rows;
  } catch (error) {
    console.error("Error getting purchase history:", error);
    throw error;
  }
}

/**
 * Get FIFO cost of goods sold for inventory adjustments
 * @param {string} venueId
 * @param {string} month
 * @returns {object} fifo calculation
 */
export async function calculateFIFO(venueId, month) {
  try {
    const monthDate = DateTime.fromFormat(month, "yyyy-MM");
    const end = monthDate.endOf("month").toISODate();

    // Get all lots ordered by received_date (FIFO principle)
    const result = await db.query(
      `SELECT wine_id, lot_code, qty_bottles, cost_per_bottle, received_date
       FROM inventory_lots
       WHERE venue_id = $1 AND received_date <= $2
       ORDER BY received_date ASC`,
      [venueId, end],
    );

    const fifoValue = result.rows.reduce((total, lot) => {
      return total + lot.qty_bottles * lot.cost_per_bottle;
    }, 0);

    return {
      venueId,
      month,
      method: "FIFO",
      lots: result.rows,
      totalValue: parseFloat(fifoValue.toFixed(2)),
    };
  } catch (error) {
    console.error("Error calculating FIFO:", error);
    throw error;
  }
}
