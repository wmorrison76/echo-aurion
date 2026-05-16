import express from "express";
import db from "../db/client.js";
const router =
  express.Router(); /** * GET /api/liquor-inventory * Get all liquor/spirits in a venue with optional filters */
router.get("/", async (req, res) => {
  try {
    const { venueId, spiritType, minStock, search } = req.query;
    let query = ` SELECT l.*, COALESCE(SUM(il.qty_bottles), 0) as total_qty, COUNT(DISTINCT il.id) as total_lots FROM liquor_spirits l LEFT JOIN inventory_lots il ON il.liquor_id = l.id `;
    const params: any[] = [];
    const conditions: string[] = [];
    if (venueId) {
      conditions.push(`il.venue_id = $${params.length + 1}`);
      params.push(venueId);
    }
    if (spiritType) {
      conditions.push(`l.spirit_type = $${params.length + 1}`);
      params.push(spiritType);
    }
    if (minStock) {
      conditions.push(
        `COALESCE(SUM(il.qty_bottles), 0) < $${params.length + 1}`,
      );
      params.push(parseInt(minStock as string));
    }
    if (search) {
      conditions.push(
        `(l.name ILIKE $${params.length + 1} OR l.producer ILIKE $${params.length + 1})`,
      );
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    if (conditions.length > 0) {
      query += " WHERE" + conditions.join(" AND");
    }
    query += ` GROUP BY l.id ORDER BY l.name`;
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
}); /** * GET /api/liquor-inventory/by-venue/:venueId * Get all inventory for a specific venue */
router.get("/by-venue/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;
    const { rows } = await db.query(
      ` SELECT l.*, il.id as lot_id, il.qty_bottles, il.bin_location, il.lot_code, il.received_date, il.par_level, CASE WHEN il.qty_bottles <= il.par_level * 0.25 THEN 'critical' WHEN il.qty_bottles <= il.par_level * 0.5 THEN 'low' WHEN il.qty_bottles >= il.par_level * 1.2 THEN 'overstocked' ELSE 'normal' END as stock_status FROM liquor_spirits l LEFT JOIN inventory_lots il ON il.liquor_id = l.id AND il.venue_id = $1 ORDER BY l.spirit_type, l.name `,
      [venueId],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
}); /** * POST /api/liquor-inventory * Add new liquor/spirit to catalog */
router.post("/", async (req, res) => {
  try {
    const {
      sku,
      name,
      spiritType,
      producer,
      country,
      region,
      abv,
      bottleSize,
      proof,
      ageStatement,
      flavorProfile,
      retailPrice,
      costPrice,
      parLevel,
      reorderPoint,
      supplierId,
    } = req.body;
    const { rows } = await db.query(
      `INSERT INTO liquor_spirits ( sku, name, spirit_type, producer, country, region, abv, bottle_size_ml, proof, age_statement, flavor_profile, retail_price, cost_price, par_level, reorder_point, supplier_id ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id`,
      [
        sku,
        name,
        spiritType,
        producer,
        country,
        region,
        abv,
        bottleSize || 750,
        proof,
        ageStatement,
        JSON.stringify(flavorProfile || {}),
        retailPrice,
        costPrice,
        parLevel || 5,
        reorderPoint || 3,
        supplierId || null,
      ],
    );
    res.json({ id: rows[0].id, status: "created" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create liquor",
    });
  }
}); /** * POST /api/liquor-inventory/:liquorId/add-stock * Add stock to a venue */
router.post("/:liquorId/add-stock", async (req, res) => {
  try {
    const { liquorId } = req.params;
    const {
      venueId,
      qtyBottles,
      costPerBottle,
      binLocation,
      lotCode,
      receivedDate,
      parLevel,
    } = req.body;
    const { rows } = await db.query(
      `INSERT INTO inventory_lots ( wine_id, venue_id, bin_location, qty_bottles, cost_per_bottle, received_date, lot_code, par_level ) VALUES (NULL, $1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        venueId,
        binLocation,
        qtyBottles,
        costPerBottle,
        receivedDate,
        lotCode,
        parLevel || 5,
      ],
    );
    res.json({ id: rows[0].id, status: "stock_added" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to add stock",
    });
  }
}); /** * PATCH /api/liquor-inventory/:lotId * Update stock quantity or bin location */
router.patch("/:lotId", async (req, res) => {
  try {
    const { lotId } = req.params;
    const { qtyBottles, binLocation, costPerBottle } = req.body;
    await db.query(
      `UPDATE inventory_lots SET qty_bottles = COALESCE($1, qty_bottles), bin_location = COALESCE($2, bin_location), cost_per_bottle = COALESCE($3, cost_per_bottle) WHERE id = $4`,
      [qtyBottles, binLocation, costPerBottle, lotId],
    );
    res.json({ status: "updated" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to update stock",
    });
  }
}); /** * DELETE /api/liquor-inventory/:lotId * Remove a lot from inventory */
router.delete("/:lotId", async (req, res) => {
  try {
    const { lotId } = req.params;
    await db.query(`DELETE FROM inventory_lots WHERE id = $1`, [lotId]);
    res.json({ status: "deleted" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to delete lot",
    });
  }
}); /** * GET /api/liquor-inventory/stats/:venueId * Get inventory statistics for a venue */
router.get("/stats/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;
    const { rows } = await db.query(
      ` SELECT COUNT(DISTINCT l.id) as total_items, COUNT(DISTINCT il.id) as total_lots, SUM(il.qty_bottles) as total_bottles, SUM(il.qty_bottles * il.cost_per_bottle) as total_value, AVG(il.cost_per_bottle) as avg_cost_per_bottle, SUM(CASE WHEN il.qty_bottles <= l.reorder_point THEN 1 ELSE 0 END) as items_below_reorder, COUNT(CASE WHEN il.qty_bottles = 0 THEN 1 END) as out_of_stock_count FROM liquor_spirits l LEFT JOIN inventory_lots il ON il.liquor_id = l.id AND il.venue_id = $1 `,
      [venueId],
    );
    res.json(rows[0] || {});
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
}); /** * GET /api/liquor-inventory/low-stock/:venueId * Get items below par level or reorder point */
router.get("/low-stock/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;
    const { rows } = await db.query(
      ` SELECT l.*, COALESCE(SUM(il.qty_bottles), 0) as current_qty, l.par_level, l.reorder_point, CASE WHEN COALESCE(SUM(il.qty_bottles), 0) = 0 THEN 'out_of_stock' WHEN COALESCE(SUM(il.qty_bottles), 0) <= l.reorder_point THEN 'reorder' WHEN COALESCE(SUM(il.qty_bottles), 0) <= l.par_level THEN 'low' ELSE 'adequate' END as status FROM liquor_spirits l LEFT JOIN inventory_lots il ON il.liquor_id = l.id AND il.venue_id = $1 GROUP BY l.id HAVING COALESCE(SUM(il.qty_bottles), 0) <= l.par_level ORDER BY COALESCE(SUM(il.qty_bottles), 0) ASC `,
      [venueId],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
export default router;
