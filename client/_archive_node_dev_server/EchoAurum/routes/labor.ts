import type { RequestHandler } from "express";
import { optimizeLabor } from "../../shared/cashAnalytics";
import type { LaborSnapshot } from "../../shared/cashAnalytics";
interface LaborRequestBody {
  entries?: unknown;
}
function isLaborSnapshot(value: unknown): value is LaborSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<LaborSnapshot>;
  return (
    typeof candidate.property === "string" &&
    typeof candidate.department === "string" &&
    typeof candidate.scheduledHours === "number" &&
    typeof candidate.overtimeHours === "number" &&
    typeof candidate.overtimeCost === "number" &&
    typeof candidate.baselineOvertimeCost === "number"
  );
}
export const handleLaborOptimizer: RequestHandler = (req, res) => {
  const { entries } = req.body as LaborRequestBody;
  if (!Array.isArray(entries) || !entries.every(isLaborSnapshot)) {
    return res
      .status(400)
      .json({ error: "entries array of labor snapshots required" });
  }
  const optimization = optimizeLabor(entries);
  res.json({ optimization });
};
