/**
 * Module Health API Routes
 * Exposes module validation and health status endpoints
 */

import { Router, Request, Response } from "express";
import {
  getValidationReport,
  getModuleStatus,
  getSystemHealth,
  refreshValidation,
} from "../lib/module-validator";

const router = Router();

/**
 * GET /api/module-health
 * Get overall system health and module status
 */
router.get("/", (_req: Request, res: Response) => {
  try {
    const health = getSystemHealth();
    const report = getValidationReport();

    // Try to get file watcher stats (if available)
    let fileWatcherStats = {
      available: false,
      limit: 0,
      used: 0,
      percentage: 0,
    };

    // Note: File watcher stats would need to be tracked separately
    // This is a placeholder for future enhancement

    res.json({
      systemStatus: health.status,
      timestamp: new Date().toISOString(),
      fileWatcher: fileWatcherStats,
      modules: Object.entries(health.modules).map(([name, status]) => ({
        name,
        status,
      })),
      summary: {
        totalModules: Object.keys(health.modules).length,
        healthy: Object.values(health.modules).filter((s) => s === "healthy")
          .length,
        warning: Object.values(health.modules).filter((s) => s === "warning")
          .length,
        unhealthy: Object.values(health.modules).filter(
          (s) => s === "unhealthy",
        ).length,
      },
      issues: health.issues,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get module health",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/module-health/validate
 * Refresh validation (re-check all modules)
 */
router.get("/validate", (_req: Request, res: Response) => {
  try {
    const report = refreshValidation();

    res.json({
      status: "validation_complete",
      systemStatus: report.systemStatus,
      timestamp: report.timestamp,
      summary: {
        totalModules: Object.keys(report.modules).length,
        healthy: Object.values(report.modules).filter(
          (m) => m.status === "healthy",
        ).length,
        warning: Object.values(report.modules).filter(
          (m) => m.status === "warning",
        ).length,
        unhealthy: Object.values(report.modules).filter(
          (m) => m.status === "unhealthy",
        ).length,
      },
      modules: report.modules,
      issues: report.issues,
    });
  } catch (error) {
    res.status(500).json({
      error: "Validation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/module-health/:moduleName
 * Get specific module health
 */
router.get("/:moduleName", (req: Request, res: Response) => {
  try {
    const { moduleName } = req.params;
    const status = getModuleStatus(moduleName);

    if (!status) {
      return res.status(404).json({
        error: "Module not found",
        moduleName,
      });
    }

    res.json({
      module: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get module status",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/module-health/validate/:moduleName
 * Validate specific module
 */
router.get("/validate/:moduleName", (req: Request, res: Response) => {
  try {
    const { moduleName } = req.params;

    // Refresh validation to get latest status
    const report = refreshValidation();
    const status = report.modules[moduleName];

    if (!status) {
      return res.status(404).json({
        error: "Module not found",
        moduleName,
      });
    }

    res.json({
      module: status,
      timestamp: report.timestamp,
    });
  } catch (error) {
    res.status(500).json({
      error: "Validation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/module-health/report
 * Get detailed validation report (JSON)
 */
router.get("/report", (_req: Request, res: Response) => {
  try {
    const report = getValidationReport();

    res.json({
      timestamp: report.timestamp,
      systemStatus: report.systemStatus,
      modules: report.modules,
      summary: {
        totalModules: Object.keys(report.modules).length,
        healthy: Object.values(report.modules).filter(
          (m) => m.status === "healthy",
        ).length,
        warning: Object.values(report.modules).filter(
          (m) => m.status === "warning",
        ).length,
        unhealthy: Object.values(report.modules).filter(
          (m) => m.status === "unhealthy",
        ).length,
      },
      issues: report.issues,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get validation report",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
