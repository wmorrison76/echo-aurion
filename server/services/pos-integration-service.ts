/**
 * LUCCCA POS Integration Layer
 * ============================
 * 
 * Real-time POS integration for:
 * - Auto-decrement inventory when items are sold
 * - Feed consumption data to AI forecasting engine
 * - Real-time food cost tracking per menu item
 * - Sales mix analysis for menu engineering
 * 
 * Supported POS Systems:
 * - Toast
 * - Square
 * - Resy
 * - OpenTable
 * - Aloha (Oracle)
 * - Micros (Oracle)
 * - Generic webhook adapter
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                       POS INTEGRATION LAYER                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │                    POS ADAPTERS                                  │   │
 * │  ├──────────┬──────────┬──────────┬──────────┬──────────┬─────────┤   │
 * │  │  Toast   │  Square  │   Resy   │ OpenTable│  Aloha   │ Micros  │   │
 * │  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬────┘   │
 * │       └──────────┴──────────┴──────────┴──────────┴──────────┘        │
 * │                              │                                         │
 * │                    ┌─────────▼─────────┐                              │
 * │                    │ UNIFIED POS BUS   │                              │
 * │                    │ (Normalization)   │                              │
 * │                    └─────────┬─────────┘                              │
 * │                              │                                         │
 * │  ┌───────────────────────────┼───────────────────────────────────┐    │
 * │  │                           │                                   │    │
 * │  ▼                           ▼                                   ▼    │
 * │  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
 * │  │  Inventory   │  │   AI Forecast    │  │   Cost Tracking      │   │
 * │  │  Decrement   │  │   Data Feed      │  │   Real-time          │   │
 * │  └──────────────┘  └──────────────────┘  └──────────────────────┘   │
 * │                                                                         │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │                    ANALYTICS OUTPUT                              │   │
 * │  ├──────────────┬──────────────┬──────────────┬──────────────────┤   │
 * │  │  Sales Mix   │ Menu Perf.   │  Food Cost%  │  Profit/Item     │   │
 * │  └──────────────┴──────────────┴──────────────┴──────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import { logger } from '../lib/logger.js';
import { unifiedEventBus, UNIFIED_EVENT_TYPES } from '../lib/unified-event-bus.js';
import { operationsCoreEngine } from './operations-core-engine.js';
import { aiForecastingEngine } from './ai-forecasting-engine.js';
import * as crypto from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type POSProvider = 'toast' | 'square' | 'resy' | 'opentable' | 'aloha' | 'micros' | 'generic';

/**
 * Unified POS transaction (normalized across all providers)
 */
export interface POSTransaction {
  id: string;
  externalId: string;
  provider: POSProvider;
  transactionType: 'sale' | 'refund' | 'void' | 'adjustment';
  
  // Timing
  openedAt: string;
  closedAt?: string;
  
  // Location
  orgId: string;
  outletId: string;
  stationId?: string;
  serverId?: string;
  serverName?: string;
  
  // Amounts
  subtotal: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
  currency: string;
  
  // Items
  items: POSLineItem[];
  
  // Payment
  payments: POSPayment[];
  
  // Metadata
  guestCount?: number;
  tableNumber?: string;
  orderType: 'dine_in' | 'takeout' | 'delivery' | 'catering' | 'bar';
  rawData?: Record<string, any>;
}

export interface POSLineItem {
  id: string;
  externalId: string;
  menuItemId?: string;
  recipeId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
  modifiers?: POSModifier[];
  category?: string;
  sentAt?: string;
  voidedAt?: string;
  voidReason?: string;
}

export interface POSModifier {
  id: string;
  name: string;
  price: number;
  ingredientImpact?: {
    ingredientId: string;
    quantityChange: number;
    unit: string;
  }[];
}

export interface POSPayment {
  id: string;
  type: 'cash' | 'credit' | 'debit' | 'gift_card' | 'house_account' | 'other';
  amount: number;
  tip?: number;
  cardBrand?: string;
  lastFour?: string;
  processedAt: string;
}

/**
 * Menu item with cost tracking
 */
export interface MenuItemCost {
  menuItemId: string;
  menuItemName: string;
  recipeId?: string;
  
  // Pricing
  sellPrice: number;
  
  // Cost breakdown
  theoreticalFoodCost: number;
  actualFoodCost: number;
  laborCost: number;
  overheadAllocation: number;
  totalCost: number;
  
  // Metrics
  foodCostPercentage: number;
  grossProfit: number;
  grossProfitMargin: number;
  contributionMargin: number;
  
  // Volume
  unitsSold: number;
  totalRevenue: number;
  totalFoodCost: number;
  
  // Trend
  costTrend: 'increasing' | 'stable' | 'decreasing';
  costTrendPercentage: number;
}

/**
 * Sales mix analysis
 */
export interface SalesMixAnalysis {
  period: {
    start: string;
    end: string;
  };
  outletId: string;
  
  // Overall metrics
  totalTransactions: number;
  totalRevenue: number;
  totalFoodCost: number;
  overallFoodCostPercentage: number;
  averageTicket: number;
  
  // Category breakdown
  categories: CategoryMix[];
  
  // Top/Bottom performers
  topSellers: MenuItemPerformance[];
  highMarginItems: MenuItemPerformance[];
  lowMarginItems: MenuItemPerformance[];
  
  // Insights
  insights: SalesMixInsight[];
}

export interface CategoryMix {
  category: string;
  itemCount: number;
  revenue: number;
  revenuePercentage: number;
  foodCost: number;
  foodCostPercentage: number;
  grossProfit: number;
}

export interface MenuItemPerformance {
  menuItemId: string;
  menuItemName: string;
  unitsSold: number;
  revenue: number;
  revenuePercentage: number;
  foodCost: number;
  foodCostPercentage: number;
  grossProfit: number;
  rank: number;
}

export interface SalesMixInsight {
  type: 'opportunity' | 'concern' | 'trend' | 'recommendation';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  menuItemId?: string;
  data?: Record<string, any>;
}

/**
 * POS adapter configuration
 */
export interface POSAdapterConfig {
  provider: POSProvider;
  apiKey?: string;
  apiSecret?: string;
  locationId?: string;
  webhookSecret?: string;
  baseUrl?: string;
  enabled: boolean;
}

// ============================================================================
// MENU ITEM TO RECIPE MAPPING
// ============================================================================

export interface MenuRecipeMapping {
  menuItemId: string;
  menuItemName: string;
  recipeId: string;
  recipeName: string;
  portionSize: number;
  portionUnit: string;
  modifierMappings: ModifierRecipeMapping[];
}

export interface ModifierRecipeMapping {
  modifierId: string;
  modifierName: string;
  ingredientAdjustments: {
    ingredientId: string;
    ingredientName: string;
    quantityChange: number; // positive = add, negative = remove
    unit: string;
  }[];
}

// ============================================================================
// POS INTEGRATION SERVICE
// ============================================================================

export class POSIntegrationService {
  // Adapter registry
  private adapters: Map<string, POSAdapterConfig> = new Map();
  
  // Menu to recipe mappings
  private menuMappings: Map<string, MenuRecipeMapping> = new Map();
  
  // Transaction history (for analytics)
  private transactions: Map<string, POSTransaction> = new Map();
  
  // Real-time cost cache
  private menuItemCosts: Map<string, MenuItemCost> = new Map();
  
  // Sales data for analytics
  private salesData: Map<string, {
    date: string;
    outletId: string;
    menuItemId: string;
    quantity: number;
    revenue: number;
    foodCost: number;
  }[]> = new Map();

  constructor() {
    this.initializeEventListeners();
    logger.info('[POSIntegrationService] Initialized');
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private initializeEventListeners(): void {
    // Listen for recipe cost updates to recalculate menu item costs
    unifiedEventBus.subscribe(UNIFIED_EVENT_TYPES.RECIPE_COST_UPDATED, async (event) => {
      await this.updateMenuItemCostsForRecipe(event.payload.recipeId);
    });

    logger.info('[POSIntegrationService] Event listeners initialized');
  }

  // ============================================================================
  // ADAPTER MANAGEMENT
  // ============================================================================

  /**
   * Register a POS adapter
   */
  registerAdapter(outletId: string, config: POSAdapterConfig): void {
    this.adapters.set(outletId, config);
    logger.info(`[POSIntegrationService] Registered ${config.provider} adapter for outlet ${outletId}`);
  }

  /**
   * Get adapter for outlet
   */
  getAdapter(outletId: string): POSAdapterConfig | undefined {
    return this.adapters.get(outletId);
  }

  // ============================================================================
  // MENU MAPPING MANAGEMENT
  // ============================================================================

  /**
   * Map a menu item to a recipe
   */
  mapMenuItemToRecipe(mapping: MenuRecipeMapping): void {
    this.menuMappings.set(mapping.menuItemId, mapping);
    
    // Initialize cost tracking
    this.updateMenuItemCost(mapping.menuItemId);
    
    logger.debug(`[POSIntegrationService] Mapped menu item ${mapping.menuItemName} to recipe ${mapping.recipeName}`);
  }

  /**
   * Get recipe mapping for menu item
   */
  getMenuRecipeMapping(menuItemId: string): MenuRecipeMapping | undefined {
    return this.menuMappings.get(menuItemId);
  }

  /**
   * Bulk import menu mappings
   */
  importMenuMappings(mappings: MenuRecipeMapping[]): number {
    let count = 0;
    for (const mapping of mappings) {
      this.mapMenuItemToRecipe(mapping);
      count++;
    }
    return count;
  }

  // ============================================================================
  // TRANSACTION PROCESSING
  // ============================================================================

  /**
   * Process incoming POS transaction
   * This is the main entry point for POS data
   */
  async processTransaction(transaction: POSTransaction): Promise<{
    success: boolean;
    inventoryUpdates: number;
    costCalculations: number;
    warnings: string[];
  }> {
    const result = {
      success: false,
      inventoryUpdates: 0,
      costCalculations: 0,
      warnings: [] as string[],
    };

    try {
      // Store transaction
      this.transactions.set(transaction.id, transaction);

      // Skip if not a sale or if voided
      if (transaction.transactionType !== 'sale') {
        result.success = true;
        return result;
      }

      // Process each line item
      for (const item of transaction.items) {
        // Skip voided items
        if (item.voidedAt) continue;

        // 1. Get recipe mapping
        const mapping = this.menuMappings.get(item.menuItemId || item.externalId);
        
        if (!mapping) {
          result.warnings.push(`No recipe mapping for menu item: ${item.name}`);
          continue;
        }

        // 2. Decrement inventory based on recipe
        const inventoryResult = await this.decrementInventoryForRecipe(
          mapping.recipeId,
          item.quantity,
          item.modifiers,
          mapping,
          transaction
        );

        if (inventoryResult.success) {
          result.inventoryUpdates += inventoryResult.ingredientsUpdated;
        } else {
          result.warnings.push(...inventoryResult.warnings);
        }

        // 3. Feed consumption data to AI forecasting
        await this.feedConsumptionToForecasting(item, mapping, transaction);

        // 4. Track sales data for cost analysis
        await this.trackSalesData(item, mapping, transaction);

        result.costCalculations++;
      }

      // 5. Emit transaction event
      await unifiedEventBus.publish(UNIFIED_EVENT_TYPES.POS_CHECK_CLOSED, {
        transactionId: transaction.id,
        outletId: transaction.outletId,
        total: transaction.total,
        itemCount: transaction.items.length,
        provider: transaction.provider,
      }, {
        source: { bus: 'unified', module: 'pos_integration' },
        tenantId: transaction.orgId,
        outletId: transaction.outletId,
      });

      result.success = true;

      logger.info(`[POSIntegrationService] Processed transaction ${transaction.id}: ${result.inventoryUpdates} inventory updates, ${result.costCalculations} cost calculations`);

      return result;
    } catch (error: any) {
      logger.error('[POSIntegrationService] Transaction processing failed', error);
      result.warnings.push(`Processing error: ${error.message}`);
      return result;
    }
  }

  /**
   * Decrement inventory based on recipe consumption
   */
  private async decrementInventoryForRecipe(
    recipeId: string,
    quantity: number,
    modifiers: POSModifier[] | undefined,
    mapping: MenuRecipeMapping,
    transaction: POSTransaction
  ): Promise<{
    success: boolean;
    ingredientsUpdated: number;
    warnings: string[];
  }> {
    const result = {
      success: false,
      ingredientsUpdated: 0,
      warnings: [] as string[],
    };

    try {
      // Get recipe ingredients from operations core
      // In a real implementation, this would fetch from the recipe database
      const recipeIngredients = await this.getRecipeIngredients(recipeId);

      for (const ingredient of recipeIngredients) {
        // Calculate consumption (recipe quantity * portions sold)
        let consumeQuantity = ingredient.quantity * quantity;

        // Apply modifier adjustments
        if (modifiers && modifiers.length > 0) {
          for (const modifier of modifiers) {
            const modMapping = mapping.modifierMappings?.find(m => m.modifierId === modifier.id);
            if (modMapping) {
              const adjustment = modMapping.ingredientAdjustments.find(a => a.ingredientId === ingredient.ingredientId);
              if (adjustment) {
                consumeQuantity += adjustment.quantityChange * quantity;
              }
            }
          }
        }

        // Decrement inventory
        if (consumeQuantity > 0) {
          try {
            await operationsCoreEngine.consumeInventory(
              ingredient.ingredientId,
              consumeQuantity,
              ingredient.unit,
              'recipe',
              `pos:${transaction.id}`,
              transaction.orgId,
              transaction.outletId
            );
            result.ingredientsUpdated++;
          } catch (err: any) {
            result.warnings.push(`Failed to decrement ${ingredient.ingredientName}: ${err.message}`);
          }
        }
      }

      result.success = true;
      return result;
    } catch (error: any) {
      result.warnings.push(`Recipe consumption error: ${error.message}`);
      return result;
    }
  }

  /**
   * Feed consumption data to AI forecasting engine
   */
  private async feedConsumptionToForecasting(
    item: POSLineItem,
    mapping: MenuRecipeMapping,
    transaction: POSTransaction
  ): Promise<void> {
    try {
      const recipeIngredients = await this.getRecipeIngredients(mapping.recipeId);

      for (const ingredient of recipeIngredients) {
        await aiForecastingEngine.recordConsumption({
          ingredientId: ingredient.ingredientId,
          quantity: ingredient.quantity * item.quantity,
          unit: ingredient.unit,
          source: 'pos',
          outletId: transaction.outletId,
          recipeId: mapping.recipeId,
        });
      }
    } catch (error: any) {
      logger.warn(`[POSIntegrationService] Failed to feed forecasting data: ${error.message}`);
    }
  }

  /**
   * Track sales data for cost analysis
   */
  private async trackSalesData(
    item: POSLineItem,
    mapping: MenuRecipeMapping,
    transaction: POSTransaction
  ): Promise<void> {
    const date = transaction.closedAt?.split('T')[0] || new Date().toISOString().split('T')[0];
    const key = `${transaction.outletId}:${date}`;

    const salesList = this.salesData.get(key) || [];
    
    // Calculate food cost for this item
    const recipeCost = await this.calculateRecipeCost(mapping.recipeId);
    const foodCost = recipeCost * item.quantity;

    salesList.push({
      date,
      outletId: transaction.outletId,
      menuItemId: item.menuItemId || item.externalId,
      quantity: item.quantity,
      revenue: item.totalPrice,
      foodCost,
    });

    this.salesData.set(key, salesList);

    // Update real-time menu item cost
    this.updateMenuItemCostFromSale(item.menuItemId || item.externalId, item, foodCost);
  }

  // ============================================================================
  // COST TRACKING
  // ============================================================================

  /**
   * Update menu item cost in real-time
   */
  private updateMenuItemCostFromSale(menuItemId: string, item: POSLineItem, foodCost: number): void {
    const existing = this.menuItemCosts.get(menuItemId);
    
    if (existing) {
      // Update running totals
      existing.unitsSold += item.quantity;
      existing.totalRevenue += item.totalPrice;
      existing.totalFoodCost += foodCost;
      
      // Recalculate metrics
      existing.actualFoodCost = existing.totalFoodCost / existing.unitsSold;
      existing.foodCostPercentage = (existing.totalFoodCost / existing.totalRevenue) * 100;
      existing.grossProfit = existing.totalRevenue - existing.totalFoodCost;
      existing.grossProfitMargin = (existing.grossProfit / existing.totalRevenue) * 100;
      
      this.menuItemCosts.set(menuItemId, existing);
    } else {
      // Create new entry
      const mapping = this.menuMappings.get(menuItemId);
      
      this.menuItemCosts.set(menuItemId, {
        menuItemId,
        menuItemName: mapping?.menuItemName || item.name,
        recipeId: mapping?.recipeId,
        sellPrice: item.unitPrice,
        theoreticalFoodCost: foodCost / item.quantity,
        actualFoodCost: foodCost / item.quantity,
        laborCost: 0, // Would come from labor allocation
        overheadAllocation: 0,
        totalCost: foodCost / item.quantity,
        foodCostPercentage: (foodCost / item.totalPrice) * 100,
        grossProfit: item.totalPrice - foodCost,
        grossProfitMargin: ((item.totalPrice - foodCost) / item.totalPrice) * 100,
        contributionMargin: item.totalPrice - foodCost,
        unitsSold: item.quantity,
        totalRevenue: item.totalPrice,
        totalFoodCost: foodCost,
        costTrend: 'stable',
        costTrendPercentage: 0,
      });
    }
  }

  /**
   * Update menu item cost when recipe costs change
   */
  private async updateMenuItemCostsForRecipe(recipeId: string): Promise<void> {
    // Find all menu items mapped to this recipe
    for (const [menuItemId, mapping] of this.menuMappings) {
      if (mapping.recipeId === recipeId) {
        await this.updateMenuItemCost(menuItemId);
      }
    }
  }

  /**
   * Calculate and update menu item cost
   */
  private async updateMenuItemCost(menuItemId: string): Promise<void> {
    const mapping = this.menuMappings.get(menuItemId);
    if (!mapping) return;

    const recipeCost = await this.calculateRecipeCost(mapping.recipeId);
    
    const existing = this.menuItemCosts.get(menuItemId);
    if (existing) {
      const previousCost = existing.theoreticalFoodCost;
      existing.theoreticalFoodCost = recipeCost;
      
      // Calculate trend
      if (previousCost > 0) {
        const change = ((recipeCost - previousCost) / previousCost) * 100;
        existing.costTrend = change > 2 ? 'increasing' : change < -2 ? 'decreasing' : 'stable';
        existing.costTrendPercentage = change;
      }
      
      this.menuItemCosts.set(menuItemId, existing);
    }
  }

  /**
   * Get recipe cost (would integrate with Operations Core)
   */
  private async calculateRecipeCost(recipeId: string): Promise<number> {
    // This would call operationsCoreEngine.calculateRecipeCost()
    // For now, return a placeholder
    return 5.00; // Placeholder
  }

  /**
   * Get recipe ingredients (would integrate with recipe database)
   */
  private async getRecipeIngredients(recipeId: string): Promise<Array<{
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
  }>> {
    // This would fetch from the recipe database
    // For now, return empty array
    return [];
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Get real-time menu item costs
   */
  getMenuItemCosts(outletId?: string): MenuItemCost[] {
    const costs = Array.from(this.menuItemCosts.values());
    
    // Note: In production, filter by outlet
    return costs.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Get menu item cost by ID
   */
  getMenuItemCost(menuItemId: string): MenuItemCost | undefined {
    return this.menuItemCosts.get(menuItemId);
  }

  /**
   * Generate sales mix analysis
   */
  async generateSalesMixAnalysis(
    outletId: string,
    startDate: string,
    endDate: string
  ): Promise<SalesMixAnalysis> {
    // Aggregate sales data for the period
    const allSales: typeof this.salesData extends Map<string, infer V> ? V : never = [];
    
    for (const [key, sales] of this.salesData) {
      if (key.startsWith(outletId)) {
        const dateSales = sales.filter(s => s.date >= startDate && s.date <= endDate);
        allSales.push(...dateSales);
      }
    }

    // Calculate totals
    let totalRevenue = 0;
    let totalFoodCost = 0;
    const itemSales = new Map<string, { quantity: number; revenue: number; foodCost: number; name: string }>();
    const categorySales = new Map<string, { items: number; revenue: number; foodCost: number }>();

    for (const sale of allSales) {
      totalRevenue += sale.revenue;
      totalFoodCost += sale.foodCost;

      // Item aggregation
      const existing = itemSales.get(sale.menuItemId) || { quantity: 0, revenue: 0, foodCost: 0, name: '' };
      existing.quantity += sale.quantity;
      existing.revenue += sale.revenue;
      existing.foodCost += sale.foodCost;
      
      const mapping = this.menuMappings.get(sale.menuItemId);
      existing.name = mapping?.menuItemName || sale.menuItemId;
      
      itemSales.set(sale.menuItemId, existing);

      // Category aggregation (simplified - would come from menu item data)
      const category = 'General'; // Placeholder
      const catExisting = categorySales.get(category) || { items: 0, revenue: 0, foodCost: 0 };
      catExisting.items += sale.quantity;
      catExisting.revenue += sale.revenue;
      catExisting.foodCost += sale.foodCost;
      categorySales.set(category, catExisting);
    }

    // Build category breakdown
    const categories: CategoryMix[] = Array.from(categorySales.entries()).map(([category, data]) => ({
      category,
      itemCount: data.items,
      revenue: data.revenue,
      revenuePercentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      foodCost: data.foodCost,
      foodCostPercentage: data.revenue > 0 ? (data.foodCost / data.revenue) * 100 : 0,
      grossProfit: data.revenue - data.foodCost,
    }));

    // Build item performance
    const itemPerformance: MenuItemPerformance[] = Array.from(itemSales.entries())
      .map(([menuItemId, data]) => ({
        menuItemId,
        menuItemName: data.name,
        unitsSold: data.quantity,
        revenue: data.revenue,
        revenuePercentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        foodCost: data.foodCost,
        foodCostPercentage: data.revenue > 0 ? (data.foodCost / data.revenue) * 100 : 0,
        grossProfit: data.revenue - data.foodCost,
        rank: 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Assign ranks
    itemPerformance.forEach((item, index) => {
      item.rank = index + 1;
    });

    // Generate insights
    const insights: SalesMixInsight[] = [];

    // High food cost items
    const highCostItems = itemPerformance.filter(i => i.foodCostPercentage > 35);
    if (highCostItems.length > 0) {
      insights.push({
        type: 'concern',
        severity: 'high',
        title: `${highCostItems.length} items with high food cost`,
        description: `Items with food cost above 35% may need recipe optimization or price adjustment`,
        data: { items: highCostItems.map(i => i.menuItemName) },
      });
    }

    // Top performer insight
    if (itemPerformance.length > 0) {
      const topItem = itemPerformance[0];
      insights.push({
        type: 'opportunity',
        severity: 'low',
        title: `Top seller: ${topItem.menuItemName}`,
        description: `${topItem.unitsSold} units sold, ${topItem.revenuePercentage.toFixed(1)}% of revenue`,
        menuItemId: topItem.menuItemId,
      });
    }

    // Overall food cost insight
    const overallFoodCostPct = totalRevenue > 0 ? (totalFoodCost / totalRevenue) * 100 : 0;
    if (overallFoodCostPct > 30) {
      insights.push({
        type: 'concern',
        severity: overallFoodCostPct > 35 ? 'high' : 'medium',
        title: `Overall food cost at ${overallFoodCostPct.toFixed(1)}%`,
        description: `Industry target is typically 28-32%. Consider reviewing high-cost items.`,
      });
    }

    return {
      period: { start: startDate, end: endDate },
      outletId,
      totalTransactions: allSales.length,
      totalRevenue,
      totalFoodCost,
      overallFoodCostPercentage: overallFoodCostPct,
      averageTicket: allSales.length > 0 ? totalRevenue / allSales.length : 0,
      categories,
      topSellers: itemPerformance.slice(0, 10),
      highMarginItems: [...itemPerformance].sort((a, b) => a.foodCostPercentage - b.foodCostPercentage).slice(0, 10),
      lowMarginItems: [...itemPerformance].sort((a, b) => b.foodCostPercentage - a.foodCostPercentage).slice(0, 10),
      insights,
    };
  }

  // ============================================================================
  // WEBHOOK HANDLERS (for receiving data from POS systems)
  // ============================================================================

  /**
   * Process Toast webhook
   */
  async processToastWebhook(payload: any, outletId: string): Promise<POSTransaction> {
    // Transform Toast format to unified format
    const transaction: POSTransaction = {
      id: crypto.randomUUID(),
      externalId: payload.guid || payload.check?.guid,
      provider: 'toast',
      transactionType: 'sale',
      openedAt: payload.openedDate || new Date().toISOString(),
      closedAt: payload.closedDate,
      orgId: '', // Set from context
      outletId,
      serverId: payload.server?.guid,
      serverName: payload.server?.firstName,
      subtotal: payload.amount?.subtotal || 0,
      tax: payload.amount?.tax || 0,
      tip: payload.amount?.tip || 0,
      discount: payload.amount?.discountAmount || 0,
      total: payload.amount?.total || 0,
      currency: 'USD',
      items: (payload.selections || []).map((sel: any) => ({
        id: crypto.randomUUID(),
        externalId: sel.guid,
        menuItemId: sel.item?.guid,
        name: sel.displayName || sel.item?.name,
        quantity: sel.quantity || 1,
        unitPrice: sel.price || 0,
        totalPrice: (sel.price || 0) * (sel.quantity || 1),
        category: sel.item?.category?.name,
        modifiers: (sel.modifiers || []).map((mod: any) => ({
          id: mod.guid,
          name: mod.displayName || mod.name,
          price: mod.price || 0,
        })),
      })),
      payments: (payload.payments || []).map((pmt: any) => ({
        id: pmt.guid || crypto.randomUUID(),
        type: this.mapPaymentType(pmt.type),
        amount: pmt.amount || 0,
        tip: pmt.tipAmount,
        cardBrand: pmt.cardType,
        lastFour: pmt.lastFour,
        processedAt: pmt.paidDate || new Date().toISOString(),
      })),
      guestCount: payload.guestCount,
      tableNumber: payload.table?.name,
      orderType: this.mapOrderType(payload.diningOption),
      rawData: payload,
    };

    return transaction;
  }

  /**
   * Process Square webhook
   */
  async processSquareWebhook(payload: any, outletId: string): Promise<POSTransaction> {
    const order = payload.data?.object?.order || payload.order;
    
    const transaction: POSTransaction = {
      id: crypto.randomUUID(),
      externalId: order?.id,
      provider: 'square',
      transactionType: 'sale',
      openedAt: order?.created_at || new Date().toISOString(),
      closedAt: order?.closed_at,
      orgId: '',
      outletId,
      subtotal: (order?.total_money?.amount || 0) / 100,
      tax: (order?.total_tax_money?.amount || 0) / 100,
      tip: (order?.total_tip_money?.amount || 0) / 100,
      discount: (order?.total_discount_money?.amount || 0) / 100,
      total: (order?.total_money?.amount || 0) / 100,
      currency: order?.total_money?.currency || 'USD',
      items: (order?.line_items || []).map((item: any) => ({
        id: crypto.randomUUID(),
        externalId: item.uid,
        menuItemId: item.catalog_object_id,
        name: item.name,
        quantity: parseInt(item.quantity) || 1,
        unitPrice: (item.base_price_money?.amount || 0) / 100,
        totalPrice: (item.total_money?.amount || 0) / 100,
        modifiers: (item.modifiers || []).map((mod: any) => ({
          id: mod.uid,
          name: mod.name,
          price: (mod.total_price_money?.amount || 0) / 100,
        })),
      })),
      payments: [],
      orderType: this.mapSquareOrderType(order?.fulfillments?.[0]?.type),
      rawData: payload,
    };

    return transaction;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private mapPaymentType(type: string): POSPayment['type'] {
    const mapping: Record<string, POSPayment['type']> = {
      'CASH': 'cash',
      'CREDIT': 'credit',
      'DEBIT': 'debit',
      'GIFT_CARD': 'gift_card',
      'HOUSE_ACCOUNT': 'house_account',
    };
    return mapping[type?.toUpperCase()] || 'other';
  }

  private mapOrderType(type: string): POSTransaction['orderType'] {
    const mapping: Record<string, POSTransaction['orderType']> = {
      'DINE_IN': 'dine_in',
      'TAKE_OUT': 'takeout',
      'DELIVERY': 'delivery',
      'CATERING': 'catering',
      'BAR': 'bar',
    };
    return mapping[type?.toUpperCase()] || 'dine_in';
  }

  private mapSquareOrderType(type: string): POSTransaction['orderType'] {
    const mapping: Record<string, POSTransaction['orderType']> = {
      'PICKUP': 'takeout',
      'SHIPMENT': 'delivery',
      'DELIVERY': 'delivery',
    };
    return mapping[type?.toUpperCase()] || 'dine_in';
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  getStats(): {
    adaptersRegistered: number;
    menuMappings: number;
    transactionsProcessed: number;
    menuItemsTracked: number;
  } {
    return {
      adaptersRegistered: this.adapters.size,
      menuMappings: this.menuMappings.size,
      transactionsProcessed: this.transactions.size,
      menuItemsTracked: this.menuItemCosts.size,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const posIntegrationService = new POSIntegrationService();

export default posIntegrationService;
