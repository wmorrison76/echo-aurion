/**
 * POS Integration API Routes
 * 
 * Provides REST API endpoints for unified POS integration
 * - Configuration management
 * - Transaction syncing
 * - Menu synchronization
 * - Webhook handling
 * - Sales reporting
 */

import { Router, Request, Response } from 'express';
import { posIntegrationService } from '../services/pos-integration-layer.js';
import { logger } from '../lib/logger.js';
import { z } from 'zod';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const POSConfigSchema = z.object({
  org_id: z.string().uuid(),
  outlet_id: z.string().uuid().optional(),
  pos_type: z.enum(['toast', 'square', 'resy', 'opentable', 'lightspeed', 'margin_edge', 'other']),
  display_name: z.string().optional(),
  api_key: z.string(),
  api_secret: z.string().optional(),
  api_token: z.string().optional(),
  webhook_url: z.string().url().optional(),
  webhook_secret: z.string().optional(),
  sync_enabled: z.boolean().default(true),
  sync_frequency_minutes: z.number().int().positive().default(5),
  metadata: z.record(z.any()).optional(),
  active: z.boolean().default(true),
});

const SyncTransactionsSchema = z.object({
  org_id: z.string().uuid(),
  outlet_id: z.string().uuid().optional(),
  pos_type: z.enum(['toast', 'square', 'resy', 'opentable', 'lightspeed', 'margin_edge', 'other']).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

// ============================================================================
// CONFIGURATION ROUTES
// ============================================================================

/**
 * POST /api/pos/config
 * Create or update POS configuration
 */
router.post('/config', async (req: Request, res: Response) => {
  try {
    const validated = POSConfigSchema.parse(req.body);
    const config = await posIntegrationService.saveConfig(validated);
    
    logger.info('[POS Integration] Config saved', {
      org_id: validated.org_id,
      pos_type: validated.pos_type,
    });

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      logger.warn('[POS Integration] Invalid config data', { errors: error.errors });
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Invalid configuration data',
        errors: error.errors,
      });
    }

    logger.error('[POS Integration] Failed to save config', { error });
    res.status(500).json({
      success: false,
      error: 'CONFIG_SAVE_FAILED',
      message: error.message || 'Failed to save POS configuration',
    });
  }
});

/**
 * GET /api/pos/config
 * Get POS configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const { org_id, outlet_id, pos_type } = req.query;

    if (!org_id || typeof org_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'MISSING_ORG_ID',
        message: 'org_id query parameter is required',
      });
    }

    const config = await posIntegrationService.getConfig(
      org_id,
      outlet_id as string | undefined,
      pos_type as any
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'CONFIG_NOT_FOUND',
        message: 'POS configuration not found',
      });
    }

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    logger.error('[POS Integration] Failed to get config', { error });
    res.status(500).json({
      success: false,
      error: 'CONFIG_GET_FAILED',
      message: error.message || 'Failed to get POS configuration',
    });
  }
});

/**
 * POST /api/pos/test-connection
 * Test connection to POS system
 */
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { org_id, outlet_id, pos_type } = req.body;

    if (!org_id) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_ORG_ID',
        message: 'org_id is required',
      });
    }

    const connected = await posIntegrationService.testConnection(
      org_id,
      outlet_id,
      pos_type
    );

    res.status(200).json({
      success: true,
      connected,
    });
  } catch (error: any) {
    logger.error('[POS Integration] Connection test failed', { error });
    res.status(500).json({
      success: false,
      error: 'CONNECTION_TEST_FAILED',
      message: error.message || 'Failed to test POS connection',
    });
  }
});

// ============================================================================
// TRANSACTION ROUTES
// ============================================================================

/**
 * POST /api/pos/sync-transactions
 * Sync transactions from POS system
 */
router.post('/sync-transactions', async (req: Request, res: Response) => {
  try {
    const validated = SyncTransactionsSchema.parse(req.body);
    const { org_id, outlet_id, pos_type, start_date, end_date } = validated;

    const startDate = start_date ? new Date(start_date) : undefined;
    const endDate = end_date ? new Date(end_date) : undefined;

    const result = await posIntegrationService.syncTransactions(
      org_id,
      outlet_id,
      pos_type,
      startDate,
      endDate
    );

    logger.info('[POS Integration] Transactions synced', {
      org_id,
      result,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      logger.warn('[POS Integration] Invalid sync request', { errors: error.errors });
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Invalid sync request data',
        errors: error.errors,
      });
    }

    logger.error('[POS Integration] Sync failed', { error });
    res.status(500).json({
      success: false,
      error: 'SYNC_FAILED',
      message: error.message || 'Failed to sync transactions',
    });
  }
});

// ============================================================================
// WEBHOOK ROUTES
// ============================================================================

/**
 * POST /api/pos/webhook/:pos_type
 * Handle webhook from POS system
 */
router.post('/webhook/:pos_type', async (req: Request, res: Response) => {
  try {
    const { pos_type } = req.params;
    const { org_id } = req.query;
    const signature = req.headers['x-signature'] || req.headers['x-webhook-signature'] as string;

    if (!org_id || typeof org_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'MISSING_ORG_ID',
        message: 'org_id query parameter is required',
      });
    }

    const validPosTypes = ['toast', 'square', 'resy', 'opentable', 'lightspeed', 'margin_edge', 'other'];
    if (!validPosTypes.includes(pos_type)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_POS_TYPE',
        message: `Invalid POS type: ${pos_type}`,
      });
    }

    const transaction = await posIntegrationService.handleWebhook(
      org_id,
      pos_type as any,
      req.body,
      signature
    );

    logger.info('[POS Integration] Webhook processed', {
      org_id,
      pos_type,
      transaction_id: transaction?.id,
    });

    // Always return 200 to acknowledge webhook receipt
    res.status(200).json({
      success: true,
      processed: transaction !== null,
      transaction_id: transaction?.id,
    });
  } catch (error: any) {
    logger.error('[POS Integration] Webhook processing failed', { error });
    
    // Still return 200 to prevent webhook retries for invalid requests
    // Log error for investigation
    res.status(200).json({
      success: false,
      error: 'WEBHOOK_PROCESSING_FAILED',
      message: error.message || 'Failed to process webhook',
    });
  }
});

// ============================================================================
// MENU ROUTES
// ============================================================================

/**
 * GET /api/pos/menu
 * Pull menu from POS system
 */
router.get('/menu', async (req: Request, res: Response) => {
  try {
    const { org_id, outlet_id, pos_type } = req.query;

    if (!org_id || typeof org_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'MISSING_ORG_ID',
        message: 'org_id query parameter is required',
      });
    }

    const menu = await posIntegrationService.pullMenu(
      org_id,
      outlet_id as string | undefined,
      pos_type as any
    );

    res.status(200).json({
      success: true,
      data: menu,
      count: menu.length,
    });
  } catch (error: any) {
    logger.error('[POS Integration] Failed to pull menu', { error });
    res.status(500).json({
      success: false,
      error: 'MENU_PULL_FAILED',
      message: error.message || 'Failed to pull menu from POS system',
    });
  }
});

// ============================================================================
// SALES REPORT ROUTES
// ============================================================================

/**
 * GET /api/pos/sales-report
 * Get sales report from POS system
 */
router.get('/sales-report', async (req: Request, res: Response) => {
  try {
    const { org_id, outlet_id, pos_type, start_date, end_date } = req.query;

    if (!org_id || typeof org_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'MISSING_ORG_ID',
        message: 'org_id query parameter is required',
      });
    }

    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;

    const report = await posIntegrationService.getSalesReport(
      org_id,
      outlet_id as string | undefined,
      pos_type as any,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: report,
      count: report.length,
    });
  } catch (error: any) {
    logger.error('[POS Integration] Failed to get sales report', { error });
    res.status(500).json({
      success: false,
      error: 'SALES_REPORT_FAILED',
      message: error.message || 'Failed to get sales report from POS system',
    });
  }
});

export default router;
