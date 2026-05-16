import type { RequestHandler } from "express";
import { buildVarianceRadar } from "../../shared/variance";
export const handleVarianceRadar: RequestHandler = (req, res) => {
  const inputs = req.body?.points;
  if (!Array.isArray(inputs)) {
    return res.status(400).json({ error: "points array required" });
  }
  const summary = buildVarianceRadar(inputs);
  res.json({ summary });
};
