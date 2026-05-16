/**
 * Forensic Audit API Routes
 * Provides endpoints for system-wide forensic auditing
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { jwtAuthMiddleware } from "../middleware/auth-jwt";
import { logger } from "../lib/logger";
import { getForensicAuditService } from "../services/forensic-audit-service";

const router = Router();
router.use(jwtAuthMiddleware);

/**
 * GET /api/forensic-audit
 * Run comprehensive system-wide audit
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const auditService = getForensicAuditService();
    const report = await auditService.runForensicAudit();

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    logger.error("Forensic audit failed", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Audit failed",
    });
  }
});

/**
 * GET /api/forensic-audit/system/:systemName
 * Audit specific system
 */
router.get("/system/:systemName", async (req: Request, res: Response) => {
  try {
    const { systemName } = req.params;
    const auditService = getForensicAuditService();

    let result;
    switch (systemName.toLowerCase()) {
      case "echoai3":
      case "echoai^3":
        result = await auditService.auditEchoAI3();
        break;
      case "echoaurum":
        result = await auditService.auditEchoAurum();
        break;
      case "echostratus":
        result = await auditService.auditEchoStratus();
        break;
      case "18i":
      case "i18n":
      case "language":
        result = await auditService.audit18iLanguage();
        break;
      case "integration":
        result = await auditService.auditSystemIntegration();
        break;
      case "performance":
        result = await auditService.auditPerformance();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown system: ${systemName}`,
        });
    }

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error("System audit failed", { error, systemName: req.params.systemName });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Audit failed",
    });
  }
});

export default router;
