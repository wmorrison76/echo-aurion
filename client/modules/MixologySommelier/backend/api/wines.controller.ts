import express from "express";
import db from "../db/client.js";
const router = express.Router();
router.get("/", async (_, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM wines ORDER BY producer, name",
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
    const { rows } = await db.query("SELECT * FROM wines WHERE id=$1", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Wine not found" });
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
      sku,
      name,
      producer,
      region,
      vintage,
      varietals,
      style,
      abv,
      body,
      tannin,
      acidity,
      sweetness,
      oak,
      aromas,
      retail_price,
      cost_price,
    } = req.body;
    const { rows } = await db.query(
      `INSERT INTO wines (sku, name, producer, region, vintage, varietals, style, abv, body, tannin, acidity, sweetness, oak, aromas, retail_price, cost_price) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [
        sku,
        name,
        producer,
        region,
        vintage,
        varietals,
        style,
        abv,
        body,
        tannin,
        acidity,
        sweetness,
        oak,
        aromas,
        retail_price,
        cost_price,
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
    const { name, producer, retail_price, cost_price } = req.body;
    await db.query(
      `UPDATE wines SET name=$1, producer=$2, retail_price=$3, cost_price=$4 WHERE id=$5`,
      [name, producer, retail_price, cost_price, req.params.id],
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
    await db.query("DELETE FROM wines WHERE id=$1", [req.params.id]);
    res.json({ status: "deleted" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
export default router;
