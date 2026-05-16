/**
 * Shift Swapping Marketplace API Routes
 * -------------------------------------
 * API endpoints for shift swapping marketplace
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { basicAuthMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";
import { getShiftSwapMarketplaceService } from "../services/shift-swap-marketplace";

const router = Router();
router.use(basicAuthMiddleware);

const PostShiftSchema = z.object({
  orgId: z.string().uuid(),
  outletId: z.string().uuid(),
  deptId: z.string().uuid(),
  employeeId: z.string().uuid(),
  shiftId: z.string().uuid(),
  shiftDate: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  positionId: z.string().uuid(),
  requiredSkills: z.array(z.string()).optional(),
  requiredCertifications: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const RequestSwapSchema = z.object({
  postingId: z.string(),
  requesterId: z.string().uuid(),
  orgId: z.string().uuid(),
});

const ApproveSwapSchema = z.object({
  swapId: z.string(),
  approverId: z.string().uuid(),
  orgId: z.string().uuid(),
});

const RejectSwapSchema = z.object({
  swapId: z.string(),
  approverId: z.string().uuid(),
  reason: z.string(),
  orgId: z.string().uuid(),
});

/**
 * POST /api/shift-swap/post
 * Post available shift for swapping
 */
router.post("/post", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = PostShiftSchema.parse(req.body);
    const marketplace = getShiftSwapMarketplaceService();

    const posting = await marketplace.postShift(validated);

    logger.info("[ShiftSwap] Shift posted", {
      orgId,
      postingId: posting.id,
      employeeId: validated.employeeId,
    });

    res.json({
      success: true,
      posting,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[ShiftSwap] Post shift error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/shift-swap/available
 * Get available shift postings
 */
router.get("/available", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const filters = {
      outletId: req.query.outletId as string | undefined,
      deptId: req.query.deptId as string | undefined,
      positionId: req.query.positionId as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
    };

    const marketplace = getShiftSwapMarketplaceService();
    const postings = await marketplace.getAvailablePostings(orgId, filters);

    res.json({
      success: true,
      postings,
      count: postings.length,
    });
  } catch (error) {
    logger.error("[ShiftSwap] Get available postings error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /api/shift-swap/request
 * Request swap for a posted shift
 */
router.post("/request", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const userId = (req as any).user?.id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = RequestSwapSchema.parse({
      ...req.body,
      requesterId: req.body.requesterId || userId,
      orgId,
    });

    const marketplace = getShiftSwapMarketplaceService();
    const swapRequest = await marketplace.requestSwap(
      validated.postingId,
      validated.requesterId,
      validated.orgId
    );

    logger.info("[ShiftSwap] Swap requested", {
      orgId,
      swapId: swapRequest.id,
      postingId: validated.postingId,
      requesterId: validated.requesterId,
    });

    res.json({
      success: true,
      swapRequest,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[ShiftSwap] Request swap error", { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message || "Internal server error",
    });
  }
});

/**
 * POST /api/shift-swap/approve
 * Approve swap request
 */
router.post("/approve", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const userId = (req as any).user?.id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = ApproveSwapSchema.parse({
      ...req.body,
      approverId: req.body.approverId || userId,
      orgId,
    });

    const marketplace = getShiftSwapMarketplaceService();
    const swapRequest = await marketplace.approveSwap(
      validated.swapId,
      validated.approverId,
      validated.orgId
    );

    logger.info("[ShiftSwap] Swap approved", {
      orgId,
      swapId: validated.swapId,
      approverId: validated.approverId,
    });

    res.json({
      success: true,
      swapRequest,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[ShiftSwap] Approve swap error", { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message || "Internal server error",
    });
  }
});

/**
 * POST /api/shift-swap/reject
 * Reject swap request
 */
router.post("/reject", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const userId = (req as any).user?.id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = RejectSwapSchema.parse({
      ...req.body,
      approverId: req.body.approverId || userId,
      orgId,
    });

    const marketplace = getShiftSwapMarketplaceService();
    const swapRequest = await marketplace.rejectSwap(
      validated.swapId,
      validated.approverId,
      validated.reason,
      validated.orgId
    );

    logger.info("[ShiftSwap] Swap rejected", {
      orgId,
      swapId: validated.swapId,
      approverId: validated.approverId,
      reason: validated.reason,
    });

    res.json({
      success: true,
      swapRequest,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[ShiftSwap] Reject swap error", { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message || "Internal server error",
    });
  }
});

/**
 * GET /api/shift-swap/my-requests
 * Get swap requests for current employee
 */
router.get("/my-requests", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const userId = (req as any).user?.id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const status = req.query.status as string | undefined;
    const marketplace = getShiftSwapMarketplaceService();
    const requests = await marketplace.getSwapRequests(
      userId,
      orgId,
      status as any
    );

    res.json({
      success: true,
      requests,
      count: requests.length,
    });
  } catch (error) {
    logger.error("[ShiftSwap] Get my requests error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/shift-swap/my-postings
 * Get shift postings by current employee
 */
router.get("/my-postings", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const userId = (req as any).user?.id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const status = req.query.status as string | undefined;
    const marketplace = getShiftSwapMarketplaceService();
    const postings = await marketplace.getEmployeePostings(
      userId,
      orgId,
      status as any
    );

    res.json({
      success: true,
      postings,
      count: postings.length,
    });
  } catch (error) {
    logger.error("[ShiftSwap] Get my postings error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/shift-swap/matching
 * Get matching shifts for current employee
 */
router.get("/matching", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const userId = (req as any).user?.id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const marketplace = getShiftSwapMarketplaceService();
    const matches = await marketplace.getMatchingShifts(userId, orgId);

    res.json({
      success: true,
      matches,
      count: matches.length,
    });
  } catch (error) {
    logger.error("[ShiftSwap] Get matching shifts error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * DELETE /api/shift-swap/posting/:postingId
 * Cancel shift posting
 */
router.delete("/posting/:postingId", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const userId = (req as any).user?.id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { postingId } = req.params;
    const marketplace = getShiftSwapMarketplaceService();

    await marketplace.cancelPosting(postingId, userId);

    logger.info("[ShiftSwap] Posting cancelled", {
      orgId,
      postingId,
      employeeId: userId,
    });

    res.json({
      success: true,
    });
  } catch (error) {
    logger.error("[ShiftSwap] Cancel posting error", { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message || "Internal server error",
    });
  }
});

export default router;
