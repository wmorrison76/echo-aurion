/**
 * GTIN Lookup Service
 * 
 * Provides GTIN (Global Trade Item Number) lookup functionality
 * Integrates with GS1 GDSN and other GTIN databases
 */

import { Router, Request, Response } from 'express';

const router = Router();

export interface GTINProduct {
  gtin: string;
  name: string;
  brand?: string;
  description?: string;
  category?: string;
  nutritional?: {
    calories?: number;
    totalFat?: number;
    sodium?: number;
    totalCarbohydrates?: number;
    protein?: number;
    servingSize?: string;
    allergens?: string[];
    ingredients?: string[];
  };
  images?: string[];
  barcode?: string;
  unit?: string;
  packSize?: string;
}

// In-memory cache (in production, use Redis or database)
const gtinCache: Map<string, GTINProduct> = new Map();

/**
 * GET /api/gtin/:code
 * Lookup product by GTIN
 */
router.get('/gtin/:code', async (req: Request, res: Response) => {
  try {
    const gtin = req.params.code.trim();
    
    // Validate GTIN format (8, 12, 13, or 14 digits)
    if (!/^\d{8,14}$/.test(gtin)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GTIN format. Must be 8-14 digits.',
      });
    }

    // Check cache first
    const cached = gtinCache.get(gtin);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        source: 'cache',
      });
    }

    // Lookup from external sources
    const product = await lookupGTIN(gtin);
    
    if (product) {
      // Cache for 30 days
      gtinCache.set(gtin, product);
      
      res.json({
        success: true,
        data: product,
        source: 'external',
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'GTIN not found',
        gtin,
      });
    }
  } catch (error: any) {
    console.error(`[GTINLookup] Error looking up GTIN ${req.params.code}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/gtin/batch-lookup
 * Batch lookup multiple GTINs
 */
router.post('/gtin/batch-lookup', async (req: Request, res: Response) => {
  try {
    const { gtins }: { gtins: string[] } = req.body;

    if (!Array.isArray(gtins) || gtins.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'gtins must be a non-empty array',
      });
    }

    if (gtins.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 GTINs per batch',
      });
    }

    const results: Array<{ gtin: string; product: GTINProduct | null; source: string }> = [];

    for (const gtin of gtins) {
      // Check cache
      const cached = gtinCache.get(gtin);
      if (cached) {
        results.push({ gtin, product: cached, source: 'cache' });
        continue;
      }

      // Lookup
      const product = await lookupGTIN(gtin);
      if (product) {
        gtinCache.set(gtin, product);
        results.push({ gtin, product, source: 'external' });
      } else {
        results.push({ gtin, product: null, source: 'not_found' });
      }
    }

    res.json({
      success: true,
      data: results,
      total: results.length,
      found: results.filter(r => r.product !== null).length,
    });
  } catch (error: any) {
    console.error('[GTINLookup] Batch lookup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/gtin/:code/nutritional
 * Get nutritional data for a GTIN
 */
router.get('/gtin/:code/nutritional', async (req: Request, res: Response) => {
  try {
    const gtin = req.params.code.trim();
    
    // Get product (from cache or lookup)
    let product = gtinCache.get(gtin);
    if (!product) {
      product = await lookupGTIN(gtin);
      if (product) {
        gtinCache.set(gtin, product);
      }
    }

    if (!product || !product.nutritional) {
      return res.status(404).json({
        success: false,
        error: 'Nutritional data not available for this GTIN',
      });
    }

    res.json({
      success: true,
      data: product.nutritional,
      gtin,
    });
  } catch (error: any) {
    console.error(`[GTINLookup] Error fetching nutritional data:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Lookup GTIN from external sources
 */
async function lookupGTIN(gtin: string): Promise<GTINProduct | null> {
  // In production, this would:
  // 1. Try GS1 GDSN API
  // 2. Try Open Product Data API
  // 3. Try supplier-specific APIs
  // 4. Try internal database
  
  // Mock implementation for now
  // In production:
  // 
  // try {
  //   // Try GS1 GDSN
  //   const gs1Response = await fetch(`https://api.gs1.org/v1/products/${gtin}`, {
  //     headers: { 'Authorization': `Bearer ${process.env.GS1_API_KEY}` }
  //   });
  //   if (gs1Response.ok) {
  //     const data = await gs1Response.json();
  //     return mapGS1ToProduct(data);
  //   }
  // } catch (error) {
  //   console.warn('[GTINLookup] GS1 lookup failed:', error);
  // }
  //
  // try {
  //   // Try Open Product Data
  //   const opdResponse = await fetch(`https://world.openproductdata.org/api/v0/product/${gtin}`);
  //   if (opdResponse.ok) {
  //     const data = await opdResponse.json();
  //     return mapOPDToProduct(data);
  //   }
  // } catch (error) {
  //   console.warn('[GTINLookup] OPD lookup failed:', error);
  // }

  // For now, return null (not found)
  return null;
}

/**
 * Map GS1 GDSN data to our product format
 */
function mapGS1ToProduct(data: any): GTINProduct {
  return {
    gtin: data.gtin || '',
    name: data.productName || data.description || '',
    brand: data.brandName,
    description: data.description,
    category: data.category,
    nutritional: data.nutritionalInformation ? {
      calories: data.nutritionalInformation.calories,
      totalFat: data.nutritionalInformation.totalFat,
      sodium: data.nutritionalInformation.sodium,
      totalCarbohydrates: data.nutritionalInformation.totalCarbohydrates,
      protein: data.nutritionalInformation.protein,
      servingSize: data.nutritionalInformation.servingSize,
      allergens: data.nutritionalInformation.allergens,
      ingredients: data.nutritionalInformation.ingredients,
    } : undefined,
    images: data.images,
    barcode: data.gtin,
    unit: data.unitOfMeasure,
    packSize: data.packSize,
  };
}

/**
 * Map Open Product Data to our product format
 */
function mapOPDToProduct(data: any): GTINProduct {
  return {
    gtin: data.code || '',
    name: data.product_name || '',
    brand: data.brands,
    description: data.generic_name,
    category: data.categories,
    nutritional: data.nutriments ? {
      calories: data.nutriments.energy_kcal_100g,
      totalFat: data.nutriments.fat_100g,
      sodium: data.nutriments.sodium_100g,
      totalCarbohydrates: data.nutriments.carbohydrates_100g,
      protein: data.nutriments.proteins_100g,
      servingSize: data.serving_size,
      allergens: data.allergens_tags,
      ingredients: data.ingredients_text ? [data.ingredients_text] : undefined,
    } : undefined,
    images: data.image_url ? [data.image_url] : undefined,
    barcode: data.code,
  };
}

export default router;
