/**
 * Barcode/GTIN Integration Service
 * 
 * Provides barcode scanning support for:
 * - Inventory management
 * - Recipe ingredient matching
 * - Product lookup (GS1, UPC, EAN)
 * - Automated data entry
 * 
 * Features:
 * - Barcode scanning API
 * - GTIN lookup and validation
 * - Product information retrieval
 * - Ingredient auto-matching
 * - Inventory updates via barcode
 */

import { logger } from '../lib/logger.js';
import { supabase } from '../lib/supabase.js';
import axios from 'axios';

/**
 * Barcode/GTIN Types
 */
export interface BarcodeScan {
  barcode: string;
  barcodeType: 'UPC' | 'EAN' | 'GTIN-13' | 'GTIN-14' | 'ITF-14' | 'CODE128' | 'CODE39';
  scannedAt: string;
  scannedBy?: string;
  deviceId?: string;
}

export interface ProductLookupResult {
  gtin: string;
  productName?: string;
  brand?: string;
  manufacturer?: string;
  description?: string;
  category?: string;
  unitOfMeasure?: string;
  netWeight?: number;
  netWeightUnit?: string;
  images?: string[];
  nutritionalInfo?: Record<string, any>;
  allergens?: string[];
  ingredients?: string[];
  source: 'internal' | 'gs1' | 'openfoodfacts' | 'usda' | 'unknown';
  confidence: number; // 0-1
}

export interface IngredientMatch {
  ingredientId?: string;
  ingredientName: string;
  matchConfidence: number; // 0-1
  matchedBarcode?: string;
  suggestedActions: Array<'create' | 'link' | 'update' | 'ignore'>;
}

/**
 * Barcode/GTIN Integration Service
 */
export class BarcodeGTINIntegrationService {
  private readonly GS1_API_KEY = process.env.GS1_API_KEY;
  private readonly OPENFOODFACTS_API = 'https://world.openfoodfacts.org/api/v0';
  private readonly USDA_API_KEY = process.env.USDA_API_KEY;

  /**
   * Lookup product by barcode/GTIN
   */
  async lookupProduct(barcode: string, orgId?: string): Promise<ProductLookupResult | null> {
    try {
      logger.info('[BarcodeGTIN] Looking up product', { barcode });

      // Validate and normalize barcode
      const normalizedBarcode = this.normalizeBarcode(barcode);
      const barcodeType = this.detectBarcodeType(normalizedBarcode);

      if (!barcodeType) {
        logger.warn('[BarcodeGTIN] Invalid barcode format', { barcode });
        return null;
      }

      // Check internal database first
      const internalProduct = await this.lookupInternal(normalizedBarcode, orgId);
      if (internalProduct) {
        logger.info('[BarcodeGTIN] Found in internal database', { barcode });
        return internalProduct;
      }

      // Try external APIs (in parallel for speed)
      const [gs1Result, openFoodFactsResult, usdaResult] = await Promise.allSettled([
        this.lookupGS1(normalizedBarcode),
        this.lookupOpenFoodFacts(normalizedBarcode),
        this.lookupUSDA(normalizedBarcode),
      ]);

      // Choose best result based on confidence and completeness
      const results: (ProductLookupResult | null)[] = [];
      
      if (gs1Result.status === 'fulfilled' && gs1Result.value) {
        results.push(gs1Result.value);
      }
      if (openFoodFactsResult.status === 'fulfilled' && openFoodFactsResult.value) {
        results.push(openFoodFactsResult.value);
      }
      if (usdaResult.status === 'fulfilled' && usdaResult.value) {
        results.push(usdaResult.value);
      }

      // Select best result (highest confidence and completeness)
      const bestResult = results.reduce((best, current) => {
        if (!current) return best;
        if (!best) return current;
        
        const currentScore = current.confidence * (current.productName ? 1.2 : 1) * (current.ingredients?.length || 0 > 0 ? 1.1 : 1);
        const bestScore = best.confidence * (best.productName ? 1.2 : 1) * (best.ingredients?.length || 0 > 0 ? 1.1 : 1);
        
        return currentScore > bestScore ? current : best;
      }, null as ProductLookupResult | null);

      // Store result in internal cache for future lookups
      if (bestResult) {
        await this.cacheProductLookup(normalizedBarcode, bestResult, orgId);
      }

      return bestResult || null;
    } catch (error) {
      logger.error('[BarcodeGTIN] Product lookup failed', { error, barcode });
      return null;
    }
  }

  /**
   * Match scanned product to recipe ingredient
   */
  async matchToIngredient(
    barcode: string,
    recipeId?: string,
    orgId?: string
  ): Promise<IngredientMatch[]> {
    try {
      // Lookup product
      const product = await this.lookupProduct(barcode, orgId);
      if (!product) {
        return [{
          ingredientName: `Unknown Product (${barcode})`,
          matchConfidence: 0,
          suggestedActions: ['create'],
        }];
      }

      // Search for matching ingredients in database
      const { data: ingredients } = await supabase
        .from('recipe_ingredients')
        .select('id, name, description')
        .eq('org_id', orgId || '')
        .or(`name.ilike.%${product.productName}%,description.ilike.%${product.productName}%`)
        .limit(10);

      // If recipe specified, also check recipe ingredients
      if (recipeId) {
        const { data: recipeIngredients } = await supabase
          .from('recipe_ingredients')
          .select('id, name')
          .eq('recipe_id', recipeId)
          .eq('org_id', orgId || '')
          .limit(20);

        // Match against recipe ingredients with higher weight
        const matches: IngredientMatch[] = [];
        
        for (const ingredient of recipeIngredients || []) {
          const similarity = this.calculateStringSimilarity(
            product.productName?.toLowerCase() || '',
            ingredient.name.toLowerCase()
          );
          
          if (similarity > 0.6) {
            matches.push({
              ingredientId: ingredient.id,
              ingredientName: ingredient.name,
              matchConfidence: similarity,
              matchedBarcode: barcode,
              suggestedActions: similarity > 0.8 ? ['link'] : ['update', 'link'],
            });
          }
        }

        if (matches.length > 0) {
          return matches.sort((a, b) => b.matchConfidence - a.matchConfidence);
        }
      }

      // Match against all ingredients
      const matches: IngredientMatch[] = [];
      for (const ingredient of ingredients || []) {
        const similarity = this.calculateStringSimilarity(
          product.productName?.toLowerCase() || '',
          ingredient.name.toLowerCase()
        );
        
        if (similarity > 0.5) {
          matches.push({
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            matchConfidence: similarity,
            matchedBarcode: barcode,
            suggestedActions: similarity > 0.8 ? ['link'] : ['update', 'link'],
          });
        }
      }

      // If no matches, suggest creating new ingredient
      if (matches.length === 0 && product.productName) {
        return [{
          ingredientName: product.productName,
          matchConfidence: 0.3, // Low confidence but product exists
          matchedBarcode: barcode,
          suggestedActions: ['create'],
        }];
      }

      return matches.sort((a, b) => b.matchConfidence - a.matchConfidence);
    } catch (error) {
      logger.error('[BarcodeGTIN] Ingredient matching failed', { error, barcode });
      return [];
    }
  }

  /**
   * Update inventory from barcode scan
   */
  async updateInventoryFromBarcode(
    barcode: string,
    quantity: number,
    locationId: string,
    orgId: string,
    userId: string
  ): Promise<{ success: boolean; inventoryItemId?: string; message: string }> {
    try {
      // Lookup product
      const product = await this.lookupProduct(barcode, orgId);
      if (!product) {
        return {
          success: false,
          message: `Product not found for barcode: ${barcode}. Please add product manually.`,
        };
      }

      // Find or create inventory item
      let inventoryItemId: string | null = null;

      // Check if item exists by barcode
      const { data: existingItem } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('org_id', orgId)
        .eq('barcode', barcode)
        .maybeSingle();

      if (existingItem) {
        inventoryItemId = existingItem.id;
      } else {
        // Create new inventory item
        const { data: newItem, error: createError } = await supabase
          .from('inventory_items')
          .insert({
            org_id: orgId,
            name: product.productName || `Product ${barcode}`,
            description: product.description,
            barcode: barcode,
            gtin: barcode,
            category: product.category,
            unit_of_measure: product.unitOfMeasure || 'each',
            created_by: userId,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        inventoryItemId = newItem.id;
      }

      // Update inventory quantity
      const { data: inventoryLocation } = await supabase
        .from('inventory_locations')
        .select('id')
        .eq('item_id', inventoryItemId)
        .eq('location_id', locationId)
        .maybeSingle();

      if (inventoryLocation) {
        // Update existing inventory
        const { error: updateError } = await supabase
          .from('inventory_locations')
          .update({
            quantity_on_hand: (inventoryLocation.quantity_on_hand || 0) + quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', inventoryLocation.id);

        if (updateError) throw updateError;
      } else {
        // Create new inventory location entry
        const { error: insertError } = await supabase
          .from('inventory_locations')
          .insert({
            item_id: inventoryItemId,
            location_id: locationId,
            quantity_on_hand: quantity,
            org_id: orgId,
          });

        if (insertError) throw insertError;
      }

      // Log barcode scan
      await supabase.from('barcode_scans').insert({
        org_id: orgId,
        barcode: barcode,
        barcode_type: this.detectBarcodeType(barcode) || 'UPC',
        scanned_at: new Date().toISOString(),
        scanned_by: userId,
        inventory_item_id: inventoryItemId,
        quantity: quantity,
      });

      logger.info('[BarcodeGTIN] Inventory updated from barcode', {
        barcode,
        inventoryItemId,
        quantity,
      });

      return {
        success: true,
        inventoryItemId,
        message: `Inventory updated: ${product.productName || barcode} (+${quantity})`,
      };
    } catch (error) {
      logger.error('[BarcodeGTIN] Inventory update failed', { error, barcode });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Inventory update failed',
      };
    }
  }

  /**
   * Normalize barcode format
   */
  private normalizeBarcode(barcode: string): string {
    // Remove spaces and special characters
    return barcode.replace(/[\s-]/g, '');
  }

  /**
   * Detect barcode type from format (public for validation endpoint)
   */
  detectBarcodeType(barcode: string): BarcodeScan['barcodeType'] | null {
    const normalized = this.normalizeBarcode(barcode);

    // UPC-A: 12 digits
    if (/^\d{12}$/.test(normalized)) {
      return 'UPC';
    }

    // EAN-13: 13 digits
    if (/^\d{13}$/.test(normalized)) {
      return 'EAN';
    }

    // GTIN-14: 14 digits
    if (/^\d{14}$/.test(normalized)) {
      return 'GTIN-14';
    }

    // ITF-14: 14 digits (different format)
    if (/^\d{14}$/.test(normalized)) {
      return 'ITF-14';
    }

    // CODE128: variable length alphanumeric
    if (/^[A-Z0-9]{4,}$/i.test(normalized)) {
      return 'CODE128';
    }

    // CODE39: alphanumeric with *
    if (/^[A-Z0-9*\-.$ ]{1,}$/i.test(normalized)) {
      return 'CODE39';
    }

    return null;
  }

  /**
   * Lookup product in internal database
   */
  private async lookupInternal(barcode: string, orgId?: string): Promise<ProductLookupResult | null> {
    try {
      let query = supabase
        .from('inventory_items')
        .select('id, name, description, category, barcode, gtin, metadata')
        .eq('barcode', barcode)
        .or('gtin.eq.' + barcode);

      if (orgId) {
        query = query.eq('org_id', orgId);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) return null;

      return {
        gtin: barcode,
        productName: data.name,
        description: data.description,
        category: data.category,
        source: 'internal',
        confidence: 1.0,
        metadata: data.metadata || {},
      };
    } catch (error) {
      logger.warn('[BarcodeGTIN] Internal lookup failed', { error });
      return null;
    }
  }

  /**
   * Lookup product via GS1 API
   */
  private async lookupGS1(barcode: string): Promise<ProductLookupResult | null> {
    try {
      if (!this.GS1_API_KEY) {
        logger.debug('[BarcodeGTIN] GS1 API key not configured');
        return null;
      }

      const response = await axios.get(`https://api.gs1.org/v1/product/${barcode}`, {
        headers: {
          'X-API-Key': this.GS1_API_KEY,
        },
        timeout: 5000,
      });

      if (response.data && response.data.product) {
        const product = response.data.product;
        return {
          gtin: barcode,
          productName: product.name,
          brand: product.brand?.name,
          manufacturer: product.manufacturer?.name,
          description: product.description,
          category: product.category?.name,
          source: 'gs1',
          confidence: 0.9,
        };
      }

      return null;
    } catch (error) {
      logger.debug('[BarcodeGTIN] GS1 lookup failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  /**
   * Lookup product via OpenFoodFacts API (free, no API key required)
   */
  private async lookupOpenFoodFacts(barcode: string): Promise<ProductLookupResult | null> {
    try {
      const response = await axios.get(`${this.OPENFOODFACTS_API}/product/${barcode}.json`, {
        timeout: 5000,
      });

      if (response.data && response.data.status === 1 && response.data.product) {
        const product = response.data.product;
        
        return {
          gtin: barcode,
          productName: product.product_name || product.product_name_en,
          brand: product.brands,
          description: product.generic_name || product.generic_name_en,
          category: product.categories,
          images: product.image_url ? [product.image_url] : [],
          nutritionalInfo: product.nutriments ? {
            calories: product.nutriments.energy_kcal_100g,
            protein: product.nutriments.proteins_100g,
            carbs: product.nutriments.carbohydrates_100g,
            fat: product.nutriments.fat_100g,
            fiber: product.nutriments.fiber_100g,
          } : undefined,
          allergens: product.allergens?.split(',') || [],
          ingredients: product.ingredients_text?.split(',').map((i: string) => i.trim()) || [],
          source: 'openfoodfacts',
          confidence: 0.8,
        };
      }

      return null;
    } catch (error) {
      logger.debug('[BarcodeGTIN] OpenFoodFacts lookup failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  /**
   * Lookup product via USDA FoodData Central (for food products)
   */
  private async lookupUSDA(barcode: string): Promise<ProductLookupResult | null> {
    try {
      // USDA FoodData Central doesn't have direct barcode lookup
      // This would need to search by product name if available
      // For now, return null - could be enhanced with product name search
      return null;
    } catch (error) {
      logger.debug('[BarcodeGTIN] USDA lookup failed', { error });
      return null;
    }
  }

  /**
   * Cache product lookup result for future use
   */
  private async cacheProductLookup(
    barcode: string,
    product: ProductLookupResult,
    orgId?: string
  ): Promise<void> {
    try {
      await supabase.from('barcode_product_cache').upsert({
        barcode: barcode,
        org_id: orgId || null,
        gtin: product.gtin,
        product_name: product.productName,
        brand: product.brand,
        manufacturer: product.manufacturer,
        description: product.description,
        category: product.category,
        unit_of_measure: product.unitOfMeasure,
        metadata: {
          nutritionalInfo: product.nutritionalInfo,
          allergens: product.allergens,
          ingredients: product.ingredients,
          images: product.images,
          source: product.source,
          confidence: product.confidence,
        },
        cached_at: new Date().toISOString(),
      }, {
        onConflict: 'barcode,org_id',
      });
    } catch (error) {
      logger.warn('[BarcodeGTIN] Failed to cache product lookup', { error });
      // Don't throw - caching is non-critical
    }
  }

  /**
   * Calculate string similarity (Levenshtein distance-based)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    const similarity = (longer.length - distance) / longer.length;

    // Boost score for substring matches
    if (longer.includes(shorter)) {
      return Math.min(1, similarity + 0.2);
    }

    return similarity;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Validate barcode checksum (UPC/EAN)
   */
  validateBarcodeChecksum(barcode: string): boolean {
    const normalized = this.normalizeBarcode(barcode);
    const type = this.detectBarcodeType(normalized);

    if (type === 'UPC' || type === 'EAN') {
      const digits = normalized.split('').map(Number);
      const checksum = digits.pop() || 0;

      let sum = 0;
      for (let i = 0; i < digits.length; i++) {
        const multiplier = i % 2 === 0 ? 3 : 1;
        sum += digits[i] * multiplier;
      }

      const calculatedChecksum = (10 - (sum % 10)) % 10;
      return calculatedChecksum === checksum;
    }

    // Other barcode types don't have standard checksums
    return true;
  }

  /**
   * Get barcode scan history
   */
  async getScanHistory(
    orgId: string,
    limit: number = 50,
    startDate?: string,
    endDate?: string
  ): Promise<BarcodeScan[]> {
    try {
      let query = supabase
        .from('barcode_scans')
        .select('*')
        .eq('org_id', orgId)
        .order('scanned_at', { ascending: false })
        .limit(limit);

      if (startDate) {
        query = query.gte('scanned_at', startDate);
      }
      if (endDate) {
        query = query.lte('scanned_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row: any) => ({
        barcode: row.barcode,
        barcodeType: row.barcode_type,
        scannedAt: row.scanned_at,
        scannedBy: row.scanned_by,
        deviceId: row.device_id,
      }));
    } catch (error) {
      logger.error('[BarcodeGTIN] Failed to get scan history', { error });
      return [];
    }
  }
}

export const barcodeGTINIntegrationService = new BarcodeGTINIntegrationService();
