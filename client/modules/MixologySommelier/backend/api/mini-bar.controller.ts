import express from "express";
import db from "../db/client.js";
const router =
  express.Router(); /** * POST /api/mini-bar/pois * Create a new mini bar POI (Point of Service - room, suite, lounge) */
router.post("/pois", async (req, res) => {
  try {
    const { venueId, locationName, locationType, floor } = req.body;
    const poiId = `MB-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const { rows } = await db.query(
      `INSERT INTO mini_bar_pois ( venue_id, poi_id, location_name, location_type, floor ) VALUES ($1, $2, $3, $4, $5) RETURNING id, poi_id`,
      [venueId, poiId, locationName, locationType, floor],
    );
    res.json({ id: rows[0].id, poiId: rows[0].poi_id, status: "created" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create POI",
    });
  }
}); /** * GET /api/mini-bar/pois/:venueId * Get all mini bar POIs for a venue */
router.get("/pois/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;
    const { rows } = await db.query(
      ` SELECT mp.*, COUNT(DISTINCT mbs.id) as stock_items, SUM(mbs.quantity_remaining) as total_qty_remaining FROM mini_bar_pois mp LEFT JOIN mini_bar_stock mbs ON mp.id = mbs.mini_bar_poi_id WHERE mp.venue_id = $1 GROUP BY mp.id ORDER BY mp.floor, mp.location_name `,
      [venueId],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
}); /** * GET /api/mini-bar/:poiId * Get mini bar stock for a specific POI */
router.get("/:poiId", async (req, res) => {
  try {
    const { poiId } = req.params;
    const { rows: poiRows } = await db.query(
      `SELECT * FROM mini_bar_pois WHERE id = $1`,
      [poiId],
    );
    if (poiRows.length === 0) {
      return res.status(404).json({ error: "POI not found" });
    }
    const { rows: stockRows } = await db.query(
      ` SELECT mbs.*, l.name as liquor_name, l.spirit_type, b.name as beer_name, b.beer_style, w.name as wine_name, w.vintage, l.retail_price as liquor_retail_price, b.retail_price as beer_retail_price, w.retail_price as wine_retail_price FROM mini_bar_stock mbs LEFT JOIN liquor_spirits l ON mbs.liquor_id = l.id LEFT JOIN beer_catalog b ON mbs.beer_id = b.id LEFT JOIN wines w ON mbs.wine_id = w.id WHERE mbs.mini_bar_poi_id = $1 ORDER BY l.name COALESCE b.name COALESCE w.name `,
      [poiId],
    );
    res.json({ poi: poiRows[0], stock: stockRows });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
}); /** * POST /api/mini-bar/:poiId/stock * Add stock to a mini bar POI */
router.post("/:poiId/stock", async (req, res) => {
  try {
    const { poiId } = req.params;
    const { liquorId, beerId, wineId, quantityStocked, autoDepletEnabled } =
      req.body;
    const { rows } = await db.query(
      `INSERT INTO mini_bar_stock ( mini_bar_poi_id, wine_id, liquor_id, beer_id, quantity_stocked, quantity_remaining, auto_deplete_enabled ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        poiId,
        wineId || null,
        liquorId || null,
        beerId || null,
        quantityStocked,
        quantityStocked,
        autoDepletEnabled !== false,
      ],
    );
    res.json({ id: rows[0].id, status: "stock_added" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to add stock",
    });
  }
}); /** * PATCH /api/mini-bar/stock/:stockId * Update mini bar stock (quantity consumed) */
router.patch("/stock/:stockId", async (req, res) => {
  try {
    const { stockId } = req.params;
    const { quantityRemaining } = req.body;
    await db.query(
      `UPDATE mini_bar_stock SET quantity_remaining = $1, last_audited_at = NOW() WHERE id = $2`,
      [quantityRemaining, stockId],
    );
    res.json({ status: "updated" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to update stock",
    });
  }
}); /** * POST /api/mini-bar/:poiId/restock * Record restocking of a mini bar */
router.post("/:poiId/restock", async (req, res) => {
  try {
    const { poiId } = req.params;
    const { restokedByUserId, notes } = req.body;
    await db.query(
      `UPDATE mini_bar_pois SET last_restocked_at = NOW(), restocked_by_user_id = $1 WHERE id = $2`,
      [restokedByUserId, poiId],
    );
    res.json({
      status: "restocked",
      message: `Mini bar ${poiId} restocked successfully`,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to restock",
    });
  }
}); /** * GET /api/mini-bar/venues/:venueId/summary * Get summary of all mini bar stock for a venue */
router.get("/venues/:venueId/summary", async (req, res) => {
  try {
    const { venueId } = req.params;
    const { rows } = await db.query(
      ` SELECT COUNT(DISTINCT mp.id) as total_pois, SUM(mbs.quantity_stocked) as total_stocked, SUM(mbs.quantity_remaining) as total_remaining, COUNT(CASE WHEN mbs.quantity_remaining < (mbs.quantity_stocked * 0.25) THEN 1 END) as depleted_items, COUNT(CASE WHEN mbs.auto_deplete_enabled = true THEN 1 END) as auto_deplete_enabled FROM mini_bar_pois mp LEFT JOIN mini_bar_stock mbs ON mp.id = mbs.mini_bar_poi_id WHERE mp.venue_id = $1 `,
      [venueId],
    );
    res.json(rows[0] || {});
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
export default router;
