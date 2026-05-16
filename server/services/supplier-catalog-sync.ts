/**
 * Supplier Catalog Sync Service
 * 
 * Backend service for synchronizing supplier catalogs
 * Runs as scheduled jobs and provides API endpoints
 */

import { Router, Request, Response } from 'express';
import type { SupplierAPI, SupplierCatalogItem, SupplierPricingUpdate } from '../../client/modules/PurchasingReceiving/client/services/supplier-api-integration';
// D17d · base URLs come from the central registry so a region pivot
// or staging swap is a single env change, not 8 file edits.
import { getIntegrationBaseUrl } from '../integrations/endpoints';

const router = Router();

// In-memory storage (in production, use database)
const supplierCatalogs: Map<string, SupplierCatalogItem[]> = new Map();
const syncStatus: Map<string, { lastSync: string; status: 'success' | 'error'; error?: string }> = new Map();

/**
 * GET /api/suppliers
 * List all registered suppliers
 */
router.get('/suppliers', async (req: Request, res: Response) => {
  try {
    // In production, fetch from database
    const suppliers: SupplierAPI[] = [
      {
        id: 'sysco',
        name: 'Sysco',
        apiEndpoint: getIntegrationBaseUrl('sysco'),
        authType: 'oauth2',
        authConfig: {
          clientId: process.env.SYSCO_CLIENT_ID || '',
          clientSecret: process.env.SYSCO_CLIENT_SECRET || '',
          tokenUrl: `${getIntegrationBaseUrl('sysco').replace(/\/v1$/, '')}/oauth/token`,
        },
        capabilities: {
          pricing: true,
          catalog: true,
          nutritional: true,
          ordering: true,
          inventory: true,
        },
        syncFrequency: 'daily',
        status: 'inactive',
      },
      {
        id: 'usfoods',
        name: 'US Foods',
        apiEndpoint: `${getIntegrationBaseUrl('usfoods')}/v1`,
        authType: 'oauth2',
        authConfig: {
          clientId: process.env.USFOODS_CLIENT_ID || '',
          clientSecret: process.env.USFOODS_CLIENT_SECRET || '',
          tokenUrl: `${getIntegrationBaseUrl('usfoods')}/oauth/token`,
        },
        capabilities: {
          pricing: true,
          catalog: true,
          nutritional: true,
          ordering: true,
          inventory: false,
        },
        syncFrequency: 'daily',
        status: 'inactive',
      },
    ];

    res.json({ success: true, data: suppliers });
  } catch (error: any) {
    console.error('[SupplierSync] Error fetching suppliers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/suppliers/:id/sync
 * Trigger manual catalog sync for a supplier
 */
router.post('/suppliers/:id/sync', async (req: Request, res: Response) => {
  try {
    const supplierId = req.params.id;
    
    console.log(`[SupplierSync] Starting sync for supplier: ${supplierId}`);
    
    // In production, this would:
    // 1. Authenticate with supplier API
    // 2. Fetch catalog data
    // 3. Store in database
    // 4. Update inventory items
    
    // Mock implementation
    const catalog: SupplierCatalogItem[] = [];
    
    supplierCatalogs.set(supplierId, catalog);
    syncStatus.set(supplierId, {
      lastSync: new Date().toISOString(),
      status: 'success',
    });

    res.json({
      success: true,
      message: `Catalog sync initiated for ${supplierId}`,
      itemCount: catalog.length,
      lastSync: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(`[SupplierSync] Sync failed for ${req.params.id}:`, error);
    syncStatus.set(req.params.id, {
      lastSync: new Date().toISOString(),
      status: 'error',
      error: error.message,
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/suppliers/:id/catalog
 * Get supplier catalog
 */
router.get('/suppliers/:id/catalog', async (req: Request, res: Response) => {
  try {
    const supplierId = req.params.id;
    const catalog = supplierCatalogs.get(supplierId) || [];
    
    // Support search query
    const query = req.query.q as string | undefined;
    let filtered = catalog;
    
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = catalog.filter(item =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.sku.toLowerCase().includes(lowerQuery) ||
        item.barcode?.toLowerCase().includes(lowerQuery) ||
        item.gtin?.toLowerCase().includes(lowerQuery)
      );
    }

    res.json({
      success: true,
      data: filtered,
      total: catalog.length,
      filtered: filtered.length,
    });
  } catch (error: any) {
    console.error(`[SupplierSync] Error fetching catalog:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/suppliers/:id/pricing-update
 * Update pricing from invoice or supplier API
 */
router.post('/suppliers/:id/pricing-update', async (req: Request, res: Response) => {
  try {
    const supplierId = req.params.id;
    const update: SupplierPricingUpdate = req.body;

    if (update.supplierId !== supplierId) {
      return res.status(400).json({
        success: false,
        error: 'Supplier ID mismatch',
      });
    }

    console.log(`[SupplierSync] Updating pricing for ${supplierId}: ${update.items.length} items`);

    // Update catalog prices
    const catalog = supplierCatalogs.get(supplierId) || [];
    for (const item of update.items) {
      const catalogItem = catalog.find(c => c.sku === item.sku);
      if (catalogItem) {
        catalogItem.price = item.price;
        catalogItem.priceDate = item.effectiveDate;
      }
    }

    // In production, also update inventory system
    // await inventoryService.updatePrices(update);

    res.json({
      success: true,
      message: `Updated ${update.items.length} prices`,
      updated: update.items.length,
    });
  } catch (error: any) {
    console.error(`[SupplierSync] Pricing update failed:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/suppliers/:id/pricing-history/:sku
 * Get pricing history for a specific SKU
 */
router.get('/suppliers/:id/pricing-history/:sku', async (req: Request, res: Response) => {
  try {
    const { id: supplierId, sku } = req.params;
    
    // In production, fetch from database
    // For now, return mock data
    const history = [
      { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), price: 10.50 },
      { date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), price: 10.75 },
      { date: new Date().toISOString(), price: 11.00 },
    ];

    res.json({
      success: true,
      data: history,
      supplierId,
      sku,
    });
  } catch (error: any) {
    console.error(`[SupplierSync] Error fetching pricing history:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/suppliers/:id/sync-status
 * Get sync status for a supplier
 */
router.get('/suppliers/:id/sync-status', async (req: Request, res: Response) => {
  try {
    const supplierId = req.params.id;
    const status = syncStatus.get(supplierId) || {
      lastSync: null,
      status: 'never_synced' as const,
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error(`[SupplierSync] Error fetching sync status:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
