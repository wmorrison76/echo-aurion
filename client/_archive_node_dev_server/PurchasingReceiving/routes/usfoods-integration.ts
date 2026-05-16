import { Router, Request, Response } from "express";
import { z } from "zod";
import { logger, sanitizeError } from "../lib/logger";
import { validateRequest, UUIDSchema } from "../middleware/validation";
import { usfoodsEDIConnector } from "../lib/usfoods-edi-connector";
const router = Router(); /** * GET /catalog * Fetch US Foods catalog */
router.get(
  "/catalog",
  validateRequest({
    query: z.object({
      supplier_id: z.string(),
      force_refresh: z.string().default("false"),
    }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { supplier_id, force_refresh } = req.query;
      const catalog = await usfoodsEDIConnector.fetchCatalog(
        supplier_id as string,
        force_refresh === "true",
      );
      res.json({ supplier_id, item_count: catalog.length, items: catalog });
    } catch (error) {
      logger.error("GET /catalog failed", { error: sanitizeError(error) });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); /** * POST /submit-order * Submit order to US Foods */
router.post(
  "/submit-order",
  validateRequest({
    body: z.object({
      organization_id: UUIDSchema,
      outlet_id: UUIDSchema,
      supplier_id: z.string(),
      order_number: z.string(),
      items: z.array(
        z.object({
          sku: z.string(),
          quantity: z.number(),
          unit_of_measure: z.string(),
          unit_price: z.number(),
        }),
      ),
      delivery_address: z.object({
        address1: z.string(),
        city: z.string(),
        state: z.string(),
        zip: z.string(),
      }),
      requested_delivery_date: z.string(),
    }),
  }),
  async (req: Request, res: Response) => {
    try {
      const {
        organization_id,
        outlet_id,
        supplier_id,
        order_number,
        items,
        delivery_address,
        requested_delivery_date,
      } = req.body;
      const order = await usfoodsEDIConnector.submitOrder({
        orderId: order_number,
        organizationId: organization_id,
        outletId: outlet_id,
        supplierId: supplier_id,
        items,
        orderDate: new Date().toISOString(),
        requestedDeliveryDate: requested_delivery_date,
        deliveryAddress,
      });
      logger.info("Order submitted to US Foods", {
        organization_id,
        outlet_id,
        orderId: order.id,
      });
      res.status(201).json(order);
    } catch (error) {
      logger.error("POST /submit-order failed", {
        error: sanitizeError(error),
      });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); /** * GET /punchout-url * Get US Foods punchout URL */
router.get(
  "/punchout-url",
  validateRequest({
    query: z.object({ organization_id: UUIDSchema, user_id: z.string() }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { organization_id, user_id } = req.query;
      const punchoutUrl = await usfoodsEDIConnector.getPunchoutURL(
        organization_id as string,
        user_id as string,
      );
      res.json({
        organization_id,
        punchout_url: punchoutUrl,
        message: "Redirect user to this URL for punchout ordering",
      });
    } catch (error) {
      logger.error("GET /punchout-url failed", { error: sanitizeError(error) });
      res.status(500).json({ error: (error as Error).message });
    }
  },
);
export default router;
