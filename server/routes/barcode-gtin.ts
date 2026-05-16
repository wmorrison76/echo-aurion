/**
 * Barcode/GTIN Integration API Routes
 * 
 * Endpoints for barcode scanning, GTIN lookup, and product matching
 */

import { Router, Request, Response } from "express";
import { barcodeGTINService } from "../services/barcode-gtin-service";
import { requireAuth } from "../middleware/auth";
import { getUserOrgId } from "../lib/multi-tenant";
import { logger } from "../lib/logger";

const router = Router();

/**
 * POST /api/barcode-gtin/scan
 * Scan a barcode and get product matches
 */
router.post("/scan", requireAuth, async (req: Request, res: Response) => {
  try {
    const { barcode } = req.body;
    const orgId = getUserOrgId(req);

    if (!barcode || typeof barcode !== "string") {
      return res.status(400).json({
        error: "INVALID_BARCODE",
        message: "Barcode string is required",
      });
    }

    if (!orgId) {
      return res.status(400).json({
        error: "MISSING_ORG_ID",
        message: "Organization ID is required",
      });
    }

    const result = await barcodeGTINService.scanBarcode(barcode, orgId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("[BarcodeGTIN] Error scanning barcode", { error, body: req.body });
    res.status(500).json({
      error: "SCAN_FAILED",
      message: "Failed to scan barcode",
    });
  }
});

/**
 * GET /api/barcode-gtin/lookup/:gtin
 * Lookup GTIN (UPC, EAN, ISBN)
 */
router.get("/lookup/:gtin", requireAuth, async (req: Request, res: Response) => {
  try {
    const { gtin } = req.params;
    const orgId = getUserOrgId(req);

    if (!gtin) {
      return res.status(400).json({
        error: "INVALID_GTIN",
        message: "GTIN is required",
      });
    }

    if (!orgId) {
      return res.status(400).json({
        error: "MISSING_ORG_ID",
        message: "Organization ID is required",
      });
    }

    const result = await barcodeGTINService.lookupGTIN(gtin, orgId);

    if (!result) {
      return res.status(404).json({
        error: "GTIN_NOT_FOUND",
        message: "GTIN not found in internal or external databases",
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("[BarcodeGTIN] Error looking up GTIN", { error, gtin: req.params.gtin });
    res.status(500).json({
      error: "LOOKUP_FAILED",
      message: "Failed to lookup GTIN",
    });
  }
});

/**
 * POST /api/barcode-gtin/match
 * Match product by name (fuzzy matching)
 */
router.post("/match", requireAuth, async (req: Request, res: Response) => {
  try {
    const { productName } = req.body;
    const orgId = getUserOrgId(req);

    if (!productName || typeof productName !== "string") {
      return res.status(400).json({
        error: "INVALID_PRODUCT_NAME",
        message: "Product name is required",
      });
    }

    if (!orgId) {
      return res.status(400).json({
        error: "MISSING_ORG_ID",
        message: "Organization ID is required",
      });
    }

    const matches = await barcodeGTINService.matchProductByName(productName, orgId);

    res.json({
      success: true,
      data: {
        query: productName,
        matches,
      },
    });
  } catch (error) {
    logger.error("[BarcodeGTIN] Error matching product", { error, body: req.body });
    res.status(500).json({
      error: "MATCH_FAILED",
      message: "Failed to match product",
    });
  }
});

/**
 * POST /api/barcode-gtin/associate
 * Associate barcode/GTIN with a product
 */
router.post("/associate", requireAuth, async (req: Request, res: Response) => {
  try {
    const { productId, barcode, gtin } = req.body;
    const orgId = getUserOrgId(req);

    if (!productId || !barcode) {
      return res.status(400).json({
        error: "MISSING_PARAMETERS",
        message: "productId and barcode are required",
      });
    }

    if (!orgId) {
      return res.status(400).json({
        error: "MISSING_ORG_ID",
        message: "Organization ID is required",
      });
    }

    await barcodeGTINService.associateBarcode(productId, barcode, gtin, orgId);

    res.json({
      success: true,
      message: "Barcode associated successfully",
    });
  } catch (error) {
    logger.error("[BarcodeGTIN] Error associating barcode", { error, body: req.body });
    res.status(500).json({
      error: "ASSOCIATION_FAILED",
      message: "Failed to associate barcode with product",
    });
  }
});

/**
 * POST /api/barcode-gtin/ingredient-match
 * Match barcode to recipe ingredient
 */
router.post("/ingredient-match", requireAuth, async (req: Request, res: Response) => {
  try {
    const { barcode } = req.body;
    const orgId = getUserOrgId(req);

    if (!barcode || typeof barcode !== "string") {
      return res.status(400).json({
        error: "INVALID_BARCODE",
        message: "Barcode string is required",
      });
    }

    if (!orgId) {
      return res.status(400).json({
        error: "MISSING_ORG_ID",
        message: "Organization ID is required",
      });
    }

    const result = await barcodeGTINService.matchToIngredient(barcode, orgId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("[BarcodeGTIN] Error matching ingredient", { error, body: req.body });
    res.status(500).json({
      error: "MATCH_FAILED",
      message: "Failed to match barcode to ingredient",
    });
  }
});

/**
 * POST /api/barcode-gtin/parse
 * Parse barcode string and determine type
 */
router.post("/parse", requireAuth, async (req: Request, res: Response) => {
  try {
    const { barcode } = req.body;

    if (!barcode || typeof barcode !== "string") {
      return res.status(400).json({
        error: "INVALID_BARCODE",
        message: "Barcode string is required",
      });
    }

    const result = barcodeGTINService.parseBarcode(barcode);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("[BarcodeGTIN] Error parsing barcode", { error, body: req.body });
    res.status(500).json({
      error: "PARSE_FAILED",
      message: "Failed to parse barcode",
    });
  }
});

export default router;
