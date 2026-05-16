/**
 * LUCCCA Operations Core Engine
 * ==============================
 * 
 * The central nervous system that connects:
 * - Purchasing & Receiving (Invoice → Product/Ingredient)
 * - Culinary & Pastry (Recipes → Ingredients → Inventory)
 * - Ordering & Inventory (Stock → Consumption → Reorder)
 * 
 * END GOAL: Full automation with minimal staff
 * 
 * Flow Architecture:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        OPERATIONS CORE ENGINE                           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
 * │  │  PURCHASING  │───▶│   RECEIVE    │───▶│  INVENTORY   │             │
 * │  │   Invoice    │    │   Goods      │    │   Update     │             │
 * │  └──────────────┘    └──────────────┘    └──────┬───────┘             │
 * │                                                  │                     │
 * │         ┌────────────────────────────────────────┘                     │
 * │         │                                                              │
 * │         ▼                                                              │
 * │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
 * │  │   RECIPES    │◀──▶│   COSTING    │───▶│    MENU      │             │
 * │  │  (Culinary)  │    │   Engine     │    │   Pricing    │             │
 * │  └──────┬───────┘    └──────────────┘    └──────────────┘             │
 * │         │                                                              │
 * │         ▼                                                              │
 * │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
 * │  │  PRODUCTION  │───▶│  INVENTORY   │───▶│  AUTO-ORDER  │             │
 * │  │   (Cook)     │    │  Decrement   │    │   Generate   │             │
 * │  └──────────────┘    └──────────────┘    └──────────────┘             │
 * │                                                                         │
 * │  ┌──────────────────────────────────────────────────────────────────┐  │
 * │  │                      ECHO AI³ ORCHESTRATOR                        │  │
 * │  │  • Monitors all flows • Predicts needs • Optimizes decisions     │  │
 * │  └──────────────────────────────────────────────────────────────────┘  │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import { logger } from '../lib/logger.js';
import { unifiedEventBus, UNIFIED_EVENT_TYPES } from '../lib/unified-event-bus.js';
import { masterEntityService, type EntityType } from './master-entity-service.js';
import * as crypto from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Unified Product/Ingredient representation
 * This is the canonical entity that connects all modules
 */
export interface CanonicalIngredient {
  id: string;
  canonicalId: string;
  name: string;
  description?: string;
  category: IngredientCategory;
  
  // Identification (maps across modules)
  sku?: string;
  barcode?: string;
  gtin?: string;
  vendorCodes: VendorCode[];
  
  // Unit of Measure
  baseUnit: string; // kg, L, each, oz
  purchaseUnit?: string; // case, bag, bottle
  purchaseToBaseConversion?: number; // e.g., 1 case = 12 each
  
  // Current state
  currentCost: number;
  averageCost: number;
  lastPurchaseCost: number;
  currency: string;
  
  // Inventory tracking
  currentStock: number;
  parLevel: number;
  reorderPoint: number;
  reorderQuantity: number;
  
  // Supplier info
  preferredSupplierId?: string;
  alternateSupplierIds: string[];
  leadTimeDays: number;
  
  // Metadata
  isActive: boolean;
  orgId: string;
  outletId?: string;
  lastUpdated: string;
  
  // Module references (where this ingredient is used)
  usedInRecipes: string[];
  usedInPastryRecipes: string[];
}

export interface VendorCode {
  vendorId: string;
  vendorName: string;
  vendorProductCode: string;
  vendorPrice: number;
  lastPriceDate: string;
}

export enum IngredientCategory {
  PROTEINS = 'proteins',
  PRODUCE = 'produce',
  DAIRY = 'dairy',
  GRAINS = 'grains',
  OILS_FATS = 'oils_fats',
  SPICES = 'spices',
  BEVERAGES = 'beverages',
  ALCOHOL = 'alcohol',
  PASTRY = 'pastry', // flour, sugar, chocolate, etc.
  FROZEN = 'frozen',
  DRY_GOODS = 'dry_goods',
  SUPPLIES = 'supplies',
  OTHER = 'other',
}

/**
 * Invoice line item (from Purchasing/Receiving)
 */
export interface InvoiceLineItem {
  lineNumber: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  sku?: string;
  vendorProductCode?: string;
  taxAmount?: number;
}

/**
 * Recipe ingredient reference
 */
export interface RecipeIngredientRef {
  recipeId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  preparation?: string;
  isOptional: boolean;
  section?: string;
  sortOrder: number;
}

/**
 * Production order (what to cook)
 */
export interface ProductionOrder {
  id: string;
  recipeId: string;
  recipeName: string;
  quantity: number; // portions/servings to make
  scheduledDate: string;
  scheduledTime?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  eventId?: string; // If tied to a banquet event
  beoId?: string;
  outletId: string;
  orgId: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Auto-generated purchase order suggestion
 */
export interface PurchaseOrderSuggestion {
  id: string;
  suggestedDate: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderSuggestionItem[];
  totalEstimatedCost: number;
  reason: 'low_stock' | 'production_need' | 'event_forecast' | 'par_replenishment';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sourceEventIds?: string[]; // What triggered this suggestion
  outletId: string;
  orgId: string;
}

export interface PurchaseOrderSuggestionItem {
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  neededQuantity: number;
  orderQuantity: number;
  unit: string;
  estimatedUnitCost: number;
  estimatedTotalCost: number;
  vendorProductCode?: string;
}

/**
 * Operations event for audit/tracking
 */
export interface OperationsEvent {
  id: string;
  type: OperationsEventType;
  timestamp: string;
  actor: {
    type: 'user' | 'system' | 'ai';
    id?: string;
    name?: string;
  };
  entityType: string;
  entityId: string;
  data: Record<string, any>;
  orgId: string;
  outletId?: string;
}

export enum OperationsEventType {
  // Invoice processing
  INVOICE_RECEIVED = 'invoice_received',
  INVOICE_PROCESSED = 'invoice_processed',
  INVOICE_MATCHED = 'invoice_matched',
  
  // Inventory
  INVENTORY_RECEIVED = 'inventory_received',
  INVENTORY_CONSUMED = 'inventory_consumed',
  INVENTORY_ADJUSTED = 'inventory_adjusted',
  INVENTORY_TRANSFERRED = 'inventory_transferred',
  LOW_STOCK_ALERT = 'low_stock_alert',
  
  // Recipe/Production
  RECIPE_COSTED = 'recipe_costed',
  PRODUCTION_SCHEDULED = 'production_scheduled',
  PRODUCTION_COMPLETED = 'production_completed',
  
  // Purchasing
  PO_SUGGESTED = 'po_suggested',
  PO_CREATED = 'po_created',
  PO_APPROVED = 'po_approved',
  
  // AI/Automation
  AI_RECOMMENDATION = 'ai_recommendation',
  AUTO_ORDER_TRIGGERED = 'auto_order_triggered',
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface OperationsCoreConfig {
  // Automation settings
  enableAutoOrdering: boolean;
  autoOrderThreshold: number; // % of par level
  autoOrderLeadTimeDays: number;
  
  // Costing settings
  costingMethod: 'fifo' | 'lifo' | 'average' | 'last_purchase';
  includeWasteInCosting: boolean;
  
  // Alert settings
  lowStockAlertEnabled: boolean;
  lowStockThreshold: number; // % of reorder point
  
  // AI settings
  enableAIForecasting: boolean;
  enableAIOptimization: boolean;
}

const DEFAULT_CONFIG: OperationsCoreConfig = {
  enableAutoOrdering: false, // Start manual, enable when confident
  autoOrderThreshold: 1.2, // Order when stock < 120% of reorder point
  autoOrderLeadTimeDays: 3,
  costingMethod: 'average',
  includeWasteInCosting: true,
  lowStockAlertEnabled: true,
  lowStockThreshold: 1.0, // Alert at reorder point
  enableAIForecasting: true,
  enableAIOptimization: true,
};

// ============================================================================
// OPERATIONS CORE ENGINE
// ============================================================================

export class OperationsCoreEngine {
  private config: OperationsCoreConfig;
  
  // In-memory stores (would be database-backed in production)
  private ingredients: Map<string, CanonicalIngredient> = new Map();
  private productionOrders: Map<string, ProductionOrder> = new Map();
  private poSuggestions: Map<string, PurchaseOrderSuggestion> = new Map();
  private events: OperationsEvent[] = [];
  
  constructor(config: Partial<OperationsCoreConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeEventListeners();
    logger.info('[OperationsCoreEngine] Initialized');
  }

  // ============================================================================
  // EVENT LISTENERS - Connects to Unified Event Bus
  // ============================================================================

  private initializeEventListeners(): void {
    // Listen for invoice processed events
    unifiedEventBus.subscribe(UNIFIED_EVENT_TYPES.INVOICE_RECORDED, async (event) => {
      await this.handleInvoiceProcessed(event.payload);
    });

    // Listen for inventory updates
    unifiedEventBus.subscribe(UNIFIED_EVENT_TYPES.INVENTORY_UPDATED, async (event) => {
      await this.handleInventoryUpdate(event.payload);
    });

    // Listen for recipe updates
    unifiedEventBus.subscribe(UNIFIED_EVENT_TYPES.RECIPE_UPDATED, async (event) => {
      await this.recostRecipe(event.payload.recipeId);
    });

    // Listen for production events
    unifiedEventBus.subscribe(UNIFIED_EVENT_TYPES.PRODUCTION_GENERATED, async (event) => {
      await this.handleProductionGenerated(event.payload);
    });

    // Listen for BEO events (banquet production needs)
    unifiedEventBus.subscribe(UNIFIED_EVENT_TYPES.BEO_APPROVED, async (event) => {
      await this.handleBEOApproved(event.payload);
    });

    logger.info('[OperationsCoreEngine] Event listeners initialized');
  }

  // ============================================================================
  // INVOICE PROCESSING - Invoice → Inventory → Recipe Costing
  // ============================================================================

  /**
   * Process an invoice and flow through to inventory and recipe costing
   * This is the entry point from Purchasing/Receiving
   */
  async processInvoice(invoice: {
    invoiceId: string;
    invoiceNumber: string;
    supplierId: string;
    supplierName: string;
    invoiceDate: string;
    lineItems: InvoiceLineItem[];
    orgId: string;
    outletId?: string;
  }): Promise<{
    success: boolean;
    processedItems: number;
    newIngredients: number;
    updatedCosts: number;
    warnings: string[];
    affectedRecipes: string[];
  }> {
    const result = {
      success: false,
      processedItems: 0,
      newIngredients: 0,
      updatedCosts: 0,
      warnings: [] as string[],
      affectedRecipes: [] as string[],
    };

    try {
      logger.info(`[OperationsCoreEngine] Processing invoice ${invoice.invoiceNumber}`);

      for (const lineItem of invoice.lineItems) {
        // 1. Match or create ingredient
        const ingredient = await this.matchOrCreateIngredient(
          lineItem,
          invoice.supplierId,
          invoice.supplierName,
          invoice.orgId,
          invoice.outletId
        );

        if (!ingredient) {
          result.warnings.push(`Could not process line ${lineItem.lineNumber}: ${lineItem.description}`);
          continue;
        }

        // 2. Update inventory (receive goods)
        await this.receiveInventory(
          ingredient.id,
          lineItem.quantity,
          lineItem.unit,
          lineItem.unitPrice,
          invoice.invoiceId,
          invoice.orgId,
          invoice.outletId
        );

        // 3. Update ingredient cost
        const costChanged = await this.updateIngredientCost(
          ingredient.id,
          lineItem.unitPrice,
          invoice.supplierName,
          invoice.invoiceDate
        );

        if (costChanged) {
          result.updatedCosts++;
          
          // 4. Recost affected recipes
          const affectedRecipes = await this.recostAffectedRecipes(ingredient.id);
          result.affectedRecipes.push(...affectedRecipes);
        }

        result.processedItems++;
      }

      // Log the event
      await this.logOperationsEvent({
        type: OperationsEventType.INVOICE_PROCESSED,
        entityType: 'invoice',
        entityId: invoice.invoiceId,
        data: {
          invoiceNumber: invoice.invoiceNumber,
          lineItems: invoice.lineItems.length,
          processedItems: result.processedItems,
          updatedCosts: result.updatedCosts,
        },
        orgId: invoice.orgId,
        outletId: invoice.outletId,
      });

      // Emit event for other modules
      await unifiedEventBus.publish(UNIFIED_EVENT_TYPES.INVENTORY_UPDATED, {
        source: 'invoice_processing',
        invoiceId: invoice.invoiceId,
        updatedCount: result.processedItems,
      }, {
        source: { bus: 'unified', module: 'operations_core' },
        tenantId: invoice.orgId,
        outletId: invoice.outletId,
      });

      result.success = true;
      result.affectedRecipes = [...new Set(result.affectedRecipes)]; // Dedupe

      logger.info(`[OperationsCoreEngine] Invoice ${invoice.invoiceNumber} processed: ${result.processedItems} items, ${result.updatedCosts} costs updated, ${result.affectedRecipes.length} recipes recosted`);

      return result;
    } catch (error: any) {
      logger.error('[OperationsCoreEngine] Invoice processing failed', error);
      result.warnings.push(`Processing error: ${error.message}`);
      return result;
    }
  }

  /**
   * Match invoice line item to existing ingredient or create new one
   */
  private async matchOrCreateIngredient(
    lineItem: InvoiceLineItem,
    supplierId: string,
    supplierName: string,
    orgId: string,
    outletId?: string
  ): Promise<CanonicalIngredient | null> {
    // Try to match by vendor product code
    if (lineItem.vendorProductCode) {
      const existing = this.findIngredientByVendorCode(supplierId, lineItem.vendorProductCode, orgId);
      if (existing) {
        return existing;
      }
    }

    // Try to match by SKU
    if (lineItem.sku) {
      const existing = this.findIngredientBySku(lineItem.sku, orgId);
      if (existing) {
        // Add vendor code if not present
        this.addVendorCodeToIngredient(existing.id, {
          vendorId: supplierId,
          vendorName: supplierName,
          vendorProductCode: lineItem.vendorProductCode || '',
          vendorPrice: lineItem.unitPrice,
          lastPriceDate: new Date().toISOString(),
        });
        return existing;
      }
    }

    // Try fuzzy match by name
    const fuzzyMatch = this.fuzzyMatchIngredient(lineItem.description, orgId);
    if (fuzzyMatch && fuzzyMatch.confidence > 0.85) {
      // High confidence match - add vendor code
      this.addVendorCodeToIngredient(fuzzyMatch.ingredient.id, {
        vendorId: supplierId,
        vendorName: supplierName,
        vendorProductCode: lineItem.vendorProductCode || '',
        vendorPrice: lineItem.unitPrice,
        lastPriceDate: new Date().toISOString(),
      });
      return fuzzyMatch.ingredient;
    }

    // Create new ingredient
    const newIngredient = await this.createIngredient({
      name: lineItem.description,
      category: this.inferCategory(lineItem.description),
      baseUnit: lineItem.unit,
      currentCost: lineItem.unitPrice,
      averageCost: lineItem.unitPrice,
      lastPurchaseCost: lineItem.unitPrice,
      currency: 'USD',
      sku: lineItem.sku,
      vendorCodes: [{
        vendorId: supplierId,
        vendorName: supplierName,
        vendorProductCode: lineItem.vendorProductCode || '',
        vendorPrice: lineItem.unitPrice,
        lastPriceDate: new Date().toISOString(),
      }],
      preferredSupplierId: supplierId,
      orgId,
      outletId,
    });

    logger.info(`[OperationsCoreEngine] Created new ingredient: ${newIngredient.name} (${newIngredient.id})`);
    return newIngredient;
  }

  // ============================================================================
  // INVENTORY MANAGEMENT
  // ============================================================================

  /**
   * Receive inventory from purchase/invoice
   */
  async receiveInventory(
    ingredientId: string,
    quantity: number,
    unit: string,
    unitCost: number,
    referenceId: string,
    orgId: string,
    outletId?: string
  ): Promise<void> {
    const ingredient = this.ingredients.get(ingredientId);
    if (!ingredient) {
      throw new Error(`Ingredient not found: ${ingredientId}`);
    }

    // Convert quantity if needed
    const convertedQuantity = this.convertQuantity(quantity, unit, ingredient.baseUnit);

    // Update stock
    ingredient.currentStock += convertedQuantity;
    ingredient.lastUpdated = new Date().toISOString();

    this.ingredients.set(ingredientId, ingredient);

    // Log event
    await this.logOperationsEvent({
      type: OperationsEventType.INVENTORY_RECEIVED,
      entityType: 'ingredient',
      entityId: ingredientId,
      data: {
        quantity: convertedQuantity,
        unit: ingredient.baseUnit,
        unitCost,
        referenceId,
        newStock: ingredient.currentStock,
      },
      orgId,
      outletId,
    });

    logger.debug(`[OperationsCoreEngine] Received ${convertedQuantity} ${ingredient.baseUnit} of ${ingredient.name}`);
  }

  /**
   * Consume inventory (for production/recipes)
   */
  async consumeInventory(
    ingredientId: string,
    quantity: number,
    unit: string,
    referenceType: 'recipe' | 'production' | 'waste' | 'adjustment',
    referenceId: string,
    orgId: string,
    outletId?: string
  ): Promise<{
    success: boolean;
    newStock: number;
    lowStockAlert: boolean;
  }> {
    const ingredient = this.ingredients.get(ingredientId);
    if (!ingredient) {
      throw new Error(`Ingredient not found: ${ingredientId}`);
    }

    // Convert quantity if needed
    const convertedQuantity = this.convertQuantity(quantity, unit, ingredient.baseUnit);

    // Check if we have enough stock
    if (ingredient.currentStock < convertedQuantity) {
      logger.warn(`[OperationsCoreEngine] Insufficient stock for ${ingredient.name}: have ${ingredient.currentStock}, need ${convertedQuantity}`);
    }

    // Deduct stock (allow negative for tracking)
    ingredient.currentStock -= convertedQuantity;
    ingredient.lastUpdated = new Date().toISOString();

    this.ingredients.set(ingredientId, ingredient);

    // Check for low stock
    const lowStockAlert = ingredient.currentStock <= ingredient.reorderPoint;

    // Log event
    await this.logOperationsEvent({
      type: OperationsEventType.INVENTORY_CONSUMED,
      entityType: 'ingredient',
      entityId: ingredientId,
      data: {
        quantity: convertedQuantity,
        unit: ingredient.baseUnit,
        referenceType,
        referenceId,
        newStock: ingredient.currentStock,
        lowStockAlert,
      },
      orgId,
      outletId,
    });

    // Trigger low stock alert if needed
    if (lowStockAlert) {
      await this.handleLowStock(ingredient);
    }

    return {
      success: true,
      newStock: ingredient.currentStock,
      lowStockAlert,
    };
  }

  /**
   * Handle low stock - generate PO suggestion or auto-order
   */
  private async handleLowStock(ingredient: CanonicalIngredient): Promise<void> {
    if (!this.config.lowStockAlertEnabled) return;

    await this.logOperationsEvent({
      type: OperationsEventType.LOW_STOCK_ALERT,
      entityType: 'ingredient',
      entityId: ingredient.id,
      data: {
        currentStock: ingredient.currentStock,
        reorderPoint: ingredient.reorderPoint,
        parLevel: ingredient.parLevel,
      },
      orgId: ingredient.orgId,
      outletId: ingredient.outletId,
    });

    // Generate PO suggestion
    const suggestion = await this.generatePOSuggestion(ingredient, 'low_stock');

    // If auto-ordering is enabled and stock is critically low
    if (this.config.enableAutoOrdering && ingredient.currentStock <= 0) {
      await this.triggerAutoOrder(suggestion);
    }

    // Emit event
    await unifiedEventBus.publish(UNIFIED_EVENT_TYPES.INVENTORY_SHORTAGE_DETECTED, {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      currentStock: ingredient.currentStock,
      reorderPoint: ingredient.reorderPoint,
      suggestion,
    }, {
      source: { bus: 'unified', module: 'operations_core' },
      tenantId: ingredient.orgId,
      outletId: ingredient.outletId,
    });
  }

  // ============================================================================
  // RECIPE COSTING
  // ============================================================================

  /**
   * Calculate recipe cost based on current ingredient costs
   */
  async calculateRecipeCost(
    recipeId: string,
    ingredients: RecipeIngredientRef[],
    servings: number = 1
  ): Promise<{
    totalCost: number;
    costPerServing: number;
    ingredientCosts: Array<{
      ingredientId: string;
      ingredientName: string;
      quantity: number;
      unit: string;
      unitCost: number;
      lineCost: number;
    }>;
    missingIngredients: string[];
  }> {
    let totalCost = 0;
    const ingredientCosts: any[] = [];
    const missingIngredients: string[] = [];

    for (const ref of ingredients) {
      const ingredient = this.ingredients.get(ref.ingredientId);
      
      if (!ingredient) {
        missingIngredients.push(ref.ingredientId);
        continue;
      }

      // Convert quantity to base unit
      const convertedQuantity = this.convertQuantity(ref.quantity, ref.unit, ingredient.baseUnit);
      
      // Get cost based on costing method
      const unitCost = this.getIngredientCost(ingredient);
      const lineCost = convertedQuantity * unitCost;

      totalCost += lineCost;

      ingredientCosts.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantity: convertedQuantity,
        unit: ingredient.baseUnit,
        unitCost,
        lineCost,
      });
    }

    return {
      totalCost,
      costPerServing: totalCost / servings,
      ingredientCosts,
      missingIngredients,
    };
  }

  /**
   * Get ingredient cost based on configured costing method
   */
  private getIngredientCost(ingredient: CanonicalIngredient): number {
    switch (this.config.costingMethod) {
      case 'fifo':
      case 'lifo':
        // Would need cost layer tracking for proper FIFO/LIFO
        return ingredient.averageCost;
      case 'last_purchase':
        return ingredient.lastPurchaseCost;
      case 'average':
      default:
        return ingredient.averageCost;
    }
  }

  /**
   * Recost a specific recipe
   */
  async recostRecipe(recipeId: string): Promise<void> {
    // This would fetch recipe ingredients and recalculate
    // For now, just emit the event
    await this.logOperationsEvent({
      type: OperationsEventType.RECIPE_COSTED,
      entityType: 'recipe',
      entityId: recipeId,
      data: { reason: 'ingredient_cost_change' },
      orgId: '', // Would come from recipe
    });

    await unifiedEventBus.publish(UNIFIED_EVENT_TYPES.RECIPE_COST_UPDATED, {
      recipeId,
      reason: 'ingredient_cost_change',
      timestamp: new Date().toISOString(),
    }, {
      source: { bus: 'unified', module: 'operations_core' },
      tenantId: '', // Would come from recipe
    });
  }

  /**
   * Recost all recipes affected by an ingredient cost change
   */
  private async recostAffectedRecipes(ingredientId: string): Promise<string[]> {
    const ingredient = this.ingredients.get(ingredientId);
    if (!ingredient) return [];

    const affectedRecipes = [
      ...ingredient.usedInRecipes,
      ...ingredient.usedInPastryRecipes,
    ];

    for (const recipeId of affectedRecipes) {
      await this.recostRecipe(recipeId);
    }

    return affectedRecipes;
  }

  // ============================================================================
  // PRODUCTION MANAGEMENT
  // ============================================================================

  /**
   * Schedule production order
   */
  async scheduleProduction(
    recipeId: string,
    recipeName: string,
    quantity: number,
    scheduledDate: string,
    orgId: string,
    outletId: string,
    eventId?: string,
    beoId?: string
  ): Promise<ProductionOrder> {
    const order: ProductionOrder = {
      id: crypto.randomUUID(),
      recipeId,
      recipeName,
      quantity,
      scheduledDate,
      status: 'scheduled',
      eventId,
      beoId,
      outletId,
      orgId,
      createdAt: new Date().toISOString(),
    };

    this.productionOrders.set(order.id, order);

    await this.logOperationsEvent({
      type: OperationsEventType.PRODUCTION_SCHEDULED,
      entityType: 'production_order',
      entityId: order.id,
      data: order,
      orgId,
      outletId,
    });

    // Check ingredient availability and generate PO if needed
    await this.checkProductionIngredients(order);

    return order;
  }

  /**
   * Complete production order and decrement inventory
   */
  async completeProduction(
    orderId: string,
    actualQuantity?: number
  ): Promise<void> {
    const order = this.productionOrders.get(orderId);
    if (!order) {
      throw new Error(`Production order not found: ${orderId}`);
    }

    const quantity = actualQuantity ?? order.quantity;

    // Get recipe ingredients and decrement inventory
    // This would fetch from recipe database
    // For now, just mark as complete

    order.status = 'completed';
    order.completedAt = new Date().toISOString();
    this.productionOrders.set(orderId, order);

    await this.logOperationsEvent({
      type: OperationsEventType.PRODUCTION_COMPLETED,
      entityType: 'production_order',
      entityId: order.id,
      data: {
        scheduledQuantity: order.quantity,
        actualQuantity: quantity,
        completedAt: order.completedAt,
      },
      orgId: order.orgId,
      outletId: order.outletId,
    });
  }

  /**
   * Check production ingredients and generate PO suggestions
   */
  private async checkProductionIngredients(order: ProductionOrder): Promise<void> {
    // This would:
    // 1. Get recipe ingredients
    // 2. Scale by production quantity
    // 3. Check inventory levels
    // 4. Generate PO suggestions for shortages
    
    logger.info(`[OperationsCoreEngine] Checking ingredients for production order ${order.id}`);
    
    // Emit event for other modules to handle
    await unifiedEventBus.publish(UNIFIED_EVENT_TYPES.PRODUCTION_PLAN_UPDATED, {
      productionOrderId: order.id,
      recipeId: order.recipeId,
      quantity: order.quantity,
      scheduledDate: order.scheduledDate,
    }, {
      source: { bus: 'unified', module: 'operations_core' },
      tenantId: order.orgId,
      outletId: order.outletId,
    });
  }

  // ============================================================================
  // AUTOMATED PURCHASING
  // ============================================================================

  /**
   * Generate purchase order suggestion
   */
  async generatePOSuggestion(
    ingredient: CanonicalIngredient,
    reason: PurchaseOrderSuggestion['reason']
  ): Promise<PurchaseOrderSuggestion> {
    const orderQuantity = Math.max(
      ingredient.reorderQuantity,
      ingredient.parLevel - ingredient.currentStock
    );

    const suggestion: PurchaseOrderSuggestion = {
      id: crypto.randomUUID(),
      suggestedDate: new Date().toISOString(),
      supplierId: ingredient.preferredSupplierId || '',
      supplierName: ingredient.vendorCodes[0]?.vendorName || 'Unknown',
      items: [{
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        currentStock: ingredient.currentStock,
        neededQuantity: ingredient.parLevel - ingredient.currentStock,
        orderQuantity,
        unit: ingredient.purchaseUnit || ingredient.baseUnit,
        estimatedUnitCost: ingredient.lastPurchaseCost,
        estimatedTotalCost: orderQuantity * ingredient.lastPurchaseCost,
        vendorProductCode: ingredient.vendorCodes[0]?.vendorProductCode,
      }],
      totalEstimatedCost: orderQuantity * ingredient.lastPurchaseCost,
      reason,
      priority: ingredient.currentStock <= 0 ? 'urgent' : 
                ingredient.currentStock <= ingredient.reorderPoint * 0.5 ? 'high' : 'medium',
      outletId: ingredient.outletId || '',
      orgId: ingredient.orgId,
    };

    this.poSuggestions.set(suggestion.id, suggestion);

    await this.logOperationsEvent({
      type: OperationsEventType.PO_SUGGESTED,
      entityType: 'po_suggestion',
      entityId: suggestion.id,
      data: suggestion,
      orgId: ingredient.orgId,
      outletId: ingredient.outletId,
    });

    return suggestion;
  }

  /**
   * Trigger auto-order for critical stock
   */
  private async triggerAutoOrder(suggestion: PurchaseOrderSuggestion): Promise<void> {
    await this.logOperationsEvent({
      type: OperationsEventType.AUTO_ORDER_TRIGGERED,
      entityType: 'po_suggestion',
      entityId: suggestion.id,
      data: {
        suggestion,
        reason: 'critical_stock',
      },
      orgId: suggestion.orgId,
      outletId: suggestion.outletId,
    });

    // Emit for purchasing module to create PO
    await unifiedEventBus.publish(UNIFIED_EVENT_TYPES.PURCHASING_ORDER_CREATED, {
      suggestionId: suggestion.id,
      autoGenerated: true,
      ...suggestion,
    }, {
      source: { bus: 'unified', module: 'operations_core' },
      tenantId: suggestion.orgId,
      outletId: suggestion.outletId,
    });

    logger.info(`[OperationsCoreEngine] Auto-order triggered for suggestion ${suggestion.id}`);
  }

  /**
   * Generate PO suggestions for upcoming production/events
   */
  async generateForecastPurchasing(
    startDate: string,
    endDate: string,
    orgId: string,
    outletId?: string
  ): Promise<PurchaseOrderSuggestion[]> {
    const suggestions: PurchaseOrderSuggestion[] = [];

    // Get scheduled production orders
    const scheduledOrders = Array.from(this.productionOrders.values())
      .filter(o => o.status === 'scheduled' && 
                   o.scheduledDate >= startDate && 
                   o.scheduledDate <= endDate &&
                   o.orgId === orgId &&
                   (!outletId || o.outletId === outletId));

    // Aggregate ingredient needs
    const ingredientNeeds = new Map<string, number>();

    // This would calculate total needs from recipes
    // For now, just return empty

    logger.info(`[OperationsCoreEngine] Generated ${suggestions.length} forecast PO suggestions`);

    return suggestions;
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private async handleInvoiceProcessed(payload: any): Promise<void> {
    logger.info(`[OperationsCoreEngine] Handling invoice processed event`);
    // Invoice already processed through processInvoice method
  }

  private async handleInventoryUpdate(payload: any): Promise<void> {
    logger.info(`[OperationsCoreEngine] Handling inventory update event`);
    // Check for low stock conditions
  }

  private async handleProductionGenerated(payload: any): Promise<void> {
    logger.info(`[OperationsCoreEngine] Handling production generated event`);
    // Schedule production and check ingredients
  }

  private async handleBEOApproved(payload: any): Promise<void> {
    logger.info(`[OperationsCoreEngine] Handling BEO approved event`);
    // Generate production orders from BEO
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async createIngredient(input: Partial<CanonicalIngredient>): Promise<CanonicalIngredient> {
    const ingredient: CanonicalIngredient = {
      id: crypto.randomUUID(),
      canonicalId: `ing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: input.name || 'Unknown',
      description: input.description,
      category: input.category || IngredientCategory.OTHER,
      sku: input.sku,
      barcode: input.barcode,
      gtin: input.gtin,
      vendorCodes: input.vendorCodes || [],
      baseUnit: input.baseUnit || 'each',
      purchaseUnit: input.purchaseUnit,
      purchaseToBaseConversion: input.purchaseToBaseConversion,
      currentCost: input.currentCost || 0,
      averageCost: input.averageCost || input.currentCost || 0,
      lastPurchaseCost: input.lastPurchaseCost || input.currentCost || 0,
      currency: input.currency || 'USD',
      currentStock: input.currentStock || 0,
      parLevel: input.parLevel || 0,
      reorderPoint: input.reorderPoint || 0,
      reorderQuantity: input.reorderQuantity || 0,
      preferredSupplierId: input.preferredSupplierId,
      alternateSupplierIds: input.alternateSupplierIds || [],
      leadTimeDays: input.leadTimeDays || 3,
      isActive: true,
      orgId: input.orgId || '',
      outletId: input.outletId,
      lastUpdated: new Date().toISOString(),
      usedInRecipes: [],
      usedInPastryRecipes: [],
    };

    this.ingredients.set(ingredient.id, ingredient);

    // Also create in master entity service
    await masterEntityService.upsertEntity({
      entityType: 'ingredient',
      orgId: ingredient.orgId,
      outletId: ingredient.outletId,
      name: ingredient.name,
      data: ingredient,
      aliases: [
        ...(ingredient.sku ? [{ aliasType: 'sku' as const, aliasValue: ingredient.sku, source: 'operations_core' }] : []),
        ...(ingredient.barcode ? [{ aliasType: 'barcode' as const, aliasValue: ingredient.barcode, source: 'operations_core' }] : []),
        ...(ingredient.gtin ? [{ aliasType: 'gtin' as const, aliasValue: ingredient.gtin, source: 'operations_core' }] : []),
      ],
      sourceModule: 'operations_core',
      sourceId: ingredient.id,
    });

    return ingredient;
  }

  private findIngredientByVendorCode(vendorId: string, vendorCode: string, orgId: string): CanonicalIngredient | undefined {
    return Array.from(this.ingredients.values()).find(i =>
      i.orgId === orgId &&
      i.vendorCodes.some(vc => vc.vendorId === vendorId && vc.vendorProductCode === vendorCode)
    );
  }

  private findIngredientBySku(sku: string, orgId: string): CanonicalIngredient | undefined {
    return Array.from(this.ingredients.values()).find(i =>
      i.orgId === orgId && i.sku === sku
    );
  }

  private addVendorCodeToIngredient(ingredientId: string, vendorCode: VendorCode): void {
    const ingredient = this.ingredients.get(ingredientId);
    if (!ingredient) return;

    const existingIndex = ingredient.vendorCodes.findIndex(
      vc => vc.vendorId === vendorCode.vendorId
    );

    if (existingIndex >= 0) {
      ingredient.vendorCodes[existingIndex] = vendorCode;
    } else {
      ingredient.vendorCodes.push(vendorCode);
    }

    this.ingredients.set(ingredientId, ingredient);
  }

  private fuzzyMatchIngredient(name: string, orgId: string): { ingredient: CanonicalIngredient; confidence: number } | null {
    const nameLower = name.toLowerCase();
    let bestMatch: CanonicalIngredient | null = null;
    let bestScore = 0;

    for (const ingredient of this.ingredients.values()) {
      if (ingredient.orgId !== orgId) continue;

      const ingredientLower = ingredient.name.toLowerCase();
      let score = 0;

      if (ingredientLower === nameLower) {
        score = 1.0;
      } else if (ingredientLower.includes(nameLower) || nameLower.includes(ingredientLower)) {
        score = 0.8;
      } else {
        // Simple token matching
        const nameTokens = nameLower.split(/\s+/);
        const ingredientTokens = ingredientLower.split(/\s+/);
        const matches = nameTokens.filter(t => ingredientTokens.includes(t)).length;
        score = matches / Math.max(nameTokens.length, ingredientTokens.length);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = ingredient;
      }
    }

    return bestMatch ? { ingredient: bestMatch, confidence: bestScore } : null;
  }

  private async updateIngredientCost(
    ingredientId: string,
    newCost: number,
    supplier: string,
    date: string
  ): Promise<boolean> {
    const ingredient = this.ingredients.get(ingredientId);
    if (!ingredient) return false;

    const previousCost = ingredient.currentCost;
    
    // Update average cost (simple moving average)
    ingredient.averageCost = (ingredient.averageCost + newCost) / 2;
    ingredient.lastPurchaseCost = newCost;
    ingredient.currentCost = this.getIngredientCost(ingredient);
    ingredient.lastUpdated = new Date().toISOString();

    this.ingredients.set(ingredientId, ingredient);

    // Return true if cost changed significantly (>1%)
    return Math.abs(newCost - previousCost) / previousCost > 0.01;
  }

  private convertQuantity(quantity: number, fromUnit: string, toUnit: string): number {
    if (fromUnit === toUnit) return quantity;

    // Unit conversion map (simplified)
    const conversions: Record<string, Record<string, number>> = {
      'kg': { 'g': 1000, 'lb': 2.205, 'oz': 35.274 },
      'L': { 'ml': 1000, 'gal': 0.264, 'qt': 1.057, 'cup': 4.227 },
      'case': { 'each': 12 }, // Default case size
    };

    const directConversion = conversions[fromUnit]?.[toUnit];
    if (directConversion) {
      return quantity * directConversion;
    }

    const reverseConversion = conversions[toUnit]?.[fromUnit];
    if (reverseConversion) {
      return quantity / reverseConversion;
    }

    // No conversion found, return as-is
    return quantity;
  }

  private inferCategory(description: string): IngredientCategory {
    const lower = description.toLowerCase();

    if (/beef|chicken|pork|lamb|fish|salmon|tuna|shrimp|lobster/i.test(lower)) {
      return IngredientCategory.PROTEINS;
    }
    if (/milk|cream|cheese|butter|yogurt/i.test(lower)) {
      return IngredientCategory.DAIRY;
    }
    if (/flour|sugar|chocolate|vanilla|yeast|baking/i.test(lower)) {
      return IngredientCategory.PASTRY;
    }
    if (/oil|olive|vinegar/i.test(lower)) {
      return IngredientCategory.OILS_FATS;
    }
    if (/salt|pepper|spice|herb|garlic|onion/i.test(lower)) {
      return IngredientCategory.SPICES;
    }
    if (/rice|pasta|bread|grain/i.test(lower)) {
      return IngredientCategory.GRAINS;
    }
    if (/lettuce|tomato|carrot|potato|vegetable|fruit/i.test(lower)) {
      return IngredientCategory.PRODUCE;
    }
    if (/wine|beer|spirits|vodka|whiskey/i.test(lower)) {
      return IngredientCategory.ALCOHOL;
    }
    if (/frozen/i.test(lower)) {
      return IngredientCategory.FROZEN;
    }

    return IngredientCategory.OTHER;
  }

  private async logOperationsEvent(event: Omit<OperationsEvent, 'id' | 'timestamp' | 'actor'>): Promise<void> {
    const fullEvent: OperationsEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actor: { type: 'system' },
      ...event,
    };

    this.events.push(fullEvent);

    // Keep last 10000 events
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get ingredient by ID
   */
  getIngredient(id: string): CanonicalIngredient | undefined {
    return this.ingredients.get(id);
  }

  /**
   * List all ingredients for an org
   */
  listIngredients(orgId: string, outletId?: string): CanonicalIngredient[] {
    return Array.from(this.ingredients.values()).filter(i =>
      i.orgId === orgId && (!outletId || !i.outletId || i.outletId === outletId)
    );
  }

  /**
   * Get low stock ingredients
   */
  getLowStockIngredients(orgId: string, outletId?: string): CanonicalIngredient[] {
    return this.listIngredients(orgId, outletId).filter(i =>
      i.currentStock <= i.reorderPoint
    );
  }

  /**
   * Get PO suggestions
   */
  getPOSuggestions(orgId: string, outletId?: string): PurchaseOrderSuggestion[] {
    return Array.from(this.poSuggestions.values()).filter(s =>
      s.orgId === orgId && (!outletId || s.outletId === outletId)
    );
  }

  /**
   * Get recent operations events
   */
  getRecentEvents(orgId: string, limit: number = 100): OperationsEvent[] {
    return this.events
      .filter(e => e.orgId === orgId)
      .slice(-limit);
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    totalIngredients: number;
    lowStockCount: number;
    pendingPOSuggestions: number;
    scheduledProduction: number;
    totalEvents: number;
  } {
    const allIngredients = Array.from(this.ingredients.values());
    
    return {
      totalIngredients: allIngredients.length,
      lowStockCount: allIngredients.filter(i => i.currentStock <= i.reorderPoint).length,
      pendingPOSuggestions: this.poSuggestions.size,
      scheduledProduction: Array.from(this.productionOrders.values()).filter(o => o.status === 'scheduled').length,
      totalEvents: this.events.length,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const operationsCoreEngine = new OperationsCoreEngine();

export default operationsCoreEngine;
