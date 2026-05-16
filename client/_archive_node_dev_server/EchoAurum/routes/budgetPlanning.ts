import type { RequestHandler } from "express";
import {
  generateBudgetPlan,
  generateBudgetAnalysis,
  generateDriverMetrics,
  generateBudgetForecast,
  generateBudgetVarianceDetail,
} from "./budgetDemo";
export const handleBudgetPlan: RequestHandler = (req, res) => {
  const { outletId } = req.body ?? req.query ?? {};
  try {
    const plan = generateBudgetPlan(
      typeof outletId === "string" ? outletId : undefined,
    );
    res.json({ plan });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load budget plan.";
    res.status(500).json({ error: message });
  }
};
export const handleBudgetAnalysis: RequestHandler = (req, res) => {
  try {
    const analysis = generateBudgetAnalysis();
    res.json({ analysis });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load budget analysis.";
    res.status(500).json({ error: message });
  }
};
export const handleBudgetDrivers: RequestHandler = (req, res) => {
  try {
    const metrics = generateDriverMetrics();
    res.json({ metrics });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load budget drivers.";
    res.status(500).json({ error: message });
  }
};
export const handleBudgetForecast: RequestHandler = (req, res) => {
  const { accountCode } = req.body ?? req.query ?? {};
  if (typeof accountCode !== "string" || accountCode.trim().length === 0) {
    return res.status(400).json({ error: "accountCode is required" });
  }
  try {
    const forecast = generateBudgetForecast(accountCode);
    res.json({ forecast });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load budget forecast.";
    res.status(404).json({ error: message });
  }
};
export const handleBudgetVarianceDetail: RequestHandler = (req, res) => {
  const { accountCode } = req.body ?? req.query ?? {};
  if (typeof accountCode !== "string" || accountCode.trim().length === 0) {
    return res.status(400).json({ error: "accountCode is required" });
  }
  try {
    const detail = generateBudgetVarianceDetail(accountCode);
    res.json({ detail });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load budget variance detail.";
    res.status(404).json({ error: message });
  }
};
