import { Router, Request, Response } from "express";
import { z } from "zod";
import { logger, sanitizeError } from "../lib/logger";
import { validateRequest, UUIDSchema } from "../middleware/validation";
import { xeroIntegration } from "../lib/xero-integration";
const router = Router(); // ============================================================================
// OAUTH AUTHENTICATION
// ============================================================================ /** * GET /xero-auth-url * Generate Xero OAuth authorization URL */
router.get(
  "/xero-auth-url",
  validateRequest({ query: z.object({ organization_id: UUIDSchema }) }),
  async (req: Request, res: Response) => {
    try {
      const { organization_id } = req.query as { organization_id: string };
      const authUrl = xeroIntegration.generateAuthUrl(organization_id);
      res.json({
        organization_id,
        auth_url: authUrl,
        message: "Redirect user to this URL to authorize Xero access",
      });
    } catch (error) {
      logger.error("GET /xero-auth-url failed", {
        error: sanitizeError(error),
      });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); /** * POST /xero-callback * Handle Xero OAuth callback */
router.post(
  "/xero-callback",
  validateRequest({
    body: z.object({ code: z.string(), organization_id: UUIDSchema }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { code, organization_id } = req.body;
      const token = await xeroIntegration.exchangeAuthCode(
        organization_id,
        code,
      );
      logger.info("Xero OAuth callback processed", { organization_id });
      res.json({
        organization_id,
        status: "success",
        message: "Xero integration authorized",
        tenant_id: token.tenantId,
        expires_at: token.expiresAt,
      });
    } catch (error) {
      logger.error("POST /xero-callback failed", {
        error: sanitizeError(error),
      });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); // ============================================================================
// INVOICE EXPORT
// ============================================================================ /** * POST /export-invoice * Export invoice to Xero */
router.post(
  "/export-invoice",
  validateRequest({
    body: z.object({
      organization_id: UUIDSchema,
      invoice_id: UUIDSchema,
      invoice_data: z.object({
        invoiceNumber: z.string(),
        invoiceDate: z.string(),
        dueDate: z.string(),
        vendor: z.object({
          name: z.string(),
          email: z.string(),
          address: z.string(),
        }),
        total: z.number(),
        lineItems: z.array(
          z.object({
            description: z.string(),
            quantity: z.number(),
            unitAmount: z.number(),
            taxType: z.string().optional(),
            trackingCategory: z.string().optional(),
            glAccount: z.string(),
          }),
        ),
        currency: z.string(),
      }),
    }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { organization_id, invoice_id, invoice_data } = req.body;
      const result = await xeroIntegration.exportInvoice(
        organization_id,
        invoice_id,
        invoice_data,
      );
      logger.info("Invoice exported to Xero", {
        organization_id,
        invoice_id,
        xeroInvoiceId: result.xeroInvoiceId,
      });
      res.status(201).json({
        organization_id,
        invoice_id,
        xero_invoice_id: result.xeroInvoiceId,
        status: result.status,
        exported_at: result.exportedAt,
      });
    } catch (error) {
      logger.error("POST /export-invoice failed", {
        error: sanitizeError(error),
      });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); // ============================================================================
// GL ACCOUNT MAPPING & SYNC
// ============================================================================ /** * POST /sync-gl-accounts * Sync GL accounts from Xero */
router.post(
  "/sync-gl-accounts",
  validateRequest({ body: z.object({ organization_id: UUIDSchema }) }),
  async (req: Request, res: Response) => {
    try {
      const { organization_id } = req.body;
      await xeroIntegration.syncGLAccounts(organization_id);
      logger.info("GL accounts synced from Xero", { organization_id });
      res.json({
        organization_id,
        status: "sync_initiated",
        message: "GL accounts synced from Xero",
      });
    } catch (error) {
      logger.error("POST /sync-gl-accounts failed", {
        error: sanitizeError(error),
      });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); // ============================================================================
// RECONCILIATION
// ============================================================================ /** * GET /reconciliation-status * Get reconciliation status for invoices */
router.get(
  "/reconciliation-status",
  validateRequest({ query: z.object({ organization_id: UUIDSchema }) }),
  async (req: Request, res: Response) => {
    try {
      const { organization_id } = req.query as { organization_id: string };
      const status =
        await xeroIntegration.getReconciliationStatus(organization_id);
      res.json({
        organization_id,
        timestamp: new Date().toISOString(),
        ...status,
      });
    } catch (error) {
      logger.error("GET /reconciliation-status failed", {
        error: sanitizeError(error),
      });
      res.status(500).json({ error: (error as Error).message });
    }
  },
);
export default router;
