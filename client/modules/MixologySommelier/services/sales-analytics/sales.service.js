import db from "./db-client.js";
import { DateTime } from "luxon";

/**
 * Fetch sales by venue/date range and compute wine vs food ratios
 * @param {string} venueId - UUID of venue
 * @param {string} startDate - ISO date
 * @param {string} endDate - ISO date
 * @returns {object} sales mix summary
 */
export async function getSalesMix(venueId, startDate, endDate) {
  try {
    const result = await db.query(
      `SELECT 
        menu_item, 
        menu_item_type,
        SUM(qty) AS qty, 
        SUM(total) AS total
       FROM sales
       WHERE venue_id = $1 AND created_at BETWEEN $2 AND $3
       GROUP BY menu_item, menu_item_type
       ORDER BY total DESC`,
      [venueId, startDate, endDate],
    );

    const items = result.rows || [];
    const totalRevenue = items.reduce(
      (sum, item) => sum + Number(item.total || 0),
      0,
    );
    const wineSales = items.filter((r) => r.menu_item_type === "wine");
    const foodSales = items.filter((r) => r.menu_item_type === "food");
    const wineRev = wineSales.reduce(
      (sum, item) => sum + Number(item.total || 0),
      0,
    );
    const foodRev = foodSales.reduce(
      (sum, item) => sum + Number(item.total || 0),
      0,
    );

    return {
      venueId,
      startDate,
      endDate,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      wineRevenue: parseFloat(wineRev.toFixed(2)),
      foodRevenue: parseFloat(foodRev.toFixed(2)),
      winePercent:
        totalRevenue > 0 ? ((wineRev / totalRevenue) * 100).toFixed(2) : "0.00",
      foodPercent:
        totalRevenue > 0 ? ((foodRev / totalRevenue) * 100).toFixed(2) : "0.00",
      itemCount: items.length,
      items: items.map((item) => ({
        ...item,
        total: parseFloat(item.total),
        qty: parseInt(item.qty),
      })),
    };
  } catch (error) {
    console.error("Error in getSalesMix:", error);
    throw error;
  }
}

/**
 * Pull top performing pairings (wine + dish combos)
 * @param {string} venueId - UUID of venue
 * @param {number} limit - Number of results
 * @returns {array} top pairings
 */
export async function getTopPairings(venueId, limit = 10) {
  try {
    const result = await db.query(
      `SELECT 
        r.name AS recipe, 
        w.name AS wine, 
        COUNT(*) AS sold, 
        AVG(p.pairing_score) AS avg_score,
        w.region,
        w.vintage
       FROM sales s
       JOIN pairing_evidence p ON p.recipe_id = s.recipe_id AND p.wine_id = s.wine_id
       JOIN wines w ON w.id = p.wine_id
       JOIN recipes r ON r.id = p.recipe_id
       WHERE s.venue_id = $1
       GROUP BY r.name, w.name, w.region, w.vintage
       ORDER BY sold DESC
       LIMIT $2`,
      [venueId, limit],
    );

    return (result.rows || []).map((row) => ({
      ...row,
      sold: parseInt(row.sold),
      avg_score: parseFloat(row.avg_score || 0),
    }));
  } catch (error) {
    console.error("Error in getTopPairings:", error);
    return [];
  }
}

/**
 * Find missed pairing opportunities (dishes sold without recommended wine)
 * @param {string} venueId - UUID of venue
 * @param {number} days - Look back N days
 * @returns {array} missed pairings
 */
export async function getMissedPairings(venueId, days = 30) {
  try {
    const result = await db.query(
      `SELECT 
        r.name AS recipe,
        COUNT(DISTINCT s.id) AS times_sold,
        COALESCE(json_agg(w.name), '[]'::json) AS recommended_wines
       FROM sales s
       JOIN recipes r ON r.id = s.recipe_id
       LEFT JOIN pairing_evidence p ON p.recipe_id = s.recipe_id
       LEFT JOIN wines w ON w.id = p.wine_id
       WHERE s.venue_id = $1 
        AND s.created_at > NOW() - INTERVAL '${days} days'
        AND p.pairing_score > 70
       GROUP BY r.name
       HAVING COUNT(DISTINCT s.wine_id) < COUNT(DISTINCT w.id)
       ORDER BY times_sold DESC`,
      [venueId],
    );

    return result.rows || [];
  } catch (error) {
    console.error("Error in getMissedPairings:", error);
    return [];
  }
}

/**
 * Get sales trend data for a menu item
 * @param {string} venueId - UUID of venue
 * @param {string} menuItemId - Menu item ID
 * @param {number} days - Number of days to analyze
 * @returns {object} trend data
 */
export async function getMenuItemTrend(venueId, menuItemId, days = 30) {
  try {
    const result = await db.query(
      `SELECT 
        DATE(created_at) AS sale_date,
        SUM(qty) AS qty,
        SUM(total) AS revenue
       FROM sales
       WHERE venue_id = $1 AND menu_item_id = $2 AND created_at > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY sale_date DESC`,
      [venueId, menuItemId],
    );

    return {
      venueId,
      menuItemId,
      days,
      trend: (result.rows || []).map((row) => ({
        date: row.sale_date,
        qty: parseInt(row.qty),
        revenue: parseFloat(row.revenue),
      })),
    };
  } catch (error) {
    console.error("Error in getMenuItemTrend:", error);
    throw error;
  }
}
