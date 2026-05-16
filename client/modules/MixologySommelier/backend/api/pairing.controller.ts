import express from "express";
import db from "../db/client.js";
const router = express.Router();
router.get("/", async (_, res) => {
  try {
    const { rows } = await db.query(
      ` SELECT pe.*, w.name as wine_name, r.name as recipe_name FROM pairing_evidence pe LEFT JOIN wines w ON w.id = pe.wine_id LEFT JOIN recipes r ON r.id = pe.recipe_id ORDER BY pe.computed_at DESC `,
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
router.get("/wine/:wine_id", async (req, res) => {
  try {
    const { rows } = await db.query(
      ` SELECT pe.*, r.name as recipe_name FROM pairing_evidence pe LEFT JOIN recipes r ON r.id = pe.recipe_id WHERE pe.wine_id=$1 ORDER BY pe.pairing_score DESC `,
      [req.params.wine_id],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
router.get("/recipe/:recipe_id", async (req, res) => {
  try {
    const { rows } = await db.query(
      ` SELECT pe.*, w.name as wine_name, w.region, w.vintage FROM pairing_evidence pe LEFT JOIN wines w ON w.id = pe.wine_id WHERE pe.recipe_id=$1 ORDER BY pe.pairing_score DESC `,
      [req.params.recipe_id],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
router.post("/", async (req, res) => {
  try {
    const { wine_id, recipe_id, pairing_score, rationale } = req.body;
    const { rows } = await db.query(
      `INSERT INTO pairing_evidence (wine_id, recipe_id, pairing_score, rationale) VALUES ($1,$2,$3,$4) RETURNING id`,
      [wine_id, recipe_id, pairing_score, rationale],
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
    const { pairing_score, rationale, accepted_by_chef } = req.body;
    await db.query(
      `UPDATE pairing_evidence SET pairing_score=$1, rationale=$2, accepted_by_chef=$3 WHERE id=$4`,
      [pairing_score, rationale, accepted_by_chef, req.params.id],
    );
    res.json({ status: "updated" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
export default router;
