/**
 * Module Integration API Routes
 * Provides endpoints for module-to-module direct integrations
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { basicAuthMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";
import {
  InventoryPurchasingBridge,
  ScheduleInventoryBridge,
  MaestroInventoryBridge,
  CulinaryInventoryBridge,
  POSModuleBridge,
  getModuleIntegrations,
} from "../services/module-integration-bridge";

const router = Router();
router.use(basicAuthMiddleware);

/**
 * GET /api/module-integration/list
 * Get all module integrations
 */
router.get("/list", async (req: Request, res: Response) => {
  try {
    const integrations = getModuleIntegrations();
    res.json({ integrations });
  } catch (error) {
    logger.error("Failed to get module integrations", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/module-integration/inventory-purchasing/notify-reorder
 * Notify Purchasing when inventory needs reorder
 */
router.post("/inventory-purchasing/notify-reorder", async (req: Request, res: Response) => {
  try {
    const { organizationId, itemId, currentStock, parLevel, recommendedQty } = req.body;
    
    if (!organizationId || !itemId) {
      return res.status(400).json({ error: "organizationId and itemId required" });
    }

    const result = await InventoryPurchasingBridge.notifyPurchasingForReorder(
      organizationId,
      itemId,
      currentStock,
      parLevel,
      recommendedQty
    );

    res.json(result);
  } catch (error) {
    logger.error("Failed to notify purchasing for reorder", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/module-integration/inventory-purchasing/notify-receipt
 * Notify Inventory when purchase order is received
 */
router.post("/inventory-purchasing/notify-receipt", async (req: Request, res: Response) => {
  try {
    const { organizationId, poId, itemId, qtyReceived } = req.body;
    
    if (!organizationId || !poId || !itemId) {
      return res.status(400).json({ error: "organizationId, poId, and itemId required" });
    }

    const result = await InventoryPurchasingBridge.notifyInventoryOfReceipt(
      organizationId,
      poId,
      itemId,
      qtyReceived
    );

    res.json(result);
  } catch (error) {
    logger.error("Failed to notify inventory of receipt", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/module-integration/schedule-inventory/notify-labor-cost
 * Notify Inventory of labor cost changes from Schedule
 */
router.post("/schedule-inventory/notify-labor-cost", async (req: Request, res: Response) => {
  try {
    const { organizationId, outletId, period, laborCost } = req.body;
    
    if (!organizationId || !outletId || !period) {
      return res.status(400).json({ error: "organizationId, outletId, and period required" });
    }

    const result = await ScheduleInventoryBridge.notifyInventoryOfLaborCost(
      organizationId,
      outletId,
      period,
      laborCost
    );

    res.json(result);
  } catch (error) {
    logger.error("Failed to notify inventory of labor cost", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/module-integration/schedule-inventory/check-availability
 * Check Inventory availability for Schedule planning
 */
router.post("/schedule-inventory/check-availability", async (req: Request, res: Response) => {
  try {
    const { organizationId, itemIds, requiredDate } = req.body;
    
    if (!organizationId || !itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ error: "organizationId and itemIds array required" });
    }

    const result = await ScheduleInventoryBridge.checkInventoryAvailability(
      organizationId,
      itemIds,
      new Date(requiredDate)
    );

    res.json(result);
  } catch (error) {
    logger.error("Failed to check inventory availability", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/module-integration/maestro-inventory/notify-beo-requirements
 * Notify Inventory of BEO production requirements
 */
router.post("/maestro-inventory/notify-beo-requirements", async (req: Request, res: Response) => {
  try {
    const { organizationId, beoId, itemRequirements } = req.body;
    
    if (!organizationId || !beoId || !itemRequirements) {
      return res.status(400).json({ error: "organizationId, beoId, and itemRequirements required" });
    }

    const result = await MaestroInventoryBridge.notifyInventoryOfBEORequirements(
      organizationId,
      beoId,
      itemRequirements
    );

    res.json(result);
  } catch (error) {
    logger.error("Failed to notify inventory of BEO requirements", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/module-integration/maestro-inventory/check-inventory
 * Check Inventory availability for Maestro BEO
 */
router.post("/maestro-inventory/check-inventory", async (req: Request, res: Response) => {
  try {
    const { organizationId, beoId, itemRequirements } = req.body;
    
    if (!organizationId || !beoId || !itemRequirements) {
      return res.status(400).json({ error: "organizationId, beoId, and itemRequirements required" });
    }

    const result = await MaestroInventoryBridge.checkInventoryForBEO(
      organizationId,
      beoId,
      itemRequirements
    );

    res.json(result);
  } catch (error) {
    logger.error("Failed to check inventory for BEO", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/module-integration/culinary-inventory/notify-recipe-cost
 * Notify Inventory of recipe cost changes
 */
router.post("/culinary-inventory/notify-recipe-cost", async (req: Request, res: Response) => {
  try {
    const { organizationId, recipeId, ingredientCosts } = req.body;
    
    if (!organizationId || !recipeId || !ingredientCosts) {
      return res.status(400).json({ error: "organizationId, recipeId, and ingredientCosts required" });
    }

    const result = await CulinaryInventoryBridge.notifyInventoryOfRecipeCost(
      organizationId,
      recipeId,
      ingredientCosts
    );

    res.json(result);
  } catch (error) {
    logger.error("Failed to notify inventory of recipe cost", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/module-integration/culinary-inventory/check-inventory
 * Check Inventory availability for recipe preparation
 */
router.post("/culinary-inventory/check-inventory", async (req: Request, res: Response) => {
  try {
    const { organizationId, recipeId, qty } = req.body;
    
    if (!organizationId || !recipeId) {
      return res.status(400).json({ error: "organizationId and recipeId required" });
    }

    const result = await CulinaryInventoryBridge.checkInventoryForRecipe(
      organizationId,
      recipeId,
      qty || 1
    );

    res.json(result);
  } catch (error) {
    logger.error("Failed to check inventory for recipe", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/module-integration/pos/notify-consumption
 * Notify Inventory of POS consumption
 */
router.post("/pos/notify-consumption", async (req: Request, res: Response) => {
  try {
    const { organizationId, outletId, items } = req.body;
    
    if (!organizationId || !outletId || !items) {
      return res.status(400).json({ error: "organizationId, outletId, and items required" });
    }

    const result = await POSModuleBridge.notifyInventoryOfConsumption(
      organizationId,
      outletId,
      items
    );

    res.json(result);
  } catch (error) {
    logger.error("Failed to notify inventory of consumption", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/module-integration/pos/notify-activity
 * Notify Schedule of POS activity
 */
router.post("/pos/notify-activity", async (req: Request, res: Response) => {
  try {
    const { organizationId, outletId, transactionCount, revenue } = req.body;
    
    if (!organizationId || !outletId) {
      return res.status(400).json({ error: "organizationId and outletId required" });
    }

    const result = await POSModuleBridge.notifyScheduleOfActivity(
      organizationId,
      outletId,
      transactionCount || 0,
      revenue || 0
    );

    res.json(result);
  } catch (error) {
    logger.error("Failed to notify schedule of activity", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
