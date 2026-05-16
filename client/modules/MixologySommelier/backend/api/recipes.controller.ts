import { Router } from "express";

const router = Router();

/** Builder.io removed app-wide. Recipe endpoints return empty/demo data only. */

router.get("/", async (_req, res) => {
  res.json({ status: "ok", data: [] });
});

router.get("/:id", async (req, res) => {
  res.status(404).json({ error: "Recipe not found (Builder.io removed)." });
});

router.post("/search", async (_req, res) => {
  res.json({ status: "ok", data: [], count: 0 });
});

export default router;
