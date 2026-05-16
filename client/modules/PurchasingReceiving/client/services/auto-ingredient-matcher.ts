/**
 * Automatic Ingredient Matching Service
 *
 * Automatically matches invoice line items and barcodes to inventory items
 * Eliminates need for manual mapping
 *
 * Matching strategies:
 * 1. Exact GTIN/barcode match
 * 2. SKU match
 * 3. Fuzzy name matching
 * 4. Category + supplier match
 * 5. Auto-create with confidence flag if no match
 */

import { supplierAPIService } from "./supplier-api-integration";
import type { StandardizedLineItem } from "@shared/api";

export interface IngredientMatch {
  inventoryItemId: string;
  confidence: number;
  matchType:
    | "exact_gtin"
    | "exact_sku"
    | "fuzzy_name"
    | "category_supplier"
    | "auto_created";
  matchedBy: "barcode" | "gtin" | "sku" | "name" | "category";
  source: "supplier_catalog" | "inventory" | "gtin_database" | "fuzzy";
  details?: {
    barcode?: string;
    gtin?: string;
    sku?: string;
    supplierId?: string;
    category?: string;
  };
}

export interface MatchResult {
  lineItem: StandardizedLineItem;
  match: IngredientMatch | null;
  needsReview: boolean;
  suggestedActions?: string[];
}

class AutoIngredientMatcher {
  private matchHistory: Map<string, IngredientMatch[]> = new Map();
  private learnedMappings: Map<string, string> = new Map(); // barcode/gtin -> inventoryItemId

  /**
   * Match invoice line item to inventory
   */
  async matchLineItem(
    lineItem: StandardizedLineItem,
    barcode?: string,
    gtin?: string,
  ): Promise<MatchResult> {
    console.log(`[AutoMatcher] Matching line item: ${lineItem.productName}`);

    // Try multiple matching strategies in order of confidence
    let match: IngredientMatch | null = null;

    // Strategy 1: Exact GTIN/Barcode match (highest confidence)
    if (gtin || barcode) {
      match = await this.matchByGTIN(gtin || barcode!);
      if (match && match.confidence >= 0.95) {
        return this.createResult(lineItem, match);
      }
    }

    // Strategy 2: SKU match from supplier catalog
    if (lineItem.standardized?.sku) {
      match = await this.matchBySKU(lineItem.vendor, lineItem.standardized.sku);
      if (match && match.confidence >= 0.9) {
        return this.createResult(lineItem, match);
      }
    }

    // Strategy 3: Supplier catalog match
    match = await this.matchBySupplierCatalog(lineItem);
    if (match && match.confidence >= 0.85) {
      return this.createResult(lineItem, match);
    }

    // Strategy 4: Fuzzy name matching
    match = await this.matchByFuzzyName(lineItem);
    if (match && match.confidence >= 0.7) {
      return this.createResult(lineItem, match);
    }

    // Strategy 5: Category + supplier match
    match = await this.matchByCategorySupplier(lineItem);
    if (match && match.confidence >= 0.6) {
      return this.createResult(lineItem, match);
    }

    // Strategy 6: Auto-create with confidence flag
    match = await this.autoCreateInventoryItem(lineItem, barcode, gtin);
    return this.createResult(lineItem, match, true);
  }

  /**
   * Match by GTIN/Barcode
   */
  private async matchByGTIN(code: string): Promise<IngredientMatch | null> {
    // Check learned mappings first
    const learned = this.learnedMappings.get(code);
    if (learned) {
      return {
        inventoryItemId: learned,
        confidence: 1.0,
        matchType: "exact_gtin",
        matchedBy:
          code.length === 13 || code.length === 14 ? "gtin" : "barcode",
        source: "inventory",
        details: {
          gtin: code.length >= 13 ? code : undefined,
          barcode: code.length < 13 ? code : undefined,
        },
      };
    }

    // Lookup GTIN in database
    try {
      const response = await fetch(`/api/gtin/${code}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Find inventory item by GTIN product name
          const inventoryItemId = await this.findInventoryItemByName(
            data.data.name,
          );
          if (inventoryItemId) {
            // Learn this mapping
            this.learnedMappings.set(code, inventoryItemId);
            return {
              inventoryItemId,
              confidence: 0.98,
              matchType: "exact_gtin",
              matchedBy: "gtin",
              source: "gtin_database",
              details: { gtin: code },
            };
          }
        }
      }
    } catch (error) {
      console.warn(`[AutoMatcher] GTIN lookup failed for ${code}:`, error);
    }

    return null;
  }

  /**
   * Match by SKU from supplier catalog
   */
  private async matchBySKU(
    supplierId: string,
    sku: string,
  ): Promise<IngredientMatch | null> {
    // Search supplier catalog
    const catalog = supplierAPIService.getCatalog(supplierId);
    const catalogItem = catalog.find(
      (item) => item.sku.toLowerCase() === sku.toLowerCase(),
    );

    if (catalogItem) {
      // Find inventory item by catalog item name
      const inventoryItemId = await this.findInventoryItemByName(
        catalogItem.name,
      );
      if (inventoryItemId) {
        return {
          inventoryItemId,
          confidence: 0.95,
          matchType: "exact_sku",
          matchedBy: "sku",
          source: "supplier_catalog",
          details: { sku, supplierId },
        };
      }
    }

    return null;
  }

  /**
   * Match by supplier catalog (name + vendor)
   */
  private async matchBySupplierCatalog(
    lineItem: StandardizedLineItem,
  ): Promise<IngredientMatch | null> {
    const catalog = supplierAPIService.getCatalog(lineItem.vendor);
    const match = supplierAPIService.matchInvoiceItemToCatalog(
      lineItem.vendor,
      lineItem.productName,
      undefined,
      lineItem.standardized?.sku,
    );

    if (match) {
      const inventoryItemId = await this.findInventoryItemByName(match.name);
      if (inventoryItemId) {
        return {
          inventoryItemId,
          confidence: 0.9,
          matchType: "fuzzy_name",
          matchedBy: "name",
          source: "supplier_catalog",
          details: { sku: match.sku, supplierId: lineItem.vendor },
        };
      }
    }

    return null;
  }

  /**
   * Match by fuzzy name matching
   */
  private async matchByFuzzyName(
    lineItem: StandardizedLineItem,
  ): Promise<IngredientMatch | null> {
    // This would query inventory system with fuzzy search
    // For now, use simplified matching

    const productName = lineItem.productName.toLowerCase().trim();
    const words = productName.split(/\s+/).filter((w) => w.length > 2);

    // In production, this would call:
    // const items = await inventoryService.fuzzySearch({
    //   name: productName,
    //   category: lineItem.standardized?.category,
    //   minConfidence: 0.70,
    // });

    // Mock implementation
    const inventoryItemId = await this.findInventoryItemByName(
      lineItem.productName,
    );
    if (inventoryItemId) {
      // Calculate confidence based on name similarity
      const confidence = this.calculateNameSimilarity(
        productName,
        lineItem.productName.toLowerCase(),
      );

      if (confidence >= 0.7) {
        return {
          inventoryItemId,
          confidence,
          matchType: "fuzzy_name",
          matchedBy: "name",
          source: "fuzzy",
          details: { category: lineItem.standardized?.category },
        };
      }
    }

    return null;
  }

  /**
   * Match by category + supplier
   */
  private async matchByCategorySupplier(
    lineItem: StandardizedLineItem,
  ): Promise<IngredientMatch | null> {
    if (!lineItem.standardized?.category) {
      return null;
    }

    // In production, query inventory by category and supplier
    // const items = await inventoryService.searchItems({
    //   category: lineItem.standardized.category,
    //   vendor: lineItem.vendor,
    // });

    // For now, return null (would need inventory system integration)
    return null;
  }

  /**
   * Auto-create inventory item if no match found
   */
  private async autoCreateInventoryItem(
    lineItem: StandardizedLineItem,
    barcode?: string,
    gtin?: string,
  ): Promise<IngredientMatch> {
    console.log(
      `[AutoMatcher] Auto-creating inventory item for: ${lineItem.productName}`,
    );

    // In production, this would create the inventory item:
    // const newItem = await inventoryService.createItem({
    //   name: lineItem.productName,
    //   category: lineItem.standardized?.category,
    //   vendor: lineItem.vendor,
    //   costPerUnit: lineItem.costPerStandardUnit,
    //   unit: lineItem.quantityPurchaseUnit.unit,
    //   barcode: barcode,
    //   gtin: gtin,
    //   sku: lineItem.standardized?.sku,
    //   needsReview: true, // Flag for manual review
    // });

    // For now, generate a mock ID
    const inventoryItemId = `auto_${Date.now()}_${lineItem.productName.toLowerCase().replace(/\s+/g, "_")}`;

    // Store learned mapping if we have barcode/GTIN
    if (barcode || gtin) {
      this.learnedMappings.set(barcode || gtin!, inventoryItemId);
    }

    return {
      inventoryItemId,
      confidence: 0.5, // Low confidence - needs review
      matchType: "auto_created",
      matchedBy: barcode ? "barcode" : gtin ? "gtin" : "name",
      source: "fuzzy",
      details: {
        barcode,
        gtin,
        sku: lineItem.standardized?.sku,
        category: lineItem.standardized?.category,
      },
    };
  }

  /**
   * Learn from user correction
   */
  learnMapping(barcodeOrGTIN: string, inventoryItemId: string): void {
    this.learnedMappings.set(barcodeOrGTIN, inventoryItemId);
    console.log(
      `[AutoMatcher] Learned mapping: ${barcodeOrGTIN} → ${inventoryItemId}`,
    );

    // In production, persist to database
    // await database.saveLearnedMapping(barcodeOrGTIN, inventoryItemId);
  }

  /**
   * Get match history for an item
   */
  getMatchHistory(productName: string): IngredientMatch[] {
    return this.matchHistory.get(productName) || [];
  }

  /**
   * Private helper methods
   */

  private async findInventoryItemByName(name: string): Promise<string | null> {
    // In production, query inventory system
    // const items = await inventoryService.searchItems({ name });
    // return items[0]?.id || null;

    // Mock implementation
    return `inv_${name.toLowerCase().replace(/\s+/g, "_")}`;
  }

  private calculateNameSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return 1 - distance / longer.length;
  }

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
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private createResult(
    lineItem: StandardizedLineItem,
    match: IngredientMatch | null,
    needsReview = false,
  ): MatchResult {
    const result: MatchResult = {
      lineItem,
      match,
      needsReview: needsReview || (match ? match.confidence < 0.85 : true),
    };

    if (result.needsReview) {
      result.suggestedActions = [
        "Review product name match",
        "Verify category assignment",
        "Check unit conversion",
        "Confirm pricing",
      ];
    }

    // Store in history
    if (match) {
      const history = this.matchHistory.get(lineItem.productName) || [];
      history.push(match);
      this.matchHistory.set(lineItem.productName, history);
    }

    return result;
  }
}

export const autoIngredientMatcher = new AutoIngredientMatcher();
