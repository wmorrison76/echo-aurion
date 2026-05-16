import { Router, Request, Response } from "express";
import { z } from "zod";
import { logger, sanitizeError } from "../lib/logger";
import { validateRequest, UUIDSchema } from "../middleware/validation";
import { netSuiteIntegration } from "../lib/netsuite-integration";
const router =
  Router(); /** * GET /auth-url * Generate NetSuite OAuth authorization URL */
router.get(
  "/auth-url",
  validateRequest({ query: z.object({ organization_id: UUIDSchema }) }),
  async (req: Request, res: Response) => {
    try {
      const { organization_id } = req.query as { organization_id: string };
      const authUrl = netSuiteIntegration.generateAuthUrl(organization_id);
      res.json({
        organization_id,
        auth_url: authUrl,
        message: "MOCK URL - Connect real NetSuite credentials",
      });
    } catch (error) {
      logger.error("GET /auth-url failed", { error: sanitizeError(error) });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); /** * POST /callback * Handle NetSuite OAuth callback */
router.post(
  "/callback",
  validateRequest({
    body: z.object({ code: z.string(), organization_id: UUIDSchema }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { code, organization_id } = req.body;
      const token = await netSuiteIntegration.exchangeAuthCode(
        organization_id,
        code,
      );
      res.json({
        organization_id,
        status: "success",
        message: "NetSuite integration authorized (MOCK)",
        realm: token.realm,
      });
    } catch (error) {
      logger.error("POST /callback failed", { error: sanitizeError(error) });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); /** * POST /export-bill * Export bill to NetSuite */
router.post(
  "/export-bill",
  validateRequest({
    body: z.object({
      organization_id: UUIDSchema,
      invoice_id: UUIDSchema,
      bill_data: z.object({
        vendor_id: z.string(),
        vendor_name: z.string(),
        bill_number: z.string(),
        bill_date: z.string(),
        due_date: z.string(),
        amount: z.number(),
        currency: z.string(),
        line_items: z.array(
          z.object({
            description: z.string(),
            amount: z.number(),
            gl_account: z.string(),
            subsidiary: z.string().optional(),
          }),
        ),
      }),
    }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { organization_id, invoice_id, bill_data } = req.body;
      const result = await netSuiteIntegration.exportBill(
        organization_id,
        invoice_id,
        {
          vendorId: bill_data.vendor_id,
          vendorName: bill_data.vendor_name,
          billNumber: bill_data.bill_number,
          billDate: bill_data.bill_date,
          dueDate: bill_data.due_date,
          amount: bill_data.amount,
          currency: bill_data.currency,
          lineItems: bill_data.line_items.map((item) => ({
            description: item.description,
            amount: item.amount,
            glAccount: item.gl_account,
            subsidiary: item.subsidiary,
          })),
        },
      );
      res.status(201).json({
        organization_id,
        invoice_id,
        netsuite_transaction_id: result.netsuiteTransactionId,
        status: result.status,
        message: "MOCK export - Real export will use NetSuite API",
      });
    } catch (error) {
      logger.error("POST /export-bill failed", { error: sanitizeError(error) });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); /** * GET /subsidiaries * Get list of NetSuite subsidiaries */
router.get(
  "/subsidiaries",
  validateRequest({ query: z.object({ organization_id: UUIDSchema }) }),
  async (req: Request, res: Response) => {
    try {
      const { organization_id } = req.query as { organization_id: string };
      const subsidiaries =
        await netSuiteIntegration.getSubsidiaries(organization_id);
      res.json({
        organization_id,
        subsidiary_count: subsidiaries.length,
        subsidiaries,
        message: "MOCK DATA - Real data will come from NetSuite API",
      });
    } catch (error) {
      logger.error("GET /subsidiaries failed", { error: sanitizeError(error) });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); /** * POST /intercompany-allocation * Post intercompany allocation for multi-subsidiary */
router.post(
  "/intercompany-allocation",
  validateRequest({
    body: z.object({
      organization_id: UUIDSchema,
      source_bill_id: z.string(),
      subsidiaries: z.array(
        z.object({
          subsidiary_id: z.string(),
          amount: z.number(),
          gl_account: z.string(),
        }),
      ),
    }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { organization_id, source_bill_id, subsidiaries } = req.body;
      await netSuiteIntegration.postIntercompanyAllocation(organization_id, {
        sourceBillId: source_bill_id,
        subsidiaries: subsidiaries.map((s) => ({
          subsidiaryId: s.subsidiary_id,
          amount: s.amount,
          glAccount: s.gl_account,
        })),
      });
      res.json({
        organization_id,
        source_bill_id,
        subsidiary_count: subsidiaries.length,
        status: "posted",
        message: "MOCK post - Real posting will use NetSuite API",
      });
    } catch (error) {
      logger.error("POST /intercompany-allocation failed", {
        error: sanitizeError(error),
      });
      res.status(500).json({ error: (error as Error).message });
    }
  },
);
export default router;
