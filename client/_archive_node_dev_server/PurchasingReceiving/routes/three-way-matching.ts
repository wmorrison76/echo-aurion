import { Router, Request, Response } from "express";
import { z } from "zod";
import { logger, sanitizeError } from "../lib/logger";
import { validateRequest, UUIDSchema } from "../middleware/validation";
import { threeWayMatchingEngine } from "../lib/three-way-matching-engine";
const router =
  Router(); /** * POST /matchings * Create new three-way matching */
router.post(
  "/matchings",
  validateRequest({
    body: z.object({ organization_id: UUIDSchema, po_id: UUIDSchema }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { organization_id, po_id } = req.body;
      const matching = await threeWayMatchingEngine.createMatching(
        organization_id,
        po_id,
      );
      res.status(201).json(matching);
    } catch (error) {
      logger.error("POST /matchings failed", { error: sanitizeError(error) });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); /** * POST /matchings/:matchingId/match-asn * Match ASN to PO */
router.post(
  "/matchings/:matchingId/match-asn",
  validateRequest({
    params: z.object({ matchingId: UUIDSchema }),
    body: z.object({ asn_id: UUIDSchema }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { matchingId } = req.params;
      const { asn_id } = req.body;
      const result = await threeWayMatchingEngine.matchASNToPO(
        matchingId,
        asn_id,
      );
      res.json(result);
    } catch (error) {
      logger.error("POST /matchings/:matchingId/match-asn failed", {
        error: sanitizeError(error),
      });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); /** * POST /matchings/:matchingId/match-invoice * Match Invoice to PO */
router.post(
  "/matchings/:matchingId/match-invoice",
  validateRequest({
    params: z.object({ matchingId: UUIDSchema }),
    body: z.object({ invoice_id: UUIDSchema }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { matchingId } = req.params;
      const { invoice_id } = req.body;
      const result = await threeWayMatchingEngine.matchInvoiceToPO(
        matchingId,
        invoice_id,
      );
      res.json(result);
    } catch (error) {
      logger.error("POST /matchings/:matchingId/match-invoice failed", {
        error: sanitizeError(error),
      });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); /** * POST /matchings/:matchingId/approve * Approve variance and post to GL */
router.post(
  "/matchings/:matchingId/approve",
  validateRequest({
    params: z.object({ matchingId: UUIDSchema }),
    body: z.object({ approving_user_id: z.string() }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { matchingId } = req.params;
      const { approving_user_id } = req.body;
      await threeWayMatchingEngine.approveVarianceAndPost(
        matchingId,
        approving_user_id,
      );
      res.json({
        matching_id: matchingId,
        status: "approved",
        message: "Variance approved and GL posting completed",
      });
    } catch (error) {
      logger.error("POST /matchings/:matchingId/approve failed", {
        error: sanitizeError(error),
      });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); /** * GET /status * Get reconciliation dashboard status */
router.get(
  "/status",
  validateRequest({ query: z.object({ organization_id: UUIDSchema }) }),
  async (req: Request, res: Response) => {
    try {
      const { organization_id } = req.query as { organization_id: string };
      const status =
        await threeWayMatchingEngine.getReconciliationStatus(organization_id);
      res.json({
        organization_id,
        timestamp: new Date().toISOString(),
        ...status,
      });
    } catch (error) {
      logger.error("GET /status failed", { error: sanitizeError(error) });
      res.status(500).json({ error: (error as Error).message });
    }
  },
);
export default router;
