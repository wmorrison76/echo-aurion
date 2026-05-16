/**
 * Echo AI^3 — Recipe Chain HTTP surface
 *
 * Exposes the cognition-side recipe chain to clients (the EMERGENT Culinary
 * page, MaestroBQT, Pastry, BanquetMenuBuilder) and to other AI^3 services
 * that drive composition over HTTP.
 *
 *   POST /api/echo-ai3/recipe-chain/build         — build a Recipe from a ChefIntent
 *   POST /api/echo-ai3/recipe-chain/compose       — compose a Dish from Recipes
 *   POST /api/echo-ai3/recipe-chain/publish-pos   — publish Dish cost to a POS system
 *   POST /api/echo-ai3/recipe-chain/run           — convenience: build → compose → publish
 *   GET  /api/echo-ai3/recipe-chain/recipe/:id    — read a built Recipe
 *   GET  /api/echo-ai3/recipe-chain/dish/:id      — read a composed Dish
 *   GET  /api/echo-ai3/recipe-chain/publications  — list recent POS publications
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { basicAuthMiddleware } from "../middleware/auth";
import {
  buildRecipeFromIntent,
  composeDishFromRecipes,
  publishDishCostToPos,
  runFullChain,
  getChainRecipe,
  getChainDish,
  listRecentPublications,
  type ChefIntent,
  type RecipeChainContext,
} from "../services/echo-ai3/recipe-chain";

const router = Router();

const ItemSchema = z.object({
  name: z.string().min(1),
  qty: z.union([z.number(), z.string().transform((v) => Number(v))]),
  unit: z.string().min(1),
  prep: z.string().optional(),
  unitCost: z.number().optional(),
  yieldPct: z.number().min(0).max(1000).optional(),
});

const IntentSchema = z.object({
  name: z.string().min(1),
  servings: z.union([z.number(), z.string().transform((v) => Number(v))]),
  items: z.array(ItemSchema).min(1),
  notes: z.string().optional(),
  courseHint: z.string().optional(),
  orgId: z.string().optional(),
});

const ComposeSchema = z.object({
  dishName: z.string().min(1),
  components: z
    .array(
      z.object({
        recipeId: z.string().min(1),
        portions: z.union([z.number(), z.string().transform((v) => Number(v))]),
      }),
    )
    .min(1),
  plateNotes: z.string().optional(),
  orgId: z.string().optional(),
});

const PublishSchema = z.object({
  dishId: z.string().min(1),
  posSystem: z.string().min(1),
  posCode: z.string().min(1),
  sellPrice: z.number().optional(),
  outletId: z.string().optional(),
  orgId: z.string().optional(),
});

const RunChainSchema = z.object({
  intent: IntentSchema,
  portionsPerDish: z.number().optional(),
  pos: z
    .object({
      posSystem: z.string().min(1),
      posCode: z.string().min(1),
      sellPrice: z.number().optional(),
      outletId: z.string().optional(),
    })
    .optional(),
});

function ctxFor(req: Request): RecipeChainContext {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || "";
  const originBase = host ? `${proto}://${host}` : undefined;
  return {
    originBase,
    req,
    userId: (req as any).user?.id,
  };
}

router.post("/build", basicAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const intent = IntentSchema.parse(req.body) as ChefIntent;
    const recipe = await buildRecipeFromIntent(intent, ctxFor(req));
    res.status(201).json({ success: true, recipe });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("[EchoAI3.RecipeChain] build failed", { message });
    res.status(400).json({ success: false, error: message });
  }
});

router.post("/compose", basicAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const input = ComposeSchema.parse(req.body);
    const dish = await composeDishFromRecipes(input, ctxFor(req));
    res.status(201).json({ success: true, dish });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("[EchoAI3.RecipeChain] compose failed", { message });
    res.status(400).json({ success: false, error: message });
  }
});

router.post("/publish-pos", basicAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const input = PublishSchema.parse(req.body);
    const publication = await publishDishCostToPos(input, ctxFor(req));
    res.status(201).json({ success: true, publication });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("[EchoAI3.RecipeChain] publish failed", { message });
    res.status(400).json({ success: false, error: message });
  }
});

router.post("/run", basicAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const args = RunChainSchema.parse(req.body);
    const result = await runFullChain({ ...args, ctx: ctxFor(req) });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("[EchoAI3.RecipeChain] run failed", { message });
    res.status(400).json({ success: false, error: message });
  }
});

router.get("/recipe/:id", (req: Request, res: Response) => {
  const recipe = getChainRecipe(req.params.id);
  if (!recipe) return res.status(404).json({ success: false, error: "recipe not found" });
  res.json({ success: true, recipe });
});

router.get("/dish/:id", (req: Request, res: Response) => {
  const dish = getChainDish(req.params.id);
  if (!dish) return res.status(404).json({ success: false, error: "dish not found" });
  res.json({ success: true, dish });
});

router.get("/publications", (req: Request, res: Response) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  res.json({ success: true, publications: listRecentPublications(limit) });
});

export const echoAi3RecipeChainRouter = router;
export default router;
