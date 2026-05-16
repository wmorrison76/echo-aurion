import express from "express";
import db from "../db/client.js";
const router =
  express.Router(); /** * POST /api/comped-drinks * Log a comped drink */
router.post("/", async (req, res) => {
  try {
    const {
      venueId,
      liquorId,
      beerId,
      wineId,
      bottleSizeMl,
      quantityPoured,
      compedByUserId,
      compReason,
      tableNumber,
      guestNotes,
      posEntryMade,
    } = req.body;
    const compId = `C-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const { rows } = await db.query(
      `INSERT INTO comped_drinks ( venue_id, comp_id, wine_id, liquor_id, beer_id, bottle_size_ml, quantity_poured, comped_by_user_id, comp_reason, table_number, guest_notes, pos_entry_made ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, comp_id`,
      [
        venueId,
        compId,
        wineId || null,
        liquorId || null,
        beerId || null,
        bottleSizeMl || 750,
        quantityPoured,
        compedByUserId,
        compReason,
        tableNumber,
        guestNotes,
        posEntryMade || false,
      ],
    );
    res.json({ id: rows[0].id, compId: rows[0].comp_id, status: "logged" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to log comp",
    });
  }
}); /** * GET /api/comped-drinks * Get comped drinks with filters */
router.get("/", async (req, res) => {
  try {
    const {
      venueId,
      compReason,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;
    let query = ` SELECT cd.*, l.name as liquor_name, l.spirit_type, b.name as beer_name, b.beer_style, w.name as wine_name, w.vintage, u.email as comped_by_email FROM comped_drinks cd LEFT JOIN liquor_spirits l ON cd.liquor_id = l.id LEFT JOIN beer_catalog b ON cd.beer_id = b.id LEFT JOIN wines w ON cd.wine_id = w.id LEFT JOIN users u ON cd.comped_by_user_id = u.id `;
    const params: any[] = [];
    const conditions: string[] = [];
    if (venueId) {
      conditions.push(`cd.venue_id = $${params.length + 1}`);
      params.push(venueId);
    }
    if (compReason) {
      conditions.push(`cd.comp_reason = $${params.length + 1}`);
      params.push(compReason);
    }
    if (startDate) {
      conditions.push(`cd.created_at >= $${params.length + 1}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`cd.created_at <= $${params.length + 1}`);
      params.push(endDate);
    }
    if (conditions.length > 0) {
      query += " WHERE" + conditions.join(" AND");
    }
    query += ` ORDER BY cd.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
}); /** * GET /api/comped-drinks/stats/:venueId * Get comped drinks statistics for a venue */
router.get("/stats/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;
    const { startDate, endDate } = req.query;
    let query = ` SELECT COUNT(*) as total_comps, SUM(quantity_poured) as total_ml_poured, COUNT(DISTINCT comped_by_user_id) as unique_compers, COUNT(CASE WHEN comp_reason = 'r_and_d' THEN 1 END) as rd_comps, COUNT(CASE WHEN comp_reason = 'service_recovery' THEN 1 END) as service_comps, COUNT(CASE WHEN comp_reason = 'vip_courtesy' THEN 1 END) as vip_comps, COUNT(CASE WHEN comp_reason = 'staff_training' THEN 1 END) as training_comps, COUNT(CASE WHEN comp_reason = 'wait_time' THEN 1 END) as wait_comps, COUNT(CASE WHEN pos_entry_made = true THEN 1 END) as pos_tracked FROM comped_drinks WHERE venue_id = $1 `;
    const params: any[] = [venueId];
    if (startDate) {
      query += ` AND created_at >= $${params.length + 1}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND created_at <= $${params.length + 1}`;
      params.push(endDate);
    }
    const { rows } = await db.query(query, params);
    res.json(rows[0] || {});
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
}); /** * GET /api/comped-drinks/by-user/:userId * Get comped drinks by specific user (staff performance) */
router.get("/by-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const { rows } = await db.query(
      ` SELECT cd.*, l.name as liquor_name, l.spirit_type, b.name as beer_name, b.beer_style, w.name as wine_name, w.vintage FROM comped_drinks cd LEFT JOIN liquor_spirits l ON cd.liquor_id = l.id LEFT JOIN beer_catalog b ON cd.beer_id = b.id LEFT JOIN wines w ON cd.wine_id = w.id WHERE cd.comped_by_user_id = $1 ORDER BY cd.created_at DESC LIMIT $2 OFFSET $3 `,
      [userId, limit, offset],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
}); /** * PATCH /api/comped-drinks/:compId * Update comped drink record */
router.patch("/:compId", async (req, res) => {
  try {
    const { compId } = req.params;
    const { posEntryMade, guestNotes } = req.body;
    await db.query(
      `UPDATE comped_drinks SET pos_entry_made = COALESCE($1, pos_entry_made), guest_notes = COALESCE($2, guest_notes), updated_at = NOW() WHERE id = $3`,
      [posEntryMade, guestNotes, compId],
    );
    res.json({ status: "updated" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to update comp",
    });
  }
}); /** * GET /api/comped-drinks/rd-analysis/:venueId * Get R&D comps analysis */
router.get("/rd-analysis/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;
    const { rows } = await db.query(
      ` SELECT CASE WHEN liquor_id IS NOT NULL THEN l.name WHEN beer_id IS NOT NULL THEN b.name WHEN wine_id IS NOT NULL THEN w.name END as item_name, CASE WHEN liquor_id IS NOT NULL THEN 'liquor' WHEN beer_id IS NOT NULL THEN 'beer' WHEN wine_id IS NOT NULL THEN 'wine' END as item_type, COUNT(*) as comp_count, SUM(quantity_poured) as total_ml, AVG(quantity_poured) as avg_ml, COUNT(DISTINCT comped_by_user_id) as unique_compers, COUNT(CASE WHEN pos_entry_made = true THEN 1 END) as pos_tracked FROM comped_drinks cd LEFT JOIN liquor_spirits l ON cd.liquor_id = l.id LEFT JOIN beer_catalog b ON cd.beer_id = b.id LEFT JOIN wines w ON cd.wine_id = w.id WHERE cd.venue_id = $1 AND cd.comp_reason = 'r_and_d' GROUP BY item_name, item_type ORDER BY comp_count DESC `,
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
