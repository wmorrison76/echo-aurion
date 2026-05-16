import { Router, type Request, type Response } from "express";
import {
  getCrawlerProgress,
  startCrawlerSession,
  getCrawlerStats,
  getFlavorMatrix,
  getIngredientFlavorProfile,
  getCuisineFlavor,
} from "./echo-crawler-progress";
export const echoCrawlerRouter =
  Router(); /** * GET /api/echo/crawler/progress * Server-Sent Events endpoint for real-time crawler progress */
echoCrawlerRouter.get(
  "/crawler/progress",
  getCrawlerProgress,
); /** * POST /api/echo/crawler/start-crawl * Start a new crawler session with real-time progress * Supports Phase 1 (legacy) and Phase 4 (global) modes */
echoCrawlerRouter.post(
  "/crawler/start-crawl",
  startCrawlerSession,
); /** * GET /api/echo/crawler/stats * Get current crawler statistics */
echoCrawlerRouter.get(
  "/crawler/stats",
  getCrawlerStats,
); /** * GET /api/echo/crawler/flavor-matrix * Get global flavor matrix data with statistics */
echoCrawlerRouter.get(
  "/crawler/flavor-matrix",
  getFlavorMatrix,
); /** * GET /api/echo/crawler/ingredient-flavor/:ingredient * Get flavor profile and similar ingredients */
echoCrawlerRouter.get(
  "/crawler/ingredient-flavor/:ingredient",
  getIngredientFlavorProfile,
); /** * GET /api/echo/crawler/cuisine-flavor/:cuisine * Get flavor pattern for a cuisine */
echoCrawlerRouter.get("/crawler/cuisine-flavor/:cuisine", getCuisineFlavor);
export default echoCrawlerRouter;
