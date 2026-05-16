import type { RequestHandler } from "express";
import { buildPortfolioRollups } from "../../shared/cashAnalytics";
import type { PortfolioExposure } from "../../shared/cashAnalytics";
function isPortfolioExposure(value: unknown): value is PortfolioExposure {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<PortfolioExposure>;
  return (
    typeof candidate.property === "string" &&
    typeof candidate.revenue === "number" &&
    typeof candidate.laborCost === "number"
  );
}
export const handlePortfolioRollup: RequestHandler = (req, res) => {
  const entries = req.body?.entries;
  if (!Array.isArray(entries) || !entries.every(isPortfolioExposure)) {
    return res
      .status(400)
      .json({ error: "entries array of portfolio exposures required" });
  }
  const summary = buildPortfolioRollups(entries);
  res.json({ summary });
};
