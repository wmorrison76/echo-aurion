import { Router, Request, Response } from "express";
import {
  advancedMLForecastingEngine,
  AdvancedForecast,
  HistoricalSignals,
} from "../lib/advanced-ml-forecasting";
import { procurementAutomationEngine } from "../lib/procurement-automation";
import { syscoEDIConnector, EDIPOHeader } from "../lib/sysco-edi-connector";
import { logger } from "../lib/logger";
import { z } from "zod";
import crypto from "crypto";
const router = Router(); // Validation schemas
const GenerateAdvancedForecastSchema = z.object({
  organizationId: z.string().uuid(),
  outletId: z.string().uuid(),
  itemId: z.string().uuid(),
  historicalDemand: z.array(z.number()),
  dates: z.array(z.string()),
  events: z.array(z.string()).optional(),
  localTrends: z.array(z.string()).optional(),
});
const CreateAutoPOSchema = z.object({
  organizationId: z.string().uuid(),
  outletId: z.string().uuid(),
  itemId: z.string().uuid(),
  forecastedQuantity: z.number().nonnegative(),
});
const ApproveAutoPOSchema = z.object({ autoPoRequestId: z.string().uuid() });
const CreatePOSchema = z.object({
  organizationId: z.string().uuid(),
  outletId: z.string().uuid(),
  vendorId: z.string(),
  items: z.array(
    z.object({
      itemId: z.string().uuid(),
      quantity: z.number().positive(),
      unitPrice: z.number().nonnegative(),
    }),
  ),
  deliveryDate: z.string(),
}); // Advanced Forecasting Routes
router.post("/forecasts/advanced", async (req: Request, res: Response) => {
  try {
    const {
      organizationId,
      outletId,
      itemId,
      historicalDemand,
      dates,
      events,
      localTrends,
    } = GenerateAdvancedForecastSchema.parse(req.body);
    const signals: HistoricalSignals = {
      itemId,
      outletId,
      historicalDemand,
      dates,
      events: events || [],
      localTrends: localTrends || [],
    };
    const forecast = await advancedMLForecastingEngine.generateAdvancedForecast(
      organizationId,
      outletId,
      itemId,
      signals,
    );
    logger.info("Advanced forecast generated", {
      itemId,
      p50: forecast.p50,
      confidence: forecast.confidence,
    });
    res.json(forecast);
  } catch (error) {
    logger.error("Failed to generate advanced forecast", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to generate forecast" });
  }
}); // Backtest model accuracy
router.get(
  "/forecasts/backtest/:itemId/:outletId/:organizationId",
  async (req: Request, res: Response) => {
    try {
      const { itemId, outletId } = req.params;
      const metrics = await advancedMLForecastingEngine.backtestModel(
        itemId,
        outletId,
      );
      res.json(metrics);
    } catch (error) {
      logger.error("Failed to backtest forecast", error);
      res.status(500).json({ error: "Failed to backtest forecast" });
    }
  },
); // Auto-PO Generation Routes
router.post("/auto-po/generate", async (req: Request, res: Response) => {
  try {
    const { organizationId, outletId, itemId, forecastedQuantity } =
      CreateAutoPOSchema.parse(req.body);
    const autoPoRequest = await procurementAutomationEngine.generateAutoPO(
      organizationId,
      outletId,
      itemId,
      forecastedQuantity,
    );
    logger.info("Auto-PO request generated", {
      requestId: autoPoRequest.id,
      recommendedQuantity: autoPoRequest.recommendedQuantity,
    });
    res.json(autoPoRequest);
  } catch (error) {
    logger.error("Failed to generate auto-PO", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to generate auto-PO" });
  }
}); // Get pending auto-POs
router.get(
  "/auto-po/pending/:organizationId",
  async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.params;
      const pending =
        await procurementAutomationEngine.getPendingAutoPOs(organizationId);
      res.json(pending);
    } catch (error) {
      logger.error("Failed to fetch pending auto-POs", error);
      res.status(500).json({ error: "Failed to fetch pending auto-POs" });
    }
  },
); // Approve auto-PO and create PO
router.post("/auto-po/approve", async (req: Request, res: Response) => {
  try {
    const { autoPoRequestId } = ApproveAutoPOSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const po = await procurementAutomationEngine.approveAndCreatePO(
      autoPoRequestId,
      userId,
    );
    if (!po) {
      return res.status(404).json({ error: "Auto-PO request not found" });
    }
    logger.info("Auto-PO approved and PO created", {
      poNumber: po.poNumber,
      totalAmount: po.totalAmount,
    });
    res.json(po);
  } catch (error) {
    logger.error("Failed to approve auto-PO", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to approve auto-PO" });
  }
}); // EDI Routes
router.post("/edi/po/generate", async (req: Request, res: Response) => {
  try {
    const poData: EDIPOHeader = req.body;
    const organizationId = req.user?.organization_id;
    if (!organizationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const ediMessage = await syscoEDIConnector.generateEDI850(
      poData,
      organizationId,
    );
    logger.info("EDI 850 PO generated", {
      poNumber: poData.poNumber,
      messageId: ediMessage.id,
    });
    res.json(ediMessage);
  } catch (error) {
    logger.error("Failed to generate EDI 850", error);
    res.status(500).json({ error: "Failed to generate EDI 850" });
  }
}); // Process inbound EDI invoice (810)
router.post("/edi/invoice/receive", async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const organizationId = req.user?.organization_id;
    if (!organizationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!content) {
      return res.status(400).json({ error: "EDI content required" });
    }
    const invoice = await syscoEDIConnector.processEDI810(
      content,
      organizationId,
    );
    if (!invoice) {
      return res.status(400).json({ error: "Failed to parse EDI 810" });
    }
    logger.info("EDI 810 invoice processed", {
      invoiceNumber: invoice.invoiceNumber,
      poNumber: invoice.poNumber,
    });
    res.json(invoice);
  } catch (error) {
    logger.error("Failed to process EDI 810", error);
    res.status(500).json({ error: "Failed to process EDI 810" });
  }
}); // Process inbound EDI ASN (856)
router.post("/edi/asn/receive", async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const organizationId = req.user?.organization_id;
    if (!organizationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!content) {
      return res.status(400).json({ error: "EDI content required" });
    }
    const asn = await syscoEDIConnector.processEDI856(content, organizationId);
    if (!asn) {
      return res.status(400).json({ error: "Failed to parse EDI 856" });
    }
    logger.info("EDI 856 ASN processed", {
      asnNumber: asn.asnNumber,
      poNumber: asn.poNumber,
    });
    res.json(asn);
  } catch (error) {
    logger.error("Failed to process EDI 856", error);
    res.status(500).json({ error: "Failed to process EDI 856" });
  }
}); // Transmit pending EDI messages
router.post("/edi/transmit", async (req: Request, res: Response) => {
  try {
    const count = await syscoEDIConnector.transmitEDI850Messages();
    logger.info("EDI messages transmitted", { count });
    res.json({ transmitted: count });
  } catch (error) {
    logger.error("Failed to transmit EDI messages", error);
    res.status(500).json({ error: "Failed to transmit EDI messages" });
  }
}); // Three-Way Match
router.post("/match/three-way", async (req: Request, res: Response) => {
  try {
    const { poId, invoiceId, asnId } = req.body;
    if (!poId || !invoiceId || !asnId) {
      return res
        .status(400)
        .json({ error: "PO ID, Invoice ID, and ASN ID required" });
    }
    const match = await procurementAutomationEngine.processThreeWayMatch(
      poId,
      invoiceId,
      asnId,
    );
    if (!match) {
      return res.status(404).json({ error: "Documents not found" });
    }
    logger.info("Three-way match processed", {
      matchId: match.id,
      status: match.matchStatus,
    });
    res.json(match);
  } catch (error) {
    logger.error("Failed to process three-way match", error);
    res.status(500).json({ error: "Failed to process three-way match" });
  }
});
export const procurementSprint3Router = router;
