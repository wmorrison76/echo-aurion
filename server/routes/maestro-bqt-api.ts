/**
 * Maestro BQT API Routes
 * Provides endpoints for MaestroBQT module data fetching
 * These endpoints return empty arrays to prevent 500 errors
 * The frontend will fall back to mock data if these fail
 */

import { Router, Request, Response } from "express";
import { optionalJwtAuthMiddleware } from "../middleware/auth-jwt";

const router = Router();

/**
 * GET /api/spaces
 * Get spaces (for MaestroBQT module)
 */
router.get("/spaces", optionalJwtAuthMiddleware, async (req: Request, res: Response) => {
  res.json({
    spaces: [],
    success: true,
  });
});

/**
 * GET /api/tasks
 * Get tasks (for MaestroBQT module)
 */
router.get("/tasks", optionalJwtAuthMiddleware, async (req: Request, res: Response) => {
  res.json({
    tasks: [],
    success: true,
  });
});

/**
 * GET /api/changes
 * Get changes (for MaestroBQT module)
 */
router.get("/changes", optionalJwtAuthMiddleware, async (req: Request, res: Response) => {
  res.json({
    changes: [],
    success: true,
  });
});

/**
 * GET /api/shortages
 * Get shortages (for MaestroBQT module)
 */
router.get("/shortages", optionalJwtAuthMiddleware, async (req: Request, res: Response) => {
  res.json({
    shortages: [],
    success: true,
  });
});

/**
 * GET /api/financials
 * Get financials (for MaestroBQT module)
 */
router.get("/financials", optionalJwtAuthMiddleware, async (req: Request, res: Response) => {
  res.json({
    financials: [],
    success: true,
  });
});

/**
 * GET /api/conflicts
 * Get conflicts (for MaestroBQT module)
 */
router.get("/conflicts", optionalJwtAuthMiddleware, async (req: Request, res: Response) => {
  res.json({
    conflicts: [],
    success: true,
  });
});

export default router;
