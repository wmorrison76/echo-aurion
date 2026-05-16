import type { RequestHandler } from "express";
import express from "express";
import { runZaroMonitor } from "../services/zaroMonitor";

const zaroMonitorRouter = express.Router();

export const handleZaroMonitor: RequestHandler = async (_req, res) => {
  try {
    const result = await runZaroMonitor();
    res.json({ success: true, result });
  } catch (error) {
    console.error("ZARO monitor error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

zaroMonitorRouter.post("/", handleZaroMonitor);

export default zaroMonitorRouter;
