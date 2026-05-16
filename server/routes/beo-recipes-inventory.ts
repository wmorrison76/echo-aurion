/**
 * BEO Recipes & Inventory Routes
 *
 * REST API for:
 * - Linking/unlinking recipes to BEO menu items
 * - Fetching enriched inventory data from Purchasing module
 * - Creating purchase orders for short items
 */

import express, { Request, Response } from "express";
import { getOrgContext } from "../lib/org-context";
import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";
import { basicAuthMiddleware } from "../middleware/auth";
import { scaleBEORecipes } from "../services/beo-recipe-scaling-service";
import { StrictModeError } from "../lib/strict-mode";

const router = express.Router();

/**
 * POST /beo/:beoId/link-recipe
 * Link a recipe to a menu item
 */
router.post("/:beoId/link-recipe", async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const { menuItemId, recipeId, recipeName } = req.body;
    const orgContext = getOrgContext(req);
    const userId = (req as any).user?.id;

    if (!menuItemId || !recipeId) {
      return res.status(400).json({
        success: false,
        error: "menuItemId and recipeId are required",
      });
    }

    // Create or update recipe link
    const { data, error } = await supabase
      .from("beo_recipe_links")
      .upsert(
        {
          beo_id: beoId,
          org_id: orgContext.orgId,
          menu_item_id: menuItemId,
          recipe_id: recipeId,
          recipe_name: recipeName,
          linked_by: userId,
          linked_at: new Date().toISOString(),
        },
        {
          onConflict: "beo_id,menu_item_id",
        },
      )
      .select();

    if (error) {
      throw new Error(`Failed to link recipe: ${error.message}`);
    }

    logger.info("[BEO-RECIPES] Recipe linked:", {
      beoId,
      menuItemId,
      recipeId,
    });

    res.json({ success: true, data: data?.[0] });
  } catch (err) {
    logger.error("[BEO-RECIPES] Link error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to link recipe",
    });
  }
});

/**
 * POST /beo/:beoId/unlink-recipe
 * Unlink a recipe from a menu item
 */
router.post("/:beoId/unlink-recipe", async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const { menuItemId } = req.body;
    const orgContext = getOrgContext(req);

    if (!menuItemId) {
      return res.status(400).json({
        success: false,
        error: "menuItemId is required",
      });
    }

    const { error } = await supabase
      .from("beo_recipe_links")
      .delete()
      .eq("beo_id", beoId)
      .eq("org_id", orgContext.orgId)
      .eq("menu_item_id", menuItemId);

    if (error) {
      throw new Error(`Failed to unlink recipe: ${error.message}`);
    }

    logger.info("[BEO-RECIPES] Recipe unlinked:", { beoId, menuItemId });

    res.json({ success: true });
  } catch (err) {
    logger.error("[BEO-RECIPES] Unlink error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to unlink recipe",
    });
  }
});

/**
 * GET /beo/:beoId/inventory-enriched
 * Fetch enriched inventory data with purchase order information
 */
router.get(
  "/:beoId/inventory-enriched",
  async (req: Request, res: Response) => {
    try {
      const { beoId } = req.params;
      const orgContext = getOrgContext(req);

      // Fetch base inventory from BEO detail
      const { data: beoData, error: beoError } = await supabase
        .from("beo_banquet_orders")
        .select(
          `
          id,
          event_id,
          status,
          content_data
        `,
        )
        .eq("id", beoId)
        .eq("org_id", orgContext.orgId)
        .single();

      if (beoError || !beoData) {
        throw new Error(`BEO not found: ${beoId}`);
      }

      // Fetch related inventory from inventory system
      const { data: inventoryItems, error: inventoryError } = await supabase
        .from("inventory_items")
        .select(
          `
          id,
          product_id,
          location_id,
          product_name,
          unit,
          quantity_on_hand,
          quantity_pending,
          quantity_required,
          status
        `,
        )
        .eq("org_id", orgContext.orgId);

      if (inventoryError) {
        logger.warn("[BEO-INVENTORY] Inventory fetch error:", inventoryError);
      }

      // Fetch related purchase orders
      const { data: purchaseOrders, error: poError } = await supabase
        .from("event_purchase_orders")
        .select("id, product_id, quantity, status, delivery_date, supplier_id")
        .eq("event_id", beoData.event_id)
        .eq("org_id", orgContext.orgId);

      if (poError) {
        logger.warn("[BEO-INVENTORY] PO fetch error:", poError);
      }

      // Enrich inventory with PO information
      const enrichedItems = (inventoryItems || []).map((item) => {
        const relatedPOs = (purchaseOrders || []).filter(
          (po) => po.product_id === item.product_id,
        );
        const pendingDelivery = relatedPOs.reduce(
          (sum, po) => sum + (po.status === "pending" ? po.quantity : 0),
          0,
        );

        return {
          itemName: item.product_name,
          onHand: item.quantity_on_hand,
          unit: item.unit,
          pendingDelivery,
          estimatedArrival: relatedPOs[0]?.delivery_date,
          status: item.status as "covered" | "tight" | "short",
          productId: item.product_id,
          locationId: item.location_id,
          purchaseOrderId: relatedPOs[0]?.id,
          recommendedOrder:
            item.status === "short"
              ? Math.max(0, item.quantity_required - item.quantity_on_hand - pendingDelivery)
              : undefined,
        };
      });

      res.json({
        success: true,
        items: enrichedItems,
      });
    } catch (err) {
      logger.error("[BEO-INVENTORY] Enrichment error:", err);
      res.status(500).json({
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to fetch inventory",
      });
    }
  },
);

/**
 * POST /beo/:beoId/create-purchase-order
 * Create a purchase order for a short inventory item
 */
router.post(
  "/:beoId/create-purchase-order",
  async (req: Request, res: Response) => {
    try {
      const { beoId } = req.params;
      const { productId, quantity, itemName, unit } = req.body;
      const orgContext = getOrgContext(req);
      const userId = (req as any).user?.id;

      if (!productId || !quantity) {
        return res.status(400).json({
          success: false,
          error: "productId and quantity are required",
        });
      }

      // Fetch BEO for event_id
      const { data: beoData, error: beoError } = await supabase
        .from("beo_banquet_orders")
        .select("event_id")
        .eq("id", beoId)
        .eq("org_id", orgContext.orgId)
        .single();

      if (beoError || !beoData) {
        throw new Error(`BEO not found: ${beoId}`);
      }

      // Create purchase order
      const { data: poData, error: poError } = await supabase
        .from("event_purchase_orders")
        .insert({
          event_id: beoData.event_id,
          org_id: orgContext.orgId,
          product_id: productId,
          product_name: itemName,
          quantity,
          unit,
          status: "pending",
          created_by: userId,
          created_at: new Date().toISOString(),
        })
        .select();

      if (poError) {
        throw new Error(`Failed to create PO: ${poError.message}`);
      }

      logger.info("[BEO-INVENTORY] Purchase order created:", {
        beoId,
        productId,
        quantity,
      });

      // Emit Stratus event for decision intelligence
      try {
        const { emitPurchaseOrderCreated } = await import("../lib/module-event-emitters.js");
        if (poData && poData[0]) {
          const po = poData[0];
          await emitPurchaseOrderCreated({
            tenant_id: orgContext.orgId,
            org_id: orgContext.orgId,
            outlet_id: "default-outlet", // Should get from BEO
            po_id: po.id,
            po_number: `PO-${po.id}`,
            vendor_id: undefined, // Would need vendor from product
            vendor_name: undefined,
            total_amount: (quantity * (po.unit ? 0 : 0)) || 0, // Would need unit price
            items: [{
              id: productId,
              name: itemName || "Unknown Item",
              quantity: quantity,
              unit_price: 0, // Would need from product
              total: 0,
            }],
            created_at: po.created_at || new Date().toISOString(),
            created_by: userId,
          });
        }
      } catch (stratusError) {
        logger.warn("[BEO-INVENTORY] Failed to emit Stratus PO event:", stratusError);
        // Don't fail if Stratus event emission fails
      }

      res.json({ success: true, id: poData?.[0]?.id, data: poData?.[0] });
    } catch (err) {
      logger.error("[BEO-INVENTORY] PO creation error:", err);
      res.status(500).json({
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to create purchase order",
      });
    }
  },
);

/**
 * POST /beo/:beoId/scale-recipes  (A3)
 *
 * Trigger recipe scaling for a BEO. Usually fired automatically by the
 * EventLifecycleEngine when the BEO is approved, but exposed manually so
 * the chef can re-scale after a guest-count change without waiting for a
 * stage transition.
 *
 * Body: { guestCountOverride?: number, replaceExisting?: boolean }
 * Response: { success, result }
 */
router.post("/:beoId/scale-recipes", basicAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const userId = (req as any).user?.id;
    const { guestCountOverride, replaceExisting, allowSoftFail } = req.body ?? {};

    const result = await scaleBEORecipes({
      beoId,
      guestCountOverride: typeof guestCountOverride === "number" ? guestCountOverride : undefined,
      replaceExisting: replaceExisting !== false,
      userId,
      allowSoftFail: allowSoftFail === true ? true : undefined,
    });

    res.json({ success: true, result });
  } catch (err) {
    if (err instanceof StrictModeError) {
      // 422 Unprocessable Entity — request was understood but the data
      // it points at isn't ready (e.g. linked recipes missing from catalog).
      logger.warn("[BEO-RECIPES] scale rejected by strict mode:", err.details);
      return res.status(422).json({
        success: false,
        error: err.message,
        strictModeArea: err.area,
        details: err.details,
      });
    }
    logger.error("[BEO-RECIPES] scale error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to scale recipes",
    });
  }
});

export { router };
