import type { RequestHandler } from "express";
import { generatePurchasingDashboard } from "./purchasingDemo";
import type { PurchasingDashboard } from "../../shared/purchasing";
export const handlePurchasingDashboard: RequestHandler = (_req, res) => {
  const dashboard: PurchasingDashboard = generatePurchasingDashboard();
  res.status(200).json({ dashboard });
};
