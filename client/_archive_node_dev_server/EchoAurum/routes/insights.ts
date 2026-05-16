import type { RequestHandler } from "express";
import {
  calculateVarianceInsights,
  type VarianceInsightInput,
} from "../../shared/varianceInsights";
function coerceObservations(
  value: unknown,
): VarianceInsightInput["observations"] {
  return Array.isArray(value)
    ? (value as VarianceInsightInput["observations"])
    : [];
}
export const handleVarianceInsights: RequestHandler = (req, res) => {
  const { observations } = req.body ?? {};
  const payload: VarianceInsightInput = {
    observations: coerceObservations(observations),
  };
  try {
    const insights = calculateVarianceInsights(payload);
    res.json({ insights });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to calculate variance insights.";
    res.status(500).json({ error: message });
  }
};
