import type { RequestHandler } from "express";
import { optimizeCashLadder } from "../../shared/cash";
export const handleCashOptimizer: RequestHandler = (req, res) => {
  const { positions, payables, minimumBalance } = req.body ?? {};
  if (!positions || !payables || typeof minimumBalance !== "number") {
    return res
      .status(400)
      .json({ error: "positions, payables, minimumBalance required" });
  }
  const result = optimizeCashLadder({ positions, payables, minimumBalance });
  res.json({ optimization: result });
};
