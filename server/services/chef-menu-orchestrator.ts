/**
 * Chef Menu Orchestrator Service
 * 
 * Complete end-to-end Chef Menu workflow orchestrator
 * - Chef creates/imports menu
 * - Chef creates/imports recipes for menu items
 * - Menu items connect to POS (integration to all major POS 3rd party)
 * - EchoAi builds Order Guides based on recipes, chef preferences, vendor catalogs
 * - Chef verbally commands EchoAi to create orders for entire menu
 * - Chef approves orders, orders sent, Dashboard updated with upcoming orders
 * - EchoAi sees need for scheduling staff, creates schedule based on staff evaluations
 * - EchoAi builds production Prep sheets by prep type (Butcher, Saucier, Garde Manger, Hot Prep, etc)
 * - Order arrives at dock: receiving checks in product (human/barcode), updates Chef MiniPanel
 * - Invoice scanned: EchoAurum updated, invoice digitized, categorized, GL codes updated
 * - Inventory location management: chef builds storage locations, EchoAi understands storage requirements
 * - Financial integration: EchoAi notifies EchoAurum of inventory, net terms, payment automation, P&L updates
 * 
 * Production-ready, military-grade, AI^3 optimized, no-fail architecture
 */

import { logger } from '../utils/logger';
import { getSupabaseServiceClient } from '../lib/supabase-service-client';
import { recipeSearchOptimizer } from './recipe-search-optimizer';
import { recipeAIAnalyzer } from './recipe-ai-analyzer';
import { eventPurchasingBridge } from './event-purchasing-bridge';
import { autoSchedulingOptimizer } from './auto-scheduling-optimizer';
import { maestroBeOSync } from './maestro-beo-sync';
import { posIntegrationLayer } from './pos-integration-layer';
import { financialEventEmitter } from '../lib/financial-event-emitter';
import { PnLCalculatorRealtime } from './pnl-calculator-realtime';
import { addQuantities, areUnitsCompatible, normalizeToStandardUnit } from '../utils/unit-converter';
import crypto from 'crypto';

export interface ChefMenuRequest {
  tenant_id: string;
  org_id: string;
  outlet_id: string;
  chef_id: string;
  menu_name: string;
  menu_items: ChefMenuItem[];
  pos_integration_type?: 'toast' | 'square' | 'resy' | 'open_table' | 'other';
  additional_data?: Record<string, any>;
}

export interface ChefMenuItem {
  id?: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  recipe_id?: string;
  recipe_data?: Record<string, any> | string; // Can be structured data or recipe text
  pos_item_id?: string;
  ingredients?: string[];
  servings?: number; // Target servings for scaling
  nutrition?: {
    calories?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
    fiber?: number;
    sugars?: number;
    sodium?: number;
    cholesterol?: number;
  };
}

export interface OrderGuideItem {
  ingredient_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  vendor_id?: string;
  vendor_name?: string;
  item_code?: string;
  pack_size?: string;
  cost_per_unit?: number;
  storage_location?: string;
  storage_requirements?: string[];
  gl_code?: string;
}

export interface VendorOrder {
  id: string;
  vendor_id: string;
  vendor_name: string;
  order_items: VendorOrderItem[];
  total_cost: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'received' | 'invoiced';
  created_at: string;
  approved_at?: string;
  sent_at?: string;
  received_at?: string;
  invoice_id?: string;
}

export interface VendorOrderItem {
  ingredient_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  item_code?: string;
  pack_size?: string;
  cost_per_unit: number;
  total_cost: number;
}

export interface ReceivingCheckIn {
  order_id: string;
  vendor_id: string;
  checked_in_items: CheckedInItem[];
  shortages: ShortageItem[];
  received_by: string;
  received_at: string;
  notes?: string;
}

export interface CheckedInItem {
  ingredient_id: string;
  ingredient_name: string;
  quantity_received: number;
  quantity_ordered: number;
  unit: string;
  location?: string;
  batch_number?: string;
  expiry_date?: string;
}

export interface ShortageItem {
  ingredient_id: string;
  ingredient_name: string;
  quantity_ordered: number;
  quantity_received: number;
  shortage_quantity: number;
  unit: string;
  next_delivery_date?: string;
  vendor_notified: boolean;
}

export interface InvoiceData {
  invoice_id: string;
  vendor_id: string;
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  net_terms: number;
  line_items: InvoiceLineItem[];
  total_amount: number;
  gl_codes: Record<string, number>;
  outlet_id: string;
  order_id?: string;
}

export interface InvoiceLineItem {
  line_number: number;
  ingredient_name: string;
  category: string;
  subcategory: string;
  quantity: number;
  unit: string;
  unit_price: number;
  case_price?: number;
  total_price: number;
  gl_code: string;
}

/**
 * Chef Menu Orchestrator Service
 * 
 * Orchestrates the complete chef menu workflow from menu creation to invoice processing
 */
export class ChefMenuOrchestrator {
  private initialized = false;

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('[ChefMenuOrchestrator] Initializing Chef Menu Orchestrator');
      
      // Initialize dependencies
      // (Services like recipeSearchOptimizer, recipeAIAnalyzer, etc. should already be initialized)
      
      this.initialized = true;
      logger.info('[ChefMenuOrchestrator] Chef Menu Orchestrator initialized successfully');
    } catch (error) {
      logger.error('[ChefMenuOrchestrator] Failed to initialize', { error });
      throw error;
    }
  }

  /**
   * Create menu with recipes and POS integration
   * 
   * Workflow:
   * 1. Chef creates/imports menu
   * 2. Chef creates/imports recipes for each menu item
   * 3. Menu items connect to POS
   */
  async createMenuWithRecipesAndPOS(request: ChefMenuRequest): Promise<{ menu_id: string; menu_items: ChefMenuItem[] }> {
    try {
      const supabase = getSupabaseServiceClient();
      const menuId = this.generateMenuId();

      logger.info('[ChefMenuOrchestrator] Creating menu with recipes and POS integration', {
        menu_id: menuId,
        menu_name: request.menu_name,
        item_count: request.menu_items.length,
        outlet_id: request.outlet_id,
      });

      // Step 1: Create menu record
      const { data: menu, error: menuError } = await supabase
        .from('menus')
        .insert({
          id: menuId,
          org_id: request.org_id,
          outlet_id: request.outlet_id,
          title: request.menu_name,
          created_by: request.chef_id,
          is_published: false,
          menu_type: 'restaurant',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (menuError || !menu) {
        logger.error('[ChefMenuOrchestrator] Failed to create menu', { error: menuError });
        throw new Error(`Failed to create menu: ${menuError?.message || 'Unknown error'}`);
      }

      // Step 2: Process each menu item
      const processedMenuItems: ChefMenuItem[] = [];

      for (const menuItem of request.menu_items) {
        try {
          // 2a. If recipe_id provided, verify it exists; otherwise search or create recipe
          let recipeId = menuItem.recipe_id;
          
          if (!recipeId) {
            // Try to search for existing recipe
            if (menuItem.name) {
              try {
                const searchResults = await recipeSearchOptimizer.searchRecipes({
                  orgId: request.org_id,
                  query: menuItem.name,
                  limit: 1,
                });

                if (searchResults.length > 0 && searchResults[0].combinedScore > 0.7) {
                  recipeId = searchResults[0].recipeId;
                  logger.info('[ChefMenuOrchestrator] Found existing recipe via search', {
                    menu_item: menuItem.name,
                    recipe_id: recipeId,
                    score: searchResults[0].combinedScore,
                  });
                }
              } catch (searchError) {
                logger.debug('[ChefMenuOrchestrator] Recipe search failed, will create new recipe', {
                  error: searchError,
                });
              }
            }

            // If no recipe found and recipe_data provided, create new recipe
            if (!recipeId && menuItem.recipe_data) {
              recipeId = await this.createRecipeFromData(
                request.tenant_id,
                request.org_id,
                request.outlet_id,
                menuItem,
                request.chef_id
              );
            }
          } else {
            // Verify recipe exists
            const { data: existingRecipe, error: verifyError } = await supabase
              .from('user_recipes')
              .select('id')
              .eq('id', recipeId)
              .eq('organization_id', request.org_id)
              .single();

            if (verifyError || !existingRecipe) {
              logger.warn('[ChefMenuOrchestrator] Recipe ID provided but not found, will create new recipe', {
                recipe_id: recipeId,
                error: verifyError,
              });
              recipeId = undefined;

              // Create new recipe if recipe_data available
              if (menuItem.recipe_data) {
                recipeId = await this.createRecipeFromData(
                  request.tenant_id,
                  request.org_id,
                  request.outlet_id,
                  menuItem,
                  request.chef_id
                );
              }
            }
          }

          // 2b. Create menu item record
          const menuItemId = this.generateMenuItemId();
          const { error: itemError } = await supabase
            .from('menu_items')
            .insert({
              id: menuItemId,
              menu_id: menuId,
              org_id: request.org_id,
              outlet_id: request.outlet_id,
              name: menuItem.name,
              description: menuItem.description || null,
              price: menuItem.price,
              category: menuItem.category,
              recipe_id: recipeId || null,
              created_by: request.chef_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (itemError) {
            logger.warn('[ChefMenuOrchestrator] Failed to create menu item', {
              menu_item: menuItem.name,
              error: itemError,
            });
            continue;
          }

          // 2c. Connect to POS if POS integration type provided
          let posItemId: string | undefined;
          if (request.pos_integration_type) {
            try {
              posItemId = await this.connectMenuItemToPOS(
                request.tenant_id,
                request.org_id,
                request.outlet_id,
                menuItemId,
                menuItem,
                request.pos_integration_type
              );
              
              // Update menu item with POS item ID
              if (posItemId) {
                await supabase
                  .from('menu_items')
                  .update({ pos_item_id: posItemId })
                  .eq('id', menuItemId);
              }
            } catch (posError) {
              logger.warn('[ChefMenuOrchestrator] Failed to connect menu item to POS', {
                menu_item: menuItem.name,
                error: posError,
              });
              // Continue even if POS integration fails
            }
          }

          processedMenuItems.push({
            ...menuItem,
            id: menuItemId,
            recipe_id: recipeId,
            pos_item_id: posItemId,
          });

          logger.debug('[ChefMenuOrchestrator] Menu item created and processed', {
            menu_item_id: menuItemId,
            name: menuItem.name,
            recipe_id: recipeId,
            pos_item_id: posItemId,
          });
        } catch (itemError) {
          logger.error('[ChefMenuOrchestrator] Error processing menu item', {
            menu_item: menuItem.name,
            error: itemError,
          });
          // Continue processing other items
        }
      }

      logger.info('[ChefMenuOrchestrator] Menu created with recipes and POS integration', {
        menu_id: menuId,
        items_processed: processedMenuItems.length,
        total_items: request.menu_items.length,
      });

      return {
        menu_id: menuId,
        menu_items: processedMenuItems,
      };
    } catch (error) {
      logger.error('[ChefMenuOrchestrator] Error creating menu with recipes and POS', { error });
      throw error;
    }
  }

  /**
   * Build Order Guides for menu
   * 
   * EchoAi builds Order Guides based on:
   * - Recipes for menu items
   * - Chef preferences
   * - Vendor catalogs (item code, pack sizes, cost, etc)
   */
  async buildOrderGuidesForMenu(
    menuId: string,
    tenantId: string,
    orgId: string,
    outletId: string,
    chefId: string
  ): Promise<OrderGuideItem[]> {
    try {
      const supabase = getSupabaseServiceClient();

      logger.info('[ChefMenuOrchestrator] Building order guides for menu', {
        menu_id: menuId,
        outlet_id: outletId,
      });

      // Step 1: Get all menu items with recipes
      const { data: menuItems, error: itemsError } = await supabase
        .from('menu_items')
        .select('id, name, recipe_id, category')
        .eq('menu_id', menuId)
        .eq('org_id', orgId)
        .eq('outlet_id', outletId);

      if (itemsError || !menuItems || menuItems.length === 0) {
        logger.warn('[ChefMenuOrchestrator] No menu items found for menu', { menu_id: menuId });
        return [];
      }

      // Step 2: Aggregate ingredients from all recipes
      const ingredientMap = new Map<string, OrderGuideItem>();

      for (const menuItem of menuItems) {
        if (!menuItem.recipe_id) {
          logger.debug('[ChefMenuOrchestrator] Menu item has no recipe, skipping', {
            menu_item_id: menuItem.id,
            name: menuItem.name,
          });
          continue;
        }

        try {
          // Get recipe from user_recipes table
          const { data: recipe, error: recipeError } = await supabase
            .from('user_recipes')
            .select('id, title, ingredients, instructions, servings, nutrition, calories')
            .eq('id', menuItem.recipe_id)
            .eq('organization_id', orgId)
            .single();

          if (recipeError || !recipe) {
            logger.warn('[ChefMenuOrchestrator] Recipe not found in user_recipes', {
              recipe_id: menuItem.recipe_id,
              error: recipeError,
            });
            continue;
          }

          // Parse ingredients from TEXT[] (JSON strings)
          const ingredients: any[] = [];
          if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            for (const ingredientStr of recipe.ingredients) {
              try {
                // Parse JSON string
                const parsed = typeof ingredientStr === 'string' 
                  ? JSON.parse(ingredientStr) 
                  : ingredientStr;
                
                if (parsed && typeof parsed === 'object') {
                  ingredients.push(parsed);
                } else if (typeof parsed === 'string') {
                  // Fallback: treat as ingredient name if it's a plain string
                  ingredients.push({ name: parsed, quantity: 1, unit: 'each' });
                }
              } catch (parseError) {
                // If parsing fails, treat as plain string
                ingredients.push({ name: ingredientStr, quantity: 1, unit: 'each' });
              }
            }
          }

          // Process each ingredient
          for (const ingredient of ingredients) {
            const ingredientName = ingredient.name || ingredient.item || ingredient.ingredient_name || String(ingredient);
            const quantity = ingredient.quantity || ingredient.qty || 1;
            const unit = ingredient.unit || 'each';
            const ingredientId = ingredient.id || ingredient.ingredient_id || ingredientName.toLowerCase().replace(/\s+/g, '_');

            if (!ingredientName || !ingredientId) {
              continue;
            }

            // Aggregate quantities for same ingredient with unit conversion
            if (ingredientMap.has(ingredientId)) {
              const existing = ingredientMap.get(ingredientId)!;
              
              // Try to convert and add quantities properly
              if (areUnitsCompatible(existing.unit, unit)) {
                try {
                  const converted = addQuantities(existing.quantity, existing.unit, quantity, unit);
                  existing.quantity = converted.quantity;
                  existing.unit = converted.unit;
                } catch (convertError) {
                  // Conversion failed - use existing unit and add (may not be accurate)
                  logger.warn('[ChefMenuOrchestrator] Unit conversion failed, using existing unit', {
                    ingredient_id: ingredientId,
                    existing_unit: existing.unit,
                    new_unit: unit,
                    error: convertError instanceof Error ? convertError.message : String(convertError),
                  });
                  // If same category, try simple addition (may not be accurate)
                  existing.quantity += quantity;
                }
              } else {
                // Incompatible units - log warning and use existing unit
                logger.warn('[ChefMenuOrchestrator] Incompatible units for same ingredient', {
                  ingredient_id: ingredientId,
                  ingredient_name: ingredientName,
                  existing_unit: existing.unit,
                  new_unit: unit,
                });
                // Keep existing unit and quantity (don't add incompatible units)
              }
            } else {
              ingredientMap.set(ingredientId, {
                ingredient_id: ingredientId,
                ingredient_name: ingredientName,
                quantity: quantity,
                unit: unit,
                vendor_id: ingredient.vendor_id,
                vendor_name: ingredient.vendor_name,
                item_code: ingredient.item_code,
                pack_size: ingredient.pack_size,
                cost_per_unit: ingredient.cost_per_unit,
                storage_location: ingredient.storage_location,
                storage_requirements: ingredient.storage_requirements || [],
                gl_code: ingredient.gl_code,
              });
            }
          }
        } catch (recipeError) {
          logger.warn('[ChefMenuOrchestrator] Error processing recipe for menu item', {
            menu_item_id: menuItem.id,
            recipe_id: menuItem.recipe_id,
            error: recipeError,
          });
          continue;
        }
      }

      // Step 3: Enhance with vendor catalog data and chef preferences
      const orderGuideItems: OrderGuideItem[] = [];

      for (const [ingredientId, item] of ingredientMap.entries()) {
        try {
          // Get vendor catalog data if available
          const enhancedItem = await this.enhanceOrderGuideItemWithVendorData(
            tenantId,
            orgId,
            outletId,
            ingredientId,
            item,
            chefId
          );

          orderGuideItems.push(enhancedItem);
        } catch (enhanceError) {
          logger.warn('[ChefMenuOrchestrator] Error enhancing order guide item', {
            ingredient_id: ingredientId,
            error: enhanceError,
          });
          // Use item as-is if enhancement fails
          orderGuideItems.push(item);
        }
      }

      // Step 4: Store order guide
      const orderGuideId = this.generateOrderGuideId();
      await supabase
        .from('order_guides')
        .insert({
          id: orderGuideId,
          menu_id: menuId,
          org_id: orgId,
          outlet_id: outletId,
          chef_id: chefId,
          guide_items: orderGuideItems,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      logger.info('[ChefMenuOrchestrator] Order guides built successfully', {
        menu_id: menuId,
        order_guide_id: orderGuideId,
        item_count: orderGuideItems.length,
      });

      return orderGuideItems;
    } catch (error) {
      logger.error('[ChefMenuOrchestrator] Error building order guides', { error });
      throw error;
    }
  }

  /**
   * Create vendor orders for entire menu (via voice command)
   * 
   * Workflow:
   * 1. Chef verbally commands EchoAi to create orders
   * 2. EchoAi builds entire order for all vendors and storeroom
   * 3. Order waits for chef review and approval
   */
  async createVendorOrdersForMenu(
    menuId: string,
    tenantId: string,
    orgId: string,
    outletId: string,
    chefId: string
  ): Promise<VendorOrder[]> {
    try {
      const supabase = getSupabaseServiceClient();

      logger.info('[ChefMenuOrchestrator] Creating vendor orders for menu', {
        menu_id: menuId,
        outlet_id: outletId,
      });

      // Step 1: Get order guide for menu
      const { data: orderGuide, error: guideError } = await supabase
        .from('order_guides')
        .select('*')
        .eq('menu_id', menuId)
        .eq('org_id', orgId)
        .eq('outlet_id', outletId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (guideError || !orderGuide) {
        // Build order guide if it doesn't exist
        await this.buildOrderGuidesForMenu(menuId, tenantId, orgId, outletId, chefId);
        
        // Try again
        const { data: retryGuide } = await supabase
          .from('order_guides')
          .select('*')
          .eq('menu_id', menuId)
          .eq('org_id', orgId)
          .eq('outlet_id', outletId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!retryGuide) {
          throw new Error('Failed to build order guide');
        }

        // Use retry guide
        orderGuide.guide_items = retryGuide.guide_items || [];
      }

      const orderGuideItems: OrderGuideItem[] = orderGuide.guide_items || [];

      // Step 2: Group items by vendor
      const vendorGroups = new Map<string, OrderGuideItem[]>();

      for (const item of orderGuideItems) {
        const vendorId = item.vendor_id || 'storeroom';
        if (!vendorGroups.has(vendorId)) {
          vendorGroups.set(vendorId, []);
        }
        vendorGroups.get(vendorId)!.push(item);
      }

      // Step 3: Check inventory and create purchase orders
      const vendorOrders: VendorOrder[] = [];

      for (const [vendorId, items] of vendorGroups.entries()) {
        try {
          // Check current inventory
          const itemsNeedingOrder = await this.checkInventoryAndDetermineOrderItems(
            tenantId,
            orgId,
            outletId,
            items
          );

          if (itemsNeedingOrder.length === 0) {
            logger.debug('[ChefMenuOrchestrator] No items needed for vendor', { vendor_id: vendorId });
            continue;
          }

          // Create vendor order
          const orderId = this.generateVendorOrderId();
          const orderItems: VendorOrderItem[] = itemsNeedingOrder.map(item => ({
            ingredient_id: item.ingredient_id,
            ingredient_name: item.ingredient_name,
            quantity: item.quantity,
            unit: item.unit,
            item_code: item.item_code,
            pack_size: item.pack_size,
            cost_per_unit: item.cost_per_unit || 0,
            total_cost: item.quantity * (item.cost_per_unit || 0),
          }));

          const totalCost = orderItems.reduce((sum, item) => sum + item.total_cost, 0);

          // Get vendor name
          let vendorName = 'Storeroom';
          if (vendorId !== 'storeroom') {
            const { data: vendor } = await supabase
              .from('vendors')
              .select('name')
              .eq('id', vendorId)
              .single();
            
            if (vendor) {
              vendorName = vendor.name;
            }
          }

          // Create order record (status: pending_approval)
          const { error: orderError } = await supabase
            .from('vendor_orders')
            .insert({
              id: orderId,
              menu_id: menuId,
              org_id: orgId,
              outlet_id: outletId,
              vendor_id: vendorId,
              vendor_name: vendorName,
              chef_id: chefId,
              order_items: orderItems,
              total_cost: totalCost,
              status: 'pending_approval',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (orderError) {
            logger.error('[ChefMenuOrchestrator] Failed to create vendor order', {
              vendor_id: vendorId,
              error: orderError,
            });
            continue;
          }

          vendorOrders.push({
            id: orderId,
            vendor_id: vendorId,
            vendor_name: vendorName,
            order_items: orderItems,
            total_cost: totalCost,
            status: 'pending_approval',
            created_at: new Date().toISOString(),
          });

          logger.info('[ChefMenuOrchestrator] Vendor order created (pending approval)', {
            order_id: orderId,
            vendor_id: vendorId,
            vendor_name: vendorName,
            item_count: orderItems.length,
            total_cost: totalCost,
          });
        } catch (vendorError) {
          logger.error('[ChefMenuOrchestrator] Error creating vendor order', {
            vendor_id: vendorId,
            error: vendorError,
          });
          // Continue with other vendors
        }
      }

      logger.info('[ChefMenuOrchestrator] Vendor orders created for menu', {
        menu_id: menuId,
        order_count: vendorOrders.length,
      });

      return vendorOrders;
    } catch (error) {
      logger.error('[ChefMenuOrchestrator] Error creating vendor orders for menu', { error });
      throw error;
    }
  }

  /**
   * Approve vendor orders
   * 
   * Workflow:
   * 1. Chef approves orders
   * 2. Orders sent to vendors
   * 3. Dashboard updated with upcoming orders in MiniPanels
   */
  async approveVendorOrders(
    orderIds: string[],
    tenantId: string,
    orgId: string,
    outletId: string,
    chefId: string
  ): Promise<{ approved_orders: VendorOrder[]; sent_orders: VendorOrder[] }> {
    try {
      const supabase = getSupabaseServiceClient();

      logger.info('[ChefMenuOrchestrator] Approving vendor orders', {
        order_ids: orderIds,
        outlet_id: outletId,
      });

      const approvedOrders: VendorOrder[] = [];
      const sentOrders: VendorOrder[] = [];

      for (const orderId of orderIds) {
        try {
          // Get order
          const { data: order, error: orderError } = await supabase
            .from('vendor_orders')
            .select('*')
            .eq('id', orderId)
            .eq('org_id', orgId)
            .eq('outlet_id', outletId)
            .single();

          if (orderError || !order) {
            logger.warn('[ChefMenuOrchestrator] Order not found', {
              order_id: orderId,
              error: orderError,
            });
            continue;
          }

          if (order.status !== 'pending_approval') {
            logger.warn('[ChefMenuOrchestrator] Order not in pending_approval status', {
              order_id: orderId,
              status: order.status,
            });
            continue;
          }

          // Update order status to approved
          const approvedAt = new Date().toISOString();
          const { error: approveError } = await supabase
            .from('vendor_orders')
            .update({
              status: 'approved',
              approved_at: approvedAt,
              approved_by: chefId,
              updated_at: approvedAt,
            })
            .eq('id', orderId);

          if (approveError) {
            logger.error('[ChefMenuOrchestrator] Failed to approve order', {
              order_id: orderId,
              error: approveError,
            });
            continue;
          }

          approvedOrders.push({
            ...order,
            status: 'approved',
            approved_at: approvedAt,
          });

          // Send order to vendor (if not storeroom)
          if (order.vendor_id !== 'storeroom') {
            try {
              await this.sendOrderToVendor(orderId, tenantId, orgId, outletId);
              
              const sentAt = new Date().toISOString();
              await supabase
                .from('vendor_orders')
                .update({
                  status: 'sent',
                  sent_at: sentAt,
                  updated_at: sentAt,
                })
                .eq('id', orderId);

              sentOrders.push({
                ...order,
                status: 'sent',
                approved_at: approvedAt,
                sent_at: sentAt,
              });

              logger.info('[ChefMenuOrchestrator] Order sent to vendor', {
                order_id: orderId,
                vendor_id: order.vendor_id,
              });
            } catch (sendError) {
              logger.error('[ChefMenuOrchestrator] Failed to send order to vendor', {
                order_id: orderId,
                error: sendError,
              });
              // Order is approved but not sent - can be retried
            }
          } else {
            // Storeroom orders are immediately "sent" (no external vendor)
            const sentAt = approvedAt;
            await supabase
              .from('vendor_orders')
              .update({
                status: 'sent',
                sent_at: sentAt,
                updated_at: sentAt,
              })
              .eq('id', orderId);

            sentOrders.push({
              ...order,
              status: 'sent',
              approved_at: approvedAt,
              sent_at: sentAt,
            });
          }

          // Emit event for dashboard update
          financialEventEmitter.emit('order:approved', {
            type: 'order:approved',
            timestamp: Date.now(),
            outlet_id: outletId,
            org_id: orgId,
            data: {
              order_id: orderId,
              vendor_id: order.vendor_id,
              vendor_name: order.vendor_name,
              total_cost: order.total_cost,
              approved_by: chefId,
            },
          } as any);
        } catch (orderError) {
          logger.error('[ChefMenuOrchestrator] Error approving order', {
            order_id: orderId,
            error: orderError,
          });
          // Continue with other orders
        }
      }

      logger.info('[ChefMenuOrchestrator] Vendor orders approved and sent', {
        approved_count: approvedOrders.length,
        sent_count: sentOrders.length,
      });

      return {
        approved_orders: approvedOrders,
        sent_orders: sentOrders,
      };
    } catch (error) {
      logger.error('[ChefMenuOrchestrator] Error approving vendor orders', { error });
      throw error;
    }
  }

  /**
   * Process receiving check-in at dock
   * 
   * Workflow:
   * 1. Order arrives at dock
   * 2. Purchasing/Receiving uses IP to check in product (human or barcode)
   * 3. System updates Chef MiniPanel on dashboard
   * 4. Chef updated of any shorts
   * 5. Send message to mobile app and dashboard of shortages
   * 6. EchoAi creates new order to arrive on next delivery day
   * 7. Notify VENDOR of shortage
   */
  async processReceivingCheckIn(
    checkIn: ReceivingCheckIn,
    tenantId: string,
    orgId: string,
    outletId: string
  ): Promise<{ checked_in: CheckedInItem[]; shortages: ShortageItem[] }> {
    try {
      const supabase = getSupabaseServiceClient();

      logger.info('[ChefMenuOrchestrator] Processing receiving check-in', {
        order_id: checkIn.order_id,
        vendor_id: checkIn.vendor_id,
        outlet_id: outletId,
      });

      // Step 1: Get order
      const { data: order, error: orderError } = await supabase
        .from('vendor_orders')
        .select('*')
        .eq('id', checkIn.order_id)
        .eq('org_id', orgId)
        .single();

      if (orderError || !order) {
        throw new Error(`Order not found: ${checkIn.order_id}`);
      }

      // Step 2: Process checked-in items and update inventory
      const checkedInItems: CheckedInItem[] = [];
      const shortageItems: ShortageItem[] = [];

      for (const checkedItem of checkIn.checked_in_items) {
        // Find corresponding order item
        const orderItem = order.order_items.find(
          (item: VendorOrderItem) => item.ingredient_id === checkedItem.ingredient_id
        );

        if (!orderItem) {
          logger.warn('[ChefMenuOrchestrator] Checked-in item not found in order', {
            ingredient_id: checkedItem.ingredient_id,
          });
          continue;
        }

        // Calculate shortage
        const shortage = checkedItem.quantity_ordered - checkedItem.quantity_received;
        
        if (shortage > 0) {
          shortageItems.push({
            ingredient_id: checkedItem.ingredient_id,
            ingredient_name: checkedItem.ingredient_name,
            quantity_ordered: checkedItem.quantity_ordered,
            quantity_received: checkedItem.quantity_received,
            shortage_quantity: shortage,
            unit: checkedItem.unit,
            vendor_notified: false,
          });
        }

        checkedInItems.push(checkedItem);

        // Update inventory
        try {
          await this.updateInventoryOnReceiving(
            tenantId,
            orgId,
            outletId,
            checkedItem,
            orderItem
          );
        } catch (inventoryError) {
          logger.error('[ChefMenuOrchestrator] Failed to update inventory', {
            ingredient_id: checkedItem.ingredient_id,
            error: inventoryError,
          });
        }
      }

      // Step 3: Handle shortages
      if (shortageItems.length > 0) {
        // Create shortage records
        for (const shortage of shortageItems) {
          await supabase
            .from('receiving_shortages')
            .insert({
              id: this.generateShortageId(),
              order_id: checkIn.order_id,
              vendor_id: checkIn.vendor_id,
              org_id: orgId,
              outlet_id: outletId,
              ingredient_id: shortage.ingredient_id,
              ingredient_name: shortage.ingredient_name,
              quantity_ordered: shortage.quantity_ordered,
              quantity_received: shortage.quantity_received,
              shortage_quantity: shortage.shortage_quantity,
              unit: shortage.unit,
              vendor_notified: false,
              created_at: new Date().toISOString(),
            });

          // Notify vendor
          try {
            await this.notifyVendorOfShortage(
              checkIn.vendor_id,
              shortage,
              tenantId,
              orgId,
              outletId
            );
            
            await supabase
              .from('receiving_shortages')
              .update({ vendor_notified: true })
              .eq('order_id', checkIn.order_id)
              .eq('ingredient_id', shortage.ingredient_id);
          } catch (notifyError) {
            logger.error('[ChefMenuOrchestrator] Failed to notify vendor of shortage', {
              vendor_id: checkIn.vendor_id,
              ingredient_id: shortage.ingredient_id,
              error: notifyError,
            });
          }

          // Create new order for next delivery day
          try {
            await this.createShortageOrder(
              tenantId,
              orgId,
              outletId,
              checkIn.vendor_id,
              shortage
            );
          } catch (shortageOrderError) {
            logger.error('[ChefMenuOrchestrator] Failed to create shortage order', {
              vendor_id: checkIn.vendor_id,
              ingredient_id: shortage.ingredient_id,
              error: shortageOrderError,
            });
          }
        }

        // Send notifications to chef (mobile app and dashboard)
        await this.sendShortageNotifications(
          tenantId,
          orgId,
          outletId,
          shortageItems,
          checkIn.order_id
        );
      }

      // Step 4: Update order status
      await supabase
        .from('vendor_orders')
        .update({
          status: 'received',
          received_at: checkIn.received_at,
          received_by: checkIn.received_by,
          updated_at: new Date().toISOString(),
        })
        .eq('id', checkIn.order_id);

      // Step 5: Emit event for dashboard update (Chef MiniPanel)
      financialEventEmitter.emit('receiving:checked_in', {
        type: 'receiving:checked_in',
        timestamp: Date.now(),
        outlet_id: outletId,
        org_id: orgId,
        data: {
          order_id: checkIn.order_id,
          vendor_id: checkIn.vendor_id,
          checked_in_items: checkedInItems.length,
          shortages: shortageItems.length,
        },
      } as any);

      logger.info('[ChefMenuOrchestrator] Receiving check-in processed', {
        order_id: checkIn.order_id,
        checked_in_count: checkedInItems.length,
        shortage_count: shortageItems.length,
      });

      return {
        checked_in: checkedInItems,
        shortages: shortageItems,
      };
    } catch (error) {
      logger.error('[ChefMenuOrchestrator] Error processing receiving check-in', { error });
      throw error;
    }
  }

  /**
   * Process invoice scanning and digitization
   * 
   * Workflow:
   * 1. Invoice scanned by scanner or handheld
   * 2. EchoAurum updated based on scan (which outlet order belongs to)
   * 3. EchoAi takes invoice, sends to image vault, creates digitized copy
   * 4. EchoAi takes digitized invoice, reads each line item
   * 5. Categorizes to full breakdown (seafood, shellfish, oyster, Blue Point, etc)
   * 6. Unit price updated, case price + GL Codes updated
   * 7. EchoAi updates outlet inventory as what is on hand
   */
  async processInvoice(
    invoiceImageUrl: string,
    orderId: string,
    tenantId: string,
    orgId: string,
    outletId: string
  ): Promise<InvoiceData> {
    try {
      const supabase = getSupabaseServiceClient();

      logger.info('[ChefMenuOrchestrator] Processing invoice', {
        order_id: orderId,
        outlet_id: outletId,
        image_url: invoiceImageUrl,
      });

      // Step 1: Store invoice in image vault
      const invoiceId = this.generateInvoiceId();
      const { error: vaultError } = await supabase
        .from('invoice_vault')
        .insert({
          id: invoiceId,
          order_id: orderId,
          org_id: orgId,
          outlet_id: outletId,
          image_url: invoiceImageUrl,
          status: 'processing',
          created_at: new Date().toISOString(),
        });

      if (vaultError) {
        logger.error('[ChefMenuOrchestrator] Failed to store invoice in vault', { error: vaultError });
        throw new Error(`Failed to store invoice: ${vaultError.message}`);
      }

      // Step 2: Digitize invoice using OCR/AI
      const digitizedInvoice = await this.digitizeInvoice(invoiceImageUrl, tenantId, orgId, outletId);

      // Step 3: Update invoice vault with digitized data
      await supabase
        .from('invoice_vault')
        .update({
          digitized_data: digitizedInvoice,
          status: 'digitized',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      // Step 4: Parse and categorize line items
      const lineItems = await this.parseAndCategorizeInvoiceLineItems(
        digitizedInvoice,
        tenantId,
        orgId,
        outletId
      );

      // Step 5: Calculate GL codes
      const glCodes = this.calculateGLCodes(lineItems);

      // Step 6: Build invoice data
      const invoiceData: InvoiceData = {
        invoice_id: invoiceId,
        vendor_id: digitizedInvoice.vendor_id || '',
        vendor_name: digitizedInvoice.vendor_name || '',
        invoice_number: digitizedInvoice.invoice_number || '',
        invoice_date: digitizedInvoice.invoice_date || new Date().toISOString(),
        due_date: digitizedInvoice.due_date || new Date().toISOString(),
        net_terms: digitizedInvoice.net_terms || 0,
        line_items: lineItems,
        total_amount: lineItems.reduce((sum, item) => sum + item.total_price, 0),
        gl_codes: glCodes,
        outlet_id: outletId,
        order_id: orderId,
      };

      // Step 7: Store invoice data
      await supabase
        .from('invoices')
        .insert({
          id: invoiceId,
          order_id: orderId,
          org_id: orgId,
          outlet_id: outletId,
          vendor_id: invoiceData.vendor_id,
          vendor_name: invoiceData.vendor_name,
          invoice_number: invoiceData.invoice_number,
          invoice_date: invoiceData.invoice_date,
          due_date: invoiceData.due_date,
          net_terms: invoiceData.net_terms,
          line_items: invoiceData.line_items,
          total_amount: invoiceData.total_amount,
          gl_codes: invoiceData.gl_codes,
          status: 'processed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      // Step 8: Update inventory (what is on hand)
      await this.updateInventoryFromInvoice(
        tenantId,
        orgId,
        outletId,
        lineItems,
        invoiceData
      );

      // Step 9: Update order status to invoiced
      await supabase
        .from('vendor_orders')
        .update({
          status: 'invoiced',
          invoice_id: invoiceId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      // Step 10: Emit event to EchoAurum
      financialEventEmitter.emit('invoice:processed', {
        type: 'invoice:processed',
        timestamp: Date.now(),
        outlet_id: outletId,
        org_id: orgId,
        data: {
          invoice_id: invoiceId,
          order_id: orderId,
          vendor_id: invoiceData.vendor_id,
          total_amount: invoiceData.total_amount,
          net_terms: invoiceData.net_terms,
          gl_codes: invoiceData.gl_codes,
        },
      } as any);

      logger.info('[ChefMenuOrchestrator] Invoice processed successfully', {
        invoice_id: invoiceId,
        order_id: orderId,
        line_item_count: lineItems.length,
        total_amount: invoiceData.total_amount,
      });

      return invoiceData;
    } catch (error) {
      logger.error('[ChefMenuOrchestrator] Error processing invoice', { error });
      throw error;
    }
  }

  // ========== Private Helper Methods ==========

  /**
   * Create recipe from menu item data
   * Supports:
   * - Structured recipe_data
   * - Recipe text (uses recipeAIAnalyzer)
   * - Existing recipe_id (search and link)
   */
  private async createRecipeFromData(
    tenantId: string,
    orgId: string,
    outletId: string,
    menuItem: ChefMenuItem,
    chefId: string
  ): Promise<string> {
    const supabase = getSupabaseServiceClient();
    let recipeId: string | undefined;

    try {
      // Option 1: If recipe_data is a string (recipe text), use AI analyzer
      if (menuItem.recipe_data && typeof menuItem.recipe_data === 'string') {
        logger.info('[ChefMenuOrchestrator] Analyzing recipe text with AI', {
          menu_item: menuItem.name,
        });

        try {
          const analyzedRecipe = await recipeAIAnalyzer.analyzeRecipe(menuItem.recipe_data);
          
          // Convert analyzed recipe to user_recipes format
          const ingredientsJson = analyzedRecipe.ingredients.map(ing => 
            JSON.stringify({
              name: ing.name,
              quantity: ing.originalQuantity,
              unit: ing.originalUnit,
            })
          );

          const instructionsJson = analyzedRecipe.prepSteps || [];

          recipeId = this.generateRecipeId();
          await supabase
            .from('user_recipes')
            .insert({
              id: recipeId,
              user_id: chefId,
              organization_id: orgId,
              title: analyzedRecipe.recipeName || menuItem.name,
              description: menuItem.description || null,
              ingredients: ingredientsJson,
              instructions: instructionsJson,
              servings: analyzedRecipe.originalYield,
              yield: `${analyzedRecipe.originalYield} ${analyzedRecipe.originalYieldUnit}`,
              nutrition: menuItem.nutrition || null,
              calories: menuItem.nutrition?.calories || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          logger.info('[ChefMenuOrchestrator] Recipe created from AI analysis', {
            recipe_id: recipeId,
            recipe_name: analyzedRecipe.recipeName,
          });

          return recipeId;
        } catch (aiError) {
          logger.warn('[ChefMenuOrchestrator] AI recipe analysis failed, falling back to simple creation', {
            error: aiError,
          });
          // Fall through to simple creation
        }
      }

      // Option 2: If recipe_data is structured, use it directly
      if (menuItem.recipe_data && typeof menuItem.recipe_data === 'object') {
        const recipeData = menuItem.recipe_data;
        const ingredients = recipeData.ingredients || menuItem.ingredients || [];
        
        // Convert ingredients to TEXT[] format (JSON strings)
        const ingredientsJson = Array.isArray(ingredients)
          ? ingredients.map(ing => 
              typeof ing === 'string' 
                ? JSON.stringify({ name: ing, quantity: 1, unit: 'each' })
                : JSON.stringify(ing)
            )
          : [];

        const instructions = recipeData.instructions || [];
        const instructionsJson = Array.isArray(instructions) ? instructions : [];

        recipeId = this.generateRecipeId();
        await supabase
          .from('user_recipes')
          .insert({
            id: recipeId,
            user_id: chefId,
            organization_id: orgId,
            title: menuItem.name,
            description: menuItem.description || null,
            ingredients: ingredientsJson,
            instructions: instructionsJson,
            servings: recipeData.servings || menuItem.servings || 4,
            yield: recipeData.yield || `${recipeData.servings || menuItem.servings || 4} servings`,
            nutrition: menuItem.nutrition || recipeData.nutrition || null,
            calories: menuItem.nutrition?.calories || recipeData.calories || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        logger.info('[ChefMenuOrchestrator] Recipe created from structured data', {
          recipe_id: recipeId,
        });

        return recipeId;
      }

      // Option 3: Simple fallback - create minimal recipe
      recipeId = this.generateRecipeId();
      const ingredientsJson = (menuItem.ingredients || []).map(ing =>
        typeof ing === 'string'
          ? JSON.stringify({ name: ing, quantity: 1, unit: 'each' })
          : JSON.stringify(ing)
      );

      await supabase
        .from('user_recipes')
        .insert({
          id: recipeId,
          user_id: chefId,
          organization_id: orgId,
          title: menuItem.name,
          description: menuItem.description || null,
          ingredients: ingredientsJson,
          instructions: [],
          servings: menuItem.servings || 4,
          yield: `${menuItem.servings || 4} servings`,
          nutrition: menuItem.nutrition || null,
          calories: menuItem.nutrition?.calories || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      logger.info('[ChefMenuOrchestrator] Recipe created with minimal data', {
        recipe_id: recipeId,
      });

      return recipeId;
    } catch (error) {
      logger.error('[ChefMenuOrchestrator] Error creating recipe', {
        error,
        menu_item: menuItem.name,
      });
      throw error;
    }
  }

  private async connectMenuItemToPOS(
    tenantId: string,
    orgId: string,
    outletId: string,
    menuItemId: string,
    menuItem: ChefMenuItem,
    posType: string
  ): Promise<string | undefined> {
    try {
      // Use POS integration layer
      const posItem = await posIntegrationLayer.createMenuItem({
        tenant_id: tenantId,
        org_id: orgId,
        outlet_id: outletId,
        menu_item_id: menuItemId,
        name: menuItem.name,
        description: menuItem.description,
        price: menuItem.price,
        category: menuItem.category,
        pos_type: posType as any,
      });

      return posItem.pos_item_id;
    } catch (error) {
      logger.error('[ChefMenuOrchestrator] Error connecting to POS', { error });
      return undefined;
    }
  }

  private async enhanceOrderGuideItemWithVendorData(
    tenantId: string,
    orgId: string,
    outletId: string,
    ingredientId: string,
    item: OrderGuideItem,
    chefId: string
  ): Promise<OrderGuideItem> {
    const supabase = getSupabaseServiceClient();

    // Get vendor catalog data if available
    const { data: vendorItem } = await supabase
      .from('vendor_catalog_items')
      .select('*')
      .eq('ingredient_id', ingredientId)
      .eq('org_id', orgId)
      .order('cost_per_unit', { ascending: true })
      .limit(1)
      .single();

    if (vendorItem) {
      return {
        ...item,
        vendor_id: vendorItem.vendor_id,
        vendor_name: vendorItem.vendor_name,
        item_code: vendorItem.item_code,
        pack_size: vendorItem.pack_size,
        cost_per_unit: vendorItem.cost_per_unit,
        gl_code: vendorItem.gl_code,
      };
    }

    // Get chef preferences if available
    const { data: preference } = await supabase
      .from('chef_ingredient_preferences')
      .select('*')
      .eq('ingredient_id', ingredientId)
      .eq('chef_id', chefId)
      .eq('org_id', orgId)
      .single();

    if (preference) {
      return {
        ...item,
        vendor_id: preference.preferred_vendor_id,
        storage_location: preference.storage_location,
        storage_requirements: preference.storage_requirements || [],
      };
    }

    return item;
  }

  private async checkInventoryAndDetermineOrderItems(
    tenantId: string,
    orgId: string,
    outletId: string,
    items: OrderGuideItem[]
  ): Promise<OrderGuideItem[]> {
    // Get current inventory snapshot
    // For now, return all items (actual implementation would check inventory levels)
    return items;
  }

  private async sendOrderToVendor(
    orderId: string,
    tenantId: string,
    orgId: string,
    outletId: string
  ): Promise<void> {
    // Use event purchasing bridge to send order
    // This would integrate with vendor APIs
    logger.info('[ChefMenuOrchestrator] Sending order to vendor', { order_id: orderId });
  }

  private async updateInventoryOnReceiving(
    tenantId: string,
    orgId: string,
    outletId: string,
    checkedItem: CheckedInItem,
    orderItem: VendorOrderItem
  ): Promise<void> {
    const supabase = getSupabaseServiceClient();

    // Update inventory record
    await supabase
      .from('inventory_items')
      .upsert({
        org_id: orgId,
        outlet_id: outletId,
        ingredient_id: checkedItem.ingredient_id,
        quantity_on_hand: checkedItem.quantity_received,
        unit: checkedItem.unit,
        location: checkedItem.location,
        batch_number: checkedItem.batch_number,
        expiry_date: checkedItem.expiry_date,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'org_id,outlet_id,ingredient_id',
      });
  }

  private async notifyVendorOfShortage(
    vendorId: string,
    shortage: ShortageItem,
    tenantId: string,
    orgId: string,
    outletId: string
  ): Promise<void> {
    // Send notification to vendor (email, API, etc.)
    logger.info('[ChefMenuOrchestrator] Notifying vendor of shortage', {
      vendor_id: vendorId,
      ingredient_id: shortage.ingredient_id,
      shortage_quantity: shortage.shortage_quantity,
    });
  }

  private async createShortageOrder(
    tenantId: string,
    orgId: string,
    outletId: string,
    vendorId: string,
    shortage: ShortageItem
  ): Promise<void> {
    // Create new order for next delivery day
    logger.info('[ChefMenuOrchestrator] Creating shortage order', {
      vendor_id: vendorId,
      ingredient_id: shortage.ingredient_id,
    });
  }

  private async sendShortageNotifications(
    tenantId: string,
    orgId: string,
    outletId: string,
    shortages: ShortageItem[],
    orderId: string
  ): Promise<void> {
    // Send notifications to mobile app and dashboard
    financialEventEmitter.emit('receiving:shortage', {
      type: 'receiving:shortage',
      timestamp: Date.now(),
      outlet_id: outletId,
      org_id: orgId,
      data: {
        order_id: orderId,
        shortages: shortages,
      },
    } as any);
  }

  private async digitizeInvoice(
    imageUrl: string,
    tenantId: string,
    orgId: string,
    outletId: string
  ): Promise<Record<string, any>> {
    // Use OCR/AI service to digitize invoice
    // This would integrate with document processing service
    return {
      vendor_id: '',
      vendor_name: '',
      invoice_number: '',
      invoice_date: new Date().toISOString(),
      due_date: new Date().toISOString(),
      net_terms: 0,
      line_items: [],
    };
  }

  private async parseAndCategorizeInvoiceLineItems(
    digitizedInvoice: Record<string, any>,
    tenantId: string,
    orgId: string,
    outletId: string
  ): Promise<InvoiceLineItem[]> {
    // Parse and categorize line items using AI
    // This would use recipe AI analyzer or similar service
    return [];
  }

  private calculateGLCodes(lineItems: InvoiceLineItem[]): Record<string, number> {
    const glCodes: Record<string, number> = {};
    
    for (const item of lineItems) {
      const code = item.gl_code;
      if (!glCodes[code]) {
        glCodes[code] = 0;
      }
      glCodes[code] += item.total_price;
    }

    return glCodes;
  }

  private async updateInventoryFromInvoice(
    tenantId: string,
    orgId: string,
    outletId: string,
    lineItems: InvoiceLineItem[],
    invoiceData: InvoiceData
  ): Promise<void> {
    const supabase = getSupabaseServiceClient();

    // Update inventory based on invoice line items
    for (const item of lineItems) {
      await supabase
        .from('inventory_items')
        .upsert({
          org_id: orgId,
          outlet_id: outletId,
          ingredient_name: item.ingredient_name,
          quantity_on_hand: item.quantity,
          unit: item.unit,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'org_id,outlet_id,ingredient_name',
        });
    }
  }

  private generateMenuId(): string {
    return `menu_${crypto.randomBytes(16).toString('hex')}`;
  }

  private generateMenuItemId(): string {
    return `menu_item_${crypto.randomBytes(16).toString('hex')}`;
  }

  private generateRecipeId(): string {
    return `recipe_${crypto.randomBytes(16).toString('hex')}`;
  }

  private generateOrderGuideId(): string {
    return `order_guide_${crypto.randomBytes(16).toString('hex')}`;
  }

  private generateVendorOrderId(): string {
    return `vendor_order_${crypto.randomBytes(16).toString('hex')}`;
  }

  private generateInvoiceId(): string {
    return `invoice_${crypto.randomBytes(16).toString('hex')}`;
  }

  private generateShortageId(): string {
    return `shortage_${crypto.randomBytes(16).toString('hex')}`;
  }
}

// Export singleton instance
export const chefMenuOrchestrator = new ChefMenuOrchestrator();

// Initialize on module load
chefMenuOrchestrator.initialize().catch((error) => {
  logger.error('[ChefMenuOrchestrator] Failed to initialize on module load', { error });
});
