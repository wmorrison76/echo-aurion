import type { RequestHandler } from "express";
import {
  generateGLCatalog,
  generateGLExplorer,
  generateGLDrillDown,
} from "./glDemo";
export const handleGLCatalog: RequestHandler = (req, res) => {
  try {
    const catalog = generateGLCatalog();
    res.json({ catalog: catalog.codes });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load GL catalog.";
    res.status(500).json({ error: message });
  }
};
export const handleGLExplorer: RequestHandler = (req, res) => {
  try {
    const explorer = generateGLExplorer();
    res.json({
      accounts: explorer.accounts,
      transactionCount: explorer.transactions.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load GL explorer.";
    res.status(500).json({ error: message });
  }
};
export const handleGLDrillDown: RequestHandler = (req, res) => {
  const { accountCode } = req.body ?? req.query ?? {};
  if (typeof accountCode !== "string" || accountCode.trim().length === 0) {
    return res.status(400).json({ error: "accountCode is required" });
  }
  try {
    const drillDown = generateGLDrillDown(accountCode);
    res.json({ drillDown });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load GL drill-down.";
    res.status(404).json({ error: message });
  }
};
