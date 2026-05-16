/**
 * POS Integration API Routes
 * ==========================
 * 
 * REST API for POS Integration Service
 * 
 * Endpoints:
 * - POST /api/pos/transaction - Process POS transaction
 * - POST /api/pos/webhook/toast - Toast webhook
 * - POST /api/pos/webhook/square - Square webhook
 * - POST /api/pos/menu-mapping - Create/update menu-to-recipe mapping
 * - GET /api/pos/menu-costs - Get real-time menu item costs
 * - GET /api/pos/sales-mix - Get sales mix analysis
 * - GET /api/pos/stats - Get POS integration statistics
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { posIntegrationService } from '../services/pos-integration-service.js';
import { getOrgId } from '../lib/org-resolver.js';
import { logger } from '../lib/logger.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const menuMappingSchema = z.object({
  menuItemId: z.string(),
  menuItemName: z.string(),
  recipeId: z.string().uuid(),
  recipeName: z.string(),
  portionSize: z.number().positive(),
  portionUnit: z.string(),
  modifierMappings: z.array(z.object({
    modifierId: z.string(),
    modifierName: z.string(),
    ingredientAdjustments: z.array(z.object({
      ingredientId: z.string().uuid(),
      ingredientName: z.string(),
      quantityChange: z.number(),
      unit: z.string(),
    })),
  })).optional().default([]),
});

// ============================================================================
// TRANSACTION PROCESSING
// ============================================================================

/**
 * POST /api/pos/transaction
 * Process a POS transaction
 */
router.post('/transaction', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const transaction = { ...req.body, orgId };

    const result = await posIntegrationService.processTransaction(transaction);

    return res.json({
      success: result.success,
      data: {
        inventoryUpdates: result.inventoryUpdates,
        costCalculations: result.costCalculations,
        warnings: result.warnings,
      },
    });
  } catch (error: any) {
    logger.error('[POS API] Transaction processing failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// WEBHOOKS
// ============================================================================

/**
 * POST /api/pos/webhook/toast
 * Toast POS webhook endpoint
 */
router.post('/webhook/toast', async (req: Request, res: Response) => {
  try {
    const { outletId } = req.query;
    
    if (!outletId) {
      return res.status(400).json({ error: 'outletId query parameter required' });
    }

    const transaction = await posIntegrationService.processToastWebhook(req.body, outletId as string);
    
    // Set orgId from adapter config
    const adapter = posIntegrationService.getAdapter(outletId as string);
    if (adapter) {
      // Process the transaction
      const result = await posIntegrationService.processTransaction(transaction);
      
      return res.json({
        success: result.success,
        transactionId: transaction.id,
      });
    }

    return res.status(404).json({ error: 'Outlet not configured for Toast' });
  } catch (error: any) {
    logger.error('[POS API] Toast webhook failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/pos/webhook/square
 * Square POS webhook endpoint
 */
router.post('/webhook/square', async (req: Request, res: Response) => {
  try {
    const { outletId } = req.query;
    
    if (!outletId) {
      return res.status(400).json({ error: 'outletId query parameter required' });
    }

    const transaction = await posIntegrationService.processSquareWebhook(req.body, outletId as string);
    
    const result = await posIntegrationService.processTransaction(transaction);
    
    return res.json({
      success: result.success,
      transactionId: transaction.id,
    });
  } catch (error: any) {
    logger.error('[POS API] Square webhook failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// MENU MAPPING
// ============================================================================

/**
 * POST /api/pos/menu-mapping
 * Create or update menu-to-recipe mapping
 */
router.post('/menu-mapping', async (req: Request, res: Response) => {
  try {
    const parsed = menuMappingSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    posIntegrationService.mapMenuItemToRecipe(parsed.data);

    return res.json({ success: true });
  } catch (error: any) {
    logger.error('[POS API] Menu mapping failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/pos/menu-mapping/bulk
 * Bulk import menu-to-recipe mappings
 */
router.post('/menu-mapping/bulk', async (req: Request, res: Response) => {
  try {
    const { mappings } = req.body;

    if (!Array.isArray(mappings)) {
      return res.status(400).json({ error: 'mappings array required' });
    }

    const count = posIntegrationService.importMenuMappings(mappings);

    return res.json({
      success: true,
      imported: count,
    });
  } catch (error: any) {
    logger.error('[POS API] Bulk menu mapping failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// COST TRACKING
// ============================================================================

/**
 * GET /api/pos/menu-costs
 * Get real-time menu item costs
 */
router.get('/menu-costs', async (req: Request, res: Response) => {
  try {
    const { outletId } = req.query;

    const costs = posIntegrationService.getMenuItemCosts(outletId as string | undefined);

    return res.json({
      success: true,
      data: costs,
      total: costs.length,
    });
  } catch (error: any) {
    logger.error('[POS API] Get menu costs failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/pos/menu-costs/:menuItemId
 * Get cost for specific menu item
 */
router.get('/menu-costs/:menuItemId', async (req: Request, res: Response) => {
  try {
    const cost = posIntegrationService.getMenuItemCost(req.params.menuItemId);

    if (!cost) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    return res.json({
      success: true,
      data: cost,
    });
  } catch (error: any) {
    logger.error('[POS API] Get menu item cost failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * GET /api/pos/sales-mix
 * Get sales mix analysis
 */
router.get('/sales-mix', async (req: Request, res: Response) => {
  try {
    const { outletId, startDate, endDate } = req.query;

    if (!outletId || !startDate || !endDate) {
      return res.status(400).json({
        error: 'outletId, startDate, and endDate required',
      });
    }

    const analysis = await posIntegrationService.generateSalesMixAnalysis(
      outletId as string,
      startDate as string,
      endDate as string
    );

    return res.json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    logger.error('[POS API] Sales mix analysis failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/pos/stats
 * Get POS integration statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = posIntegrationService.getStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('[POS API] Get stats failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
