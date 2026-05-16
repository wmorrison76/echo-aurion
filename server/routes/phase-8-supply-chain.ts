import { Router, Request, Response } from "express";
import {
  supplyChainManager,
  ProcurementItem,
} from "../../cognition/phases/phase-8-supply-chain";
import { requireRole } from "../middleware/auth";
import { validateOrgContext } from "../middleware/org-context";

const router = Router();

router.use(validateOrgContext);

/**
 * Get All Vendors
 * GET /api/supply-chain/vendors
 */
router.get("/vendors", async (req: Request, res: Response) => {
  try {
    const vendors = await supplyChainManager.getVendors();
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

/**
 * Get Vendor by ID
 * GET /api/supply-chain/vendors/:vendorId
 */
router.get("/vendors/:vendorId", async (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    const vendor = await supplyChainManager.getVendor(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
});

/**
 * Create Procurement Order
 * POST /api/supply-chain/orders
 */
router.post(
  "/orders",
  requireRole("buyer", "manager", "admin"),
  async (req: Request, res: Response) => {
    try {
      const { vendorId, items } = req.body;
      const orderId = await supplyChainManager.createProcurementOrder(
        vendorId,
        items as ProcurementItem[],
      );
      res.status(201).json({ orderId, message: "Order created" });
    } catch (error) {
      res.status(400).json({ error: "Failed to create order" });
    }
  },
);

/**
 * Approve Procurement Order
 * POST /api/supply-chain/orders/:orderId/approve
 */
router.post(
  "/orders/:orderId/approve",
  requireRole("manager", "admin"),
  async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      await supplyChainManager.approveProcurementOrder(orderId);
      res.json({ message: "Order approved" });
    } catch (error) {
      res.status(400).json({ error: "Failed to approve order" });
    }
  },
);

/**
 * Submit Procurement Order
 * POST /api/supply-chain/orders/:orderId/submit
 */
router.post(
  "/orders/:orderId/submit",
  requireRole("buyer", "admin"),
  async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      await supplyChainManager.submitProcurementOrder(orderId);
      res.json({ message: "Order submitted" });
    } catch (error) {
      res.status(400).json({ error: "Failed to submit order" });
    }
  },
);

/**
 * Get Procurement Orders
 * GET /api/supply-chain/orders?status=pending
 */
router.get("/orders", async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const orders = await supplyChainManager.getProcurementOrders(status);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

/**
 * Generate Inventory Forecasts
 * GET /api/supply-chain/forecasts/:outletId
 */
router.get("/forecasts/:outletId", async (req: Request, res: Response) => {
  try {
    const { outletId } = req.params;
    const forecasts =
      await supplyChainManager.generateInventoryForecasts(outletId);
    res.json(forecasts);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate forecasts" });
  }
});

/**
 * Optimize Logistics Routes
 * GET /api/supply-chain/logistics/routes
 */
router.get("/logistics/routes", async (req: Request, res: Response) => {
  try {
    const routes = await supplyChainManager.optimizeLogisticsRoutes();
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: "Failed to optimize routes" });
  }
});

/**
 * Get Supplier Performance
 * GET /api/supply-chain/suppliers/:vendorId/performance
 */
router.get(
  "/suppliers/:vendorId/performance",
  async (req: Request, res: Response) => {
    try {
      const { vendorId } = req.params;
      const performance =
        await supplyChainManager.getSupplierPerformance(vendorId);
      res.json(performance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supplier performance" });
    }
  },
);

/**
 * Get Commodity Prices
 * GET /api/supply-chain/commodities/prices
 */
router.get("/commodities/prices", async (req: Request, res: Response) => {
  try {
    const prices = await supplyChainManager.getCommodityPrices();
    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch commodity prices" });
  }
});

/**
 * Negotiate Vendor Terms
 * POST /api/supply-chain/vendors/:vendorId/negotiate
 */
router.post(
  "/vendors/:vendorId/negotiate",
  requireRole("manager", "admin"),
  async (req: Request, res: Response) => {
    try {
      const { vendorId } = req.params;
      const { proposedTerms } = req.body;
      await supplyChainManager.negotiateVendorTerms(vendorId, proposedTerms);
      res.json({ message: "Terms negotiated successfully" });
    } catch (error) {
      res.status(400).json({ error: "Failed to negotiate terms" });
    }
  },
);

/**
 * Get Supply Chain Metrics
 * GET /api/supply-chain/metrics
 */
router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const metrics = await supplyChainManager.getSupplyChainMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

export default router;
