import express from "express";
import db from "../db/client.js";
const router = express.Router();
router.post("/register", async (req, res) => {
  try {
    const { email, password_hash, role, venue_id } = req.body;
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, role, venue_id) VALUES ($1,$2,$3,$4) RETURNING id, email, role`,
      [email, password_hash, role || "sommelier", venue_id],
    );
    res.json({ user: rows[0], status: "registered" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { email, password_hash } = req.body;
    const { rows } = await db.query(
      `SELECT id, email, role, venue_id FROM users WHERE email=$1 AND password_hash=$2`,
      [email, password_hash],
    );
    if (rows.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });
    res.json({ user: rows[0], status: "authenticated" });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
router.get("/user/:id", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, email, role, venue_id, created_at FROM users WHERE id=$1`,
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Database error",
    });
  }
});
export default router;
