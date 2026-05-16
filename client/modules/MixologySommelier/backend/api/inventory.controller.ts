import express from "express";
import db from "../db/client.js";
const router = express.Router();
router.get("/", async (_, res) => {
  try {
    const { rows } = await db.query(
      ` SELECT i.*, w.name, w.producer, w.region, w.vintage FROM inventory_lots i JOIN wines w ON w.id = i.wine_id ORDER BY i.bin_location `,
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await db.query(
      ` SELECT i.*, w.name, w.producer, w.region, w.vintage FROM inventory_lots i JOIN wines w ON w.id = i.wine_id WHERE i.id=$1 `,
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Lot not found" });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
router.post("/", async (req, res) => {
  try {
    const {
      wine_id,
      venue_id,
      bin_location,
      qty_bottles,
      cost_per_bottle,
      received_date,
      lot_code,
      par_level,
    } = req.body;
    const { rows } = await db.query(
      `INSERT INTO inventory_lots (wine_id, venue_id, bin_location, qty_bottles, cost_per_bottle, received_date, lot_code, par_level) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        wine_id,
        venue_id,
        bin_location,
        qty_bottles,
        cost_per_bottle,
        received_date,
        lot_code,
        par_level,
      ],
    );
    res.json({ id: rows[0].id, status: "created" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
router.patch("/:id", async (req, res) => {
  try {
    const { qty_bottles, bin_location, cost_per_bottle } = req.body;
    await db.query(
      `UPDATE inventory_lots SET qty_bottles=$1, bin_location=$2, cost_per_bottle=$3 WHERE id=$4`,
      [qty_bottles, bin_location, cost_per_bottle, req.params.id],
    );
    res.json({ status: "updated" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM inventory_lots WHERE id=$1", [req.params.id]);
    res.json({ status: "deleted" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
export default router;
