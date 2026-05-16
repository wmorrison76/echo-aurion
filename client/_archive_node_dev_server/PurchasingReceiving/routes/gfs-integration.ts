import { Router, Request, Response } from "express";
import { z } from "zod";
import { logger, sanitizeError } from "../lib/logger";
import { validateRequest, UUIDSchema } from "../middleware/validation";
import { gfsAPIConnector } from "../lib/gfs-api-connector";
const router = Router(); /** * GET /catalog * Fetch GFS product catalog */
router.get(
  "/catalog",
  validateRequest({
    query: z.object({ force_refresh: z.string().default("false") }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { force_refresh } = req.query;
      const catalog = await gfsAPIConnector.fetchCatalog(
        force_refresh === "true",
      );
      res.json({
        supplier: "GFS",
        item_count: catalog.length,
        items: catalog,
        note: "MOCK DATA - Real data will come from GFS API",
      });
    } catch (error) {
      logger.error("GET /catalog failed", { error: sanitizeError(error) });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); /** * GET /search * Search GFS catalog */
router.get(
  "/search",
  validateRequest({ query: z.object({ q: z.string().min(2) }) }),
  async (req: Request, res: Response) => {
    try {
      const { q } = req.query;
      const results = await gfsAPIConnector.searchCatalog(q as string);
      res.json({ query: q, result_count: results.length, results });
    } catch (error) {
      logger.error("GET /search failed", { error: sanitizeError(error) });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); /** * POST /orders * Submit order to GFS */
router.post(
  "/orders",
  validateRequest({
    body: z.object({
      organization_id: UUIDSchema,
      outlet_id: UUIDSchema,
      items: z.array(
        z.object({
          gfs_item_number: z.string(),
          quantity: z.number().positive(),
          unit_price: z.number().positive(),
        }),
      ),
      delivery_date: z.string(),
    }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { organization_id, outlet_id, items, delivery_date } = req.body;
      const order = await gfsAPIConnector.submitOrder(
        organization_id,
        outlet_id,
        items.map((i) => ({
          gfsItemNumber: i.gfs_item_number,
          quantity: i.quantity,
          unitPrice: i.unit_price,
        })),
        delivery_date,
      );
      res.status(201).json(order);
    } catch (error) {
      logger.error("POST /orders failed", { error: sanitizeError(error) });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); /** * GET /punchout-url * Get GFS punchout URL */
router.get(
  "/punchout-url",
  validateRequest({
    query: z.object({ organization_id: UUIDSchema, user_id: z.string() }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { organization_id, user_id } = req.query;
      const punchoutUrl = await gfsAPIConnector.getPunchoutURL(
        organization_id as string,
        user_id as string,
      );
      res.json({
        organization_id,
        punchout_url: punchoutUrl,
        message: "MOCK URL - Connect real GFS cXML service",
      });
    } catch (error) {
      logger.error("GET /punchout-url failed", { error: sanitizeError(error) });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); /** * GET /orders/:orderNumber * Get order status */
router.get("/orders/:orderNumber", async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const status = await gfsAPIConnector.getOrderStatus(orderNumber);
    res.json({ order_number: orderNumber, ...status });
  } catch (error) {
    logger.error("GET /orders/:orderNumber failed", {
      error: sanitizeError(error),
    });
    res.status(500).json({ error: (error as Error).message });
  }
});
export default router;
