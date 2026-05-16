import type { RequestHandler } from "express";
import express from "express";
import { createVaultBackup, listVault, runRestoreDrill } from "../services/vaultService";

const vaultRouter = express.Router();

export const handleVaultBackup: RequestHandler = async (_req, res) => {
  try {
    const result = await createVaultBackup();
    res.json({ success: true, result });
  } catch (error) {
    console.error("Vault backup error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const handleVaultStatus: RequestHandler = async (_req, res) => {
  try {
    const vault = await listVault();
    res.json({ success: true, vault });
  } catch (error) {
    console.error("Vault status error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const handleVaultDrill: RequestHandler = async (_req, res) => {
  try {
    const result = await runRestoreDrill();
    res.json({ success: true, result });
  } catch (error) {
    console.error("Vault drill error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

vaultRouter.post("/backup", handleVaultBackup);
vaultRouter.get("/status", handleVaultStatus);
vaultRouter.post("/drill", handleVaultDrill);

export default vaultRouter;
