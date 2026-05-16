/**
 * Barcode/GTIN Integration Service
 * Provides barcode scanning, GTIN lookup, and product matching capabilities
 * 
 * Features:
 * - Barcode scanning API
 * - GTIN lookup service (UPC, EAN, ISBN)
 * - Barcode-to-product matching
 * - Integration with inventory management
 * - Recipe ingredient matching
 * - Mobile barcode scanning support
 */

import { logger } from "../lib/logger";
import { supabase } from "../lib/supabase";

export interface BarcodeData {
  barcode: string;
  type: "UPC-A" | "UPC-E" | "EAN-8" | "EAN-13" | "GTIN-14" | "ISBN-10" | "ISBN-13" | "CODE-128" | "QR" | "UNKNOWN";
  format: string;
  raw: string;
}

export interface GTINLookupResult {
  gtin: string;
  productName?: string;
  brand?: string;
  category?: string;
  manufacturer?: string;
  description?: string;
  imageUrl?: string;
  verified: boolean;
  source: "internal" | "external" | "manual";
  matchedProductId?: string;
}

export interface ProductMatch {
  productId: string;
  productName: string;
  sku?: string;
  vendor?: string;
  confidence: number;
  matchType: "exact" | "fuzzy" | "suggested";
  matchedFields: string[];
}

/**
 * Barcode/GTIN Service
 */
export class BarcodeGTINService {
  /**
   * Parse barcode string and determine type
   */
  parseBarcode(barcodeString: string): BarcodeData {
    const cleaned = barcodeString.trim().replace(/[^0-9A-Za-z]/g, "");

    // Determine barcode type based on length and pattern
    let type: BarcodeData["type"] = "UNKNOWN";
    let format = cleaned;

    if (/^[0-9]{12}$/.test(cleaned)) {
      type = "UPC-A";
    } else if (/^[0-9]{8}$/.test(cleaned)) {
      type = "UPC-E";
    } else if (/^[0-9]{8}$/.test(cleaned)) {
      type = "EAN-8";
    } else if (/^[0-9]{13}$/.test(cleaned)) {
      type = "EAN-13";
    } else if (/^[0-9]{14}$/.test(cleaned)) {
      type = "GTIN-14";
    } else if (/^[0-9]{10}$/.test(cleaned) || /^[0-9]{9}X?$/.test(cleaned)) {
      type = "ISBN-10";
    } else if (/^978[0-9]{10}$/.test(cleaned) || /^979[0-9]{10}$/.test(cleaned)) {
      type = "ISBN-13";
    } else if (/^[0-9A-Za-z]{8,}$/.test(cleaned)) {
      type = "CODE-128";
    } else if (cleaned.length > 13) {
      // Could be QR code or other 2D barcode
      type = "QR";
    }

    return {
      barcode: cleaned,
      type,
      format: cleaned,
      raw: barcodeString,
    };
  }

  /**
   * Lookup GTIN in database (internal products)
   */
  async lookupGTINInternal(gtin: string, orgId: string): Promise<GTINLookupResult | null> {
    try {
      // Check inventory products table
      const { data: inventoryProduct, error: invError } = await supabase
        .from("inventory_items")
        .select("id, name, sku, vendor, category, description, image_url, gtin, barcode")
        .eq("org_id", orgId)
        .or(`gtin.eq.${gtin},barcode.eq.${gtin},sku.eq.${gtin}`)
        .limit(1)
        .maybeSingle();

      if (!invError && inventoryProduct) {
        return {
          gtin,
          productName: inventoryProduct.name,
          category: inventoryProduct.category || undefined,
          description: inventoryProduct.description || undefined,
          imageUrl: inventoryProduct.image_url || undefined,
          verified: true,
          source: "internal",
          matchedProductId: inventoryProduct.id,
        };
      }

      // Check recipe ingredients
      const { data: ingredient, error: ingError } = await supabase
        .from("recipe_ingredients")
        .select("id, name, category, gtin, barcode")
        .eq("org_id", orgId)
        .or(`gtin.eq.${gtin},barcode.eq.${gtin}`)
        .limit(1)
        .maybeSingle();

      if (!ingError && ingredient) {
        return {
          gtin,
          productName: ingredient.name,
          category: ingredient.category || undefined,
          verified: true,
          source: "internal",
          matchedProductId: ingredient.id,
        };
      }

      return null;
    } catch (error) {
      logger.error("[BarcodeGTIN] Error looking up GTIN internally", { error, gtin, orgId });
      return null;
    }
  }

  /**
   * Lookup GTIN using external API (Open Product Data, GS1, etc.)
   */
  async lookupGTINExternal(gtin: string): Promise<GTINLookupResult | null> {
    try {
      // Check if we have cached external lookup result
      const { data: cached, error: cacheError } = await supabase
        .from("gtin_lookup_cache")
        .select("*")
        .eq("gtin", gtin)
        .limit(1)
        .maybeSingle();

      if (!cacheError && cached && cached.cached_at) {
        // Use cached result if less than 30 days old
        const cacheAge = Date.now() - new Date(cached.cached_at).getTime();
        if (cacheAge < 30 * 24 * 60 * 60 * 1000) {
          return {
            gtin,
            productName: cached.product_name || undefined,
            brand: cached.brand || undefined,
            category: cached.category || undefined,
            manufacturer: cached.manufacturer || undefined,
            description: cached.description || undefined,
            imageUrl: cached.image_url || undefined,
            verified: cached.verified || false,
            source: "external",
          };
        }
      }

      // Try Open Product Data API (free tier available)
      // In production, use actual API key from environment
      const openProductDataApiKey = process.env.OPEN_PRODUCT_DATA_API_KEY;
      
      if (openProductDataApiKey) {
        try {
          const response = await fetch(`https://api.openproductdata.org/product/${gtin}`, {
            headers: {
              "Authorization": `Bearer ${openProductDataApiKey}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            
            // Cache the result
            await supabase.from("gtin_lookup_cache").upsert({
              gtin,
              product_name: data.name,
              brand: data.brand,
              category: data.categories?.[0],
              manufacturer: data.manufacturer,
              description: data.description,
              image_url: data.image_url,
              verified: true,
              cached_at: new Date().toISOString(),
            });

            return {
              gtin,
              productName: data.name,
              brand: data.brand,
              category: data.categories?.[0],
              manufacturer: data.manufacturer,
              description: data.description,
              imageUrl: data.image_url,
              verified: true,
              source: "external",
            };
          }
        } catch (apiError) {
          logger.warn("[BarcodeGTIN] External API lookup failed", { error: apiError, gtin });
        }
      }

      // Fallback: Try GS1 API if available
      // GS1 requires registration and API key
      const gs1ApiKey = process.env.GS1_API_KEY;
      if (gs1ApiKey) {
        try {
          const response = await fetch(`https://api.gs1.org/v1/product/${gtin}`, {
            headers: {
              "Authorization": `Bearer ${gs1ApiKey}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            
            // Cache the result
            await supabase.from("gtin_lookup_cache").upsert({
              gtin,
              product_name: data.productName,
              brand: data.brandName,
              category: data.category,
              manufacturer: data.manufacturerName,
              description: data.description,
              verified: true,
              cached_at: new Date().toISOString(),
            });

            return {
              gtin,
              productName: data.productName,
              brand: data.brandName,
              category: data.category,
              manufacturer: data.manufacturerName,
              description: data.description,
              verified: true,
              source: "external",
            };
          }
        } catch (gs1Error) {
          logger.warn("[BarcodeGTIN] GS1 API lookup failed", { error: gs1Error, gtin });
        }
      }

      return null;
    } catch (error) {
      logger.error("[BarcodeGTIN] Error looking up GTIN externally", { error, gtin });
      return null;
    }
  }

  /**
   * Complete GTIN lookup (internal first, then external)
   */
  async lookupGTIN(gtin: string, orgId: string): Promise<GTINLookupResult | null> {
    try {
      // Try internal lookup first
      const internalResult = await this.lookupGTINInternal(gtin, orgId);
      if (internalResult) {
        return internalResult;
      }

      // Try external lookup
      const externalResult = await this.lookupGTINExternal(gtin);
      if (externalResult) {
        // Check if external result matches any internal products (fuzzy match)
        const matches = await this.matchProductByName(externalResult.productName || "", orgId);
        if (matches.length > 0 && matches[0].confidence > 0.8) {
          externalResult.matchedProductId = matches[0].productId;
        }
        return externalResult;
      }

      return null;
    } catch (error) {
      logger.error("[BarcodeGTIN] Error in GTIN lookup", { error, gtin, orgId });
      return null;
    }
  }

  /**
   * Match product by name (fuzzy matching)
   */
  async matchProductByName(productName: string, orgId: string): Promise<ProductMatch[]> {
    try {
      const { data: products, error } = await supabase
        .from("inventory_items")
        .select("id, name, sku, vendor, category")
        .eq("org_id", orgId)
        .ilike("name", `%${productName}%`)
        .limit(20);

      if (error || !products || products.length === 0) {
        return [];
      }

      // Calculate confidence scores (simple fuzzy matching)
      return products.map((product) => {
        const nameLower = product.name.toLowerCase();
        const searchLower = productName.toLowerCase();
        
        let confidence = 0;
        const matchedFields: string[] = [];

        // Exact match
        if (nameLower === searchLower) {
          confidence = 1.0;
          matchedFields.push("name");
        } 
        // Contains match
        else if (nameLower.includes(searchLower) || searchLower.includes(nameLower)) {
          confidence = 0.7 + (Math.min(nameLower.length, searchLower.length) / Math.max(nameLower.length, searchLower.length)) * 0.2;
          matchedFields.push("name");
        }
        // Partial match
        else {
          const words = searchLower.split(/\s+/);
          const matchedWords = words.filter(word => nameLower.includes(word)).length;
          confidence = (matchedWords / words.length) * 0.6;
          if (matchedWords > 0) {
            matchedFields.push("name");
          }
        }

        // SKU match adds confidence
        if (product.sku && product.sku.toLowerCase().includes(searchLower)) {
          confidence = Math.min(1.0, confidence + 0.2);
          matchedFields.push("sku");
        }

        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku || undefined,
          vendor: product.vendor || undefined,
          confidence,
          matchType: confidence >= 0.9 ? "exact" : confidence >= 0.7 ? "fuzzy" : "suggested",
          matchedFields,
        };
      }).sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      logger.error("[BarcodeGTIN] Error matching product by name", { error, productName, orgId });
      return [];
    }
  }

  /**
   * Scan barcode and match to product
   */
  async scanBarcode(barcodeString: string, orgId: string): Promise<{
    barcode: BarcodeData;
    lookup: GTINLookupResult | null;
    matches: ProductMatch[];
  }> {
    try {
      // Parse barcode
      const barcode = this.parseBarcode(barcodeString);

      // Lookup GTIN (for standard barcodes)
      let lookup: GTINLookupResult | null = null;
      if (barcode.type !== "UNKNOWN" && barcode.type !== "QR" && barcode.type !== "CODE-128") {
        lookup = await this.lookupGTIN(barcode.barcode, orgId);
      }

      // Get product matches
      let matches: ProductMatch[] = [];
      if (lookup?.matchedProductId) {
        matches = [{
          productId: lookup.matchedProductId,
          productName: lookup.productName || barcode.barcode,
          confidence: 1.0,
          matchType: "exact",
          matchedFields: ["gtin"],
        }];
      } else {
        // Try direct barcode match in inventory
        const { data: directMatch, error: directError } = await supabase
          .from("inventory_items")
          .select("id, name, sku, vendor")
          .eq("org_id", orgId)
          .or(`barcode.eq.${barcode.barcode},gtin.eq.${barcode.barcode},sku.eq.${barcode.barcode}`)
          .limit(1)
          .maybeSingle();

        if (!directError && directMatch) {
          matches = [{
            productId: directMatch.id,
            productName: directMatch.name,
            sku: directMatch.sku || undefined,
            vendor: directMatch.vendor || undefined,
            confidence: 1.0,
            matchType: "exact",
            matchedFields: ["barcode"],
          }];
        } else if (lookup?.productName) {
          // Use lookup product name for fuzzy matching
          matches = await this.matchProductByName(lookup.productName, orgId);
        }
      }

      return {
        barcode,
        lookup,
        matches,
      };
    } catch (error) {
      logger.error("[BarcodeGTIN] Error scanning barcode", { error, barcodeString, orgId });
      throw error;
    }
  }

  /**
   * Associate barcode/GTIN with product
   */
  async associateBarcode(productId: string, barcode: string, gtin?: string, orgId?: string): Promise<void> {
    try {
      // Update inventory item with barcode/GTIN
      const updateData: any = {
        barcode,
        updated_at: new Date().toISOString(),
      };

      if (gtin) {
        updateData.gtin = gtin;
      }

      const { error } = await supabase
        .from("inventory_items")
        .update(updateData)
        .eq("id", productId);

      if (error) {
        // If inventory_items doesn't have these columns, try recipe_ingredients
        await supabase
          .from("recipe_ingredients")
          .update(updateData)
          .eq("id", productId);
      }

      logger.info("[BarcodeGTIN] Barcode associated with product", { productId, barcode, gtin });
    } catch (error) {
      logger.error("[BarcodeGTIN] Error associating barcode", { error, productId, barcode });
      throw error;
    }
  }

  /**
   * Match barcode to recipe ingredient
   */
  async matchToIngredient(barcodeString: string, orgId: string): Promise<{
    ingredientId?: string;
    ingredientName?: string;
    confidence: number;
    matches: Array<{ ingredientId: string; name: string; confidence: number }>;
  }> {
    try {
      const scanResult = await this.scanBarcode(barcodeString, orgId);

      // Check recipe ingredients table
      const { data: ingredients, error } = await supabase
        .from("recipe_ingredients")
        .select("id, name, gtin, barcode")
        .eq("org_id", orgId)
        .or(`barcode.eq.${barcodeString},gtin.eq.${barcodeString}`)
        .limit(10);

      if (error || !ingredients || ingredients.length === 0) {
        return {
          confidence: 0,
          matches: [],
        };
      }

      const matches = ingredients.map((ing) => ({
        ingredientId: ing.id,
        name: ing.name,
        confidence: (ing.barcode === barcodeString || ing.gtin === barcodeString) ? 1.0 : 0.8,
      })).sort((a, b) => b.confidence - a.confidence);

      return {
        ingredientId: matches[0]?.ingredientId,
        ingredientName: matches[0]?.name,
        confidence: matches[0]?.confidence || 0,
        matches,
      };
    } catch (error) {
      logger.error("[BarcodeGTIN] Error matching to ingredient", { error, barcodeString, orgId });
      return {
        confidence: 0,
        matches: [],
      };
    }
  }
}

// Export singleton instance
export const barcodeGTINService = new BarcodeGTINService();
