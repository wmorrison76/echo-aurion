/**
 * Nutrition / allergen chain API (Moat 2: recipe and menu intelligence)
 * GET /api/nutrition/allergen-chain?ingredientId=...
 * GET /api/nutrition/menu-dietary?tags=gluten-free,keto — filter menu items by dietary tags
 * Propagation: ingredient -> recipe -> menu item -> BEO; dietary flags and nutrition.
 */

import { Router, Request, Response } from "express";
import { getOrgContext } from "../lib/org-context";

const router = Router();

export interface AllergenChainNode {
  type: string;
  id: string;
  name: string;
  allergens: string[];
  crossContactRisk?: string;
}

export interface MenuDietaryItem {
  id: string;
  name: string;
  dietaryTags: string[];
  allergens: string[];
  calories?: number;
  glutenFree?: boolean;
  nutSafe?: boolean;
  vegan?: boolean;
  keto?: boolean;
}

/**
 * GET /api/nutrition/allergen-chain?ingredientId=...
 */
router.get("/allergen-chain", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const ingredientId = String(req.query.ingredientId || "default").trim();
    const chain: AllergenChainNode[] = [
      { type: "ingredient", id: ingredientId, name: "Sample ingredient", allergens: ["gluten"], crossContactRisk: "low" },
      { type: "recipe", id: "recipe-1", name: "Sample recipe", allergens: ["gluten"], crossContactRisk: "medium" },
      { type: "menu_item", id: "menu-1", name: "Sample menu item", allergens: ["gluten"], crossContactRisk: "medium" },
    ];
    res.json({ ingredientId, orgId: orgContext.orgId, chain });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message, chain: [] });
  }
});

/**
 * GET /api/nutrition/menu-dietary?tags=gluten-free,keto,vegan
 * Returns menu items that have all of the requested dietary tags (one source of truth for POS/guest).
 */
router.get("/menu-dietary", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const tagsParam = (req.query.tags as string) || "";
    const tags = tagsParam.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    // Stub: in production query menu/recipe tables with dietary flags; propagate from recipe to menu
    const stubItems: MenuDietaryItem[] = [
      { id: "m1", name: "Grilled Salmon", dietaryTags: ["gluten-free", "keto"], allergens: [], calories: 420, glutenFree: true, keto: true },
      { id: "m2", name: "House Salad", dietaryTags: ["vegan", "gluten-free"], allergens: [], calories: 180, glutenFree: true, vegan: true },
    ];
    const filtered = tags.length === 0
      ? stubItems
      : stubItems.filter((item) => tags.every((t) => item.dietaryTags.includes(t) || (t === "gluten-free" && item.glutenFree) || (t === "keto" && item.keto) || (t === "vegan" && item.vegan) || (t === "nut-safe" && item.nutSafe)));
    res.json({ orgId: orgContext.orgId, tags, items: filtered });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message, items: [] });
  }
});

export const nutritionAllergenRouter = router;
