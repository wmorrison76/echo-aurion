/**
 * Operations Core API Routes
 * ==========================
 * 
 * REST API for the Operations Core Engine
 * Connects Purchasing, Receiving, Inventory, Culinary, and Pastry
 * 
 * Endpoints:
 * - POST /api/operations/invoice/process - Process invoice and update inventory
 * - POST /api/operations/inventory/receive - Receive inventory
 * - POST /api/operations/inventory/consume - Consume inventory (production/waste)
 * - POST /api/operations/recipe/cost - Calculate recipe cost
 * - POST /api/operations/production/schedule - Schedule production
 * - POST /api/operations/production/complete - Complete production
 * - GET /api/operations/ingredients - List ingredients
 * - GET /api/operations/ingredients/low-stock - Get low stock ingredients
 * - GET /api/operations/po-suggestions - Get purchase order suggestions
 * - GET /api/operations/forecast-purchasing - Generate forecast purchasing
 * - GET /api/operations/events - Get operations events
 * - GET /api/operations/stats - Get engine statistics
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { operationsCoreEngine } from '../services/operations-core-engine.js';
import { getOrgId } from '../lib/org-resolver.js';
import { logger } from '../lib/logger.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const invoiceProcessSchema = z.object({
  invoiceId: z.string().uuid(),
  invoiceNumber: z.string().min(1),
  supplierId: z.string().uuid(),
  supplierName: z.string().min(1),
  invoiceDate: z.string().datetime().or(z.string()),
  lineItems: z.array(z.object({
    lineNumber: z.number().int().positive(),
    description: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0),
    sku: z.string().optional(),
    vendorProductCode: z.string().optional(),
    taxAmount: z.number().optional(),
  })),
  outletId: z.string().uuid().optional(),
});

const inventoryReceiveSchema = z.object({
  ingredientId: z.string().uuid(),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unitCost: z.number().min(0),
  referenceId: z.string(),
  outletId: z.string().uuid().optional(),
});

const inventoryConsumeSchema = z.object({
  ingredientId: z.string().uuid(),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  referenceType: z.enum(['recipe', 'production', 'waste', 'adjustment']),
  referenceId: z.string(),
  outletId: z.string().uuid().optional(),
});

const recipeCostSchema = z.object({
  recipeId: z.string().uuid(),
  ingredients: z.array(z.object({
    recipeId: z.string().uuid(),
    ingredientId: z.string().uuid(),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    preparation: z.string().optional(),
    isOptional: z.boolean().default(false),
    section: z.string().optional(),
    sortOrder: z.number().int().default(0),
  })),
  servings: z.number().int().positive().default(1),
});

const productionScheduleSchema = z.object({
  recipeId: z.string().uuid(),
  recipeName: z.string().min(1),
  quantity: z.number().int().positive(),
  scheduledDate: z.string(),
  outletId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  beoId: z.string().uuid().optional(),
});

const productionCompleteSchema = z.object({
  orderId: z.string().uuid(),
  actualQuantity: z.number().int().positive().optional(),
});

// ============================================================================
// INVOICE PROCESSING
// ============================================================================

/**
 * POST /api/operations/invoice/process
 * Process an invoice and flow through to inventory and recipe costing
 */
router.post('/invoice/process', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const parsed = invoiceProcessSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const result = await operationsCoreEngine.processInvoice({
      ...parsed.data,
      orgId,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    logger.error('[OperationsAPI] Invoice processing failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// INVENTORY MANAGEMENT
// ============================================================================

/**
 * POST /api/operations/inventory/receive
 * Receive inventory (from purchase/invoice)
 */
router.post('/inventory/receive', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const parsed = inventoryReceiveSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    await operationsCoreEngine.receiveInventory(
      parsed.data.ingredientId,
      parsed.data.quantity,
      parsed.data.unit,
      parsed.data.unitCost,
      parsed.data.referenceId,
      orgId,
      parsed.data.outletId
    );

    return res.json({ success: true });
  } catch (error: any) {
    logger.error('[OperationsAPI] Inventory receive failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/operations/inventory/consume
 * Consume inventory (production/waste/adjustment)
 */
router.post('/inventory/consume', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const parsed = inventoryConsumeSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const result = await operationsCoreEngine.consumeInventory(
      parsed.data.ingredientId,
      parsed.data.quantity,
      parsed.data.unit,
      parsed.data.referenceType,
      parsed.data.referenceId,
      orgId,
      parsed.data.outletId
    );

    return res.json({
      success: result.success,
      newStock: result.newStock,
      lowStockAlert: result.lowStockAlert,
    });
  } catch (error: any) {
    logger.error('[OperationsAPI] Inventory consume failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/operations/ingredients
 * List all ingredients for the organization
 */
router.get('/ingredients', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const outletId = req.query.outletId as string | undefined;

    const ingredients = operationsCoreEngine.listIngredients(orgId, outletId);

    return res.json({
      success: true,
      data: ingredients,
      total: ingredients.length,
    });
  } catch (error: any) {
    logger.error('[OperationsAPI] List ingredients failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/operations/ingredients/:id
 * Get a specific ingredient
 */
router.get('/ingredients/:id', async (req: Request, res: Response) => {
  try {
    const ingredient = operationsCoreEngine.getIngredient(req.params.id);

    if (!ingredient) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
      });
    }

    return res.json({
      success: true,
      data: ingredient,
    });
  } catch (error: any) {
    logger.error('[OperationsAPI] Get ingredient failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/operations/ingredients/low-stock
 * Get low stock ingredients
 */
router.get('/ingredients/low-stock', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const outletId = req.query.outletId as string | undefined;

    const ingredients = operationsCoreEngine.getLowStockIngredients(orgId, outletId);

    return res.json({
      success: true,
      data: ingredients,
      total: ingredients.length,
    });
  } catch (error: any) {
    logger.error('[OperationsAPI] Get low stock failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// RECIPE COSTING
// ============================================================================

/**
 * POST /api/operations/recipe/cost
 * Calculate recipe cost
 */
router.post('/recipe/cost', async (req: Request, res: Response) => {
  try {
    const parsed = recipeCostSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const result = await operationsCoreEngine.calculateRecipeCost(
      parsed.data.recipeId,
      parsed.data.ingredients,
      parsed.data.servings
    );

    return res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    logger.error('[OperationsAPI] Recipe cost calculation failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// PRODUCTION MANAGEMENT
// ============================================================================

/**
 * POST /api/operations/production/schedule
 * Schedule a production order
 */
router.post('/production/schedule', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const parsed = productionScheduleSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const order = await operationsCoreEngine.scheduleProduction(
      parsed.data.recipeId,
      parsed.data.recipeName,
      parsed.data.quantity,
      parsed.data.scheduledDate,
      orgId,
      parsed.data.outletId,
      parsed.data.eventId,
      parsed.data.beoId
    );

    return res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    logger.error('[OperationsAPI] Production scheduling failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/operations/production/complete
 * Complete a production order
 */
router.post('/production/complete', async (req: Request, res: Response) => {
  try {
    const parsed = productionCompleteSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    await operationsCoreEngine.completeProduction(
      parsed.data.orderId,
      parsed.data.actualQuantity
    );

    return res.json({ success: true });
  } catch (error: any) {
    logger.error('[OperationsAPI] Production completion failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// PURCHASING
// ============================================================================

/**
 * GET /api/operations/po-suggestions
 * Get purchase order suggestions
 */
router.get('/po-suggestions', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const outletId = req.query.outletId as string | undefined;

    const suggestions = operationsCoreEngine.getPOSuggestions(orgId, outletId);

    return res.json({
      success: true,
      data: suggestions,
      total: suggestions.length,
    });
  } catch (error: any) {
    logger.error('[OperationsAPI] Get PO suggestions failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/operations/forecast-purchasing
 * Generate forecast-based purchasing suggestions
 */
router.get('/forecast-purchasing', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { startDate, endDate, outletId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    const suggestions = await operationsCoreEngine.generateForecastPurchasing(
      startDate as string,
      endDate as string,
      orgId,
      outletId as string | undefined
    );

    return res.json({
      success: true,
      data: suggestions,
      total: suggestions.length,
    });
  } catch (error: any) {
    logger.error('[OperationsAPI] Forecast purchasing failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// EVENTS & STATS
// ============================================================================

/**
 * GET /api/operations/events
 * Get recent operations events
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);

    const events = operationsCoreEngine.getRecentEvents(orgId, limit);

    return res.json({
      success: true,
      data: events,
      total: events.length,
    });
  } catch (error: any) {
    logger.error('[OperationsAPI] Get events failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/operations/stats
 * Get engine statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = operationsCoreEngine.getStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('[OperationsAPI] Get stats failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
