import express from "express";
import db from "../db/client.js";
const router = express.Router();
router.get("/", async (req, res) => {
  try {
    const status = req.query.status ? `WHERE status = $1` : "";
    const params = req.query.status ? [req.query.status] : [];
    const query = ` SELECT p.id, p.invoice_number, p.order_date as date, p.expected_delivery_date as expected_delivery, p.status, p.total_cost as total, s.name as supplier, json_agg( json_build_object( 'id', pi.id, 'wine_id', pi.wine_id, 'wine', w.name, 'qty', pi.quantity, 'cost_per_bottle', pi.cost_per_bottle, 'total', pi.quantity * pi.cost_per_bottle ) ) as items FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id LEFT JOIN purchase_items pi ON p.id = pi.purchase_id LEFT JOIN wines w ON pi.wine_id = w.id ${status} GROUP BY p.id, s.name ORDER BY p.created_at DESC `;
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const query = ` SELECT p.id, p.invoice_number, p.order_date as date, p.expected_delivery_date as expected_delivery, p.status, p.total_cost as total, s.name as supplier, json_agg( json_build_object( 'id', pi.id, 'wine_id', pi.wine_id, 'wine', w.name, 'qty', pi.quantity, 'cost_per_bottle', pi.cost_per_bottle, 'total', pi.quantity * pi.cost_per_bottle ) ) as items FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id LEFT JOIN purchase_items pi ON p.id = pi.purchase_id LEFT JOIN wines w ON pi.wine_id = w.id WHERE p.id = $1 GROUP BY p.id, s.name `;
    const { rows } = await db.query(query, [req.params.id]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Purchase not found" });
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
      supplier_id,
      invoice_number,
      order_date,
      expected_delivery_date,
      total_cost,
      items,
    } = req.body;
    const purchaseResult = await db.query(
      `INSERT INTO purchases (supplier_id, invoice_number, order_date, expected_delivery_date, total_cost) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [
        supplier_id,
        invoice_number,
        order_date,
        expected_delivery_date,
        total_cost,
      ],
    );
    const purchaseId = purchaseResult.rows[0].id;
    if (items && items.length > 0) {
      for (const item of items) {
        await db.query(
          `INSERT INTO purchase_items (purchase_id, wine_id, quantity, cost_per_bottle) VALUES ($1,$2,$3,$4)`,
          [purchaseId, item.wine_id, item.quantity, item.cost_per_bottle],
        );
      }
    }
    res.json({ id: purchaseId, status: "recorded" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
router.patch("/:id", async (req, res) => {
  try {
    const {
      invoice_number,
      order_date,
      expected_delivery_date,
      status,
      total_cost,
    } = req.body;
    await db.query(
      `UPDATE purchases SET invoice_number=$1, order_date=$2, expected_delivery_date=$3, status=$4, total_cost=$5 WHERE id=$6`,
      [
        invoice_number,
        order_date,
        expected_delivery_date,
        status,
        total_cost,
        req.params.id,
      ],
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
    await db.query("DELETE FROM purchases WHERE id=$1", [req.params.id]);
    res.json({ status: "deleted" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
export default router;
