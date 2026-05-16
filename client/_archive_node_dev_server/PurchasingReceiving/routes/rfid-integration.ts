import { Router, Request, Response } from "express";
import { z } from "zod";
import { logger, sanitizeError } from "../lib/logger";
import { validateRequest, UUIDSchema } from "../middleware/validation";
import { rfidReaderService } from "../lib/rfid-reader-service";
const router = Router(); // ============================================================================
// TAG REGISTRATION
// ============================================================================ /** * POST /tags * Register new RFID tag */
router.post(
  "/tags",
  validateRequest({
    body: z.object({
      organization_id: UUIDSchema,
      outlet_id: UUIDSchema,
      product_id: UUIDSchema,
      product_name: z.string(),
      sku_code: z.string(),
      track_movement: z.boolean().default(false),
    }),
  }),
  async (req: Request, res: Response) => {
    try {
      const {
        organization_id,
        outlet_id,
        product_id,
        product_name,
        sku_code,
        track_movement,
      } = req.body;
      const tag = await rfidReaderService.registerTag(
        organization_id,
        outlet_id,
        product_id,
        product_name,
        sku_code,
        track_movement,
      );
      res.status(201).json(tag);
    } catch (error) {
      logger.error("POST /tags failed", { error: sanitizeError(error) });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); // ============================================================================
// RFID READS
// ============================================================================ /** * POST /reads * Process RFID read from reader device */
router.post(
  "/reads",
  validateRequest({
    body: z.object({
      reader_id: z.string(),
      location_id: z.string(),
      location: z.string(),
      epc: z.string(),
      signal_strength: z.number().min(-100).max(-30),
      temperature: z.number().optional(),
      humidity: z.number().optional(),
    }),
  }),
  async (req: Request, res: Response) => {
    try {
      const {
        reader_id,
        location_id,
        location,
        epc,
        signal_strength,
        temperature,
        humidity,
      } = req.body;
      const read = await rfidReaderService.processRead(
        reader_id,
        location_id,
        location,
        epc,
        signal_strength,
        temperature,
        humidity,
      );
      res.status(201).json(read);
    } catch (error) {
      logger.error("POST /reads failed", { error: sanitizeError(error) });
      res.status(400).json({ error: (error as Error).message });
    }
  },
); /** * POST /batch-reads * Process batch of RFID reads (for bulk operations) */
router.post(
  "/batch-reads",
  validateRequest({
    body: z.object({
      reads: z.array(
        z.object({
          reader_id: z.string(),
          location_id: z.string(),
          location: z.string(),
          epc: z.string(),
          signal_strength: z.number(),
          temperature: z.number().optional(),
          humidity: z.number().optional(),
        }),
      ),
    }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { reads } = req.body;
      const results = [];
      const errors = [];
      for (const read of reads) {
        try {
          const result = await rfidReaderService.processRead(
            read.reader_id,
            read.location_id,
            read.location,
            read.epc,
            read.signal_strength,
            read.temperature,
            read.humidity,
          );
          results.push(result);
        } catch (error) {
          errors.push({ epc: read.epc, error: (error as Error).message });
        }
      }
      res.status(207).json({
        successful: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      logger.error("POST /batch-reads failed", { error: sanitizeError(error) });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); // ============================================================================
// READER CONNECTIVITY
// ============================================================================ /** * POST /readers/:readerId/heartbeat * Report reader device is online */
router.post(
  "/readers/:readerId/heartbeat",
  validateRequest({
    params: z.object({ readerId: z.string() }),
    body: z.object({ organization_id: UUIDSchema }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { readerId } = req.params;
      const { organization_id } = req.body;
      await rfidReaderService.heartbeat(readerId, organization_id);
      res.json({
        reader_id: readerId,
        status: "online",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("POST /readers/:readerId/heartbeat failed", {
        error: sanitizeError(error),
      });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); // ============================================================================
// TAG LOCATION & HISTORY
// ============================================================================ /** * GET /tags/:tagId/location-history * Get tag movement history */
router.get(
  "/tags/:tagId/location-history",
  validateRequest({
    params: z.object({ tagId: UUIDSchema }),
    query: z.object({ hours: z.string().default("24") }),
  }),
  async (req: Request, res: Response) => {
    try {
      const { tagId } = req.params;
      const { hours } = req.query;
      const history = await rfidReaderService.getTagLocationHistory(
        tagId,
        parseInt(hours as string),
      );
      res.json({
        tag_id: tagId,
        period_hours: parseInt(hours as string),
        location_count: history.length,
        history,
      });
    } catch (error) {
      logger.error("GET /tags/:tagId/location-history failed", {
        error: sanitizeError(error),
      });
      res.status(500).json({ error: (error as Error).message });
    }
  },
); /** * GET /tags/epc/:epc/current-location * Get current location of tag by EPC */
router.get(
  "/tags/epc/:epc/current-location",
  async (req: Request, res: Response) => {
    try {
      const { epc } = req.params;
      const location = await rfidReaderService.getTagCurrentLocation(epc);
      res.json({
        epc,
        current_location: location,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("GET /tags/epc/:epc/current-location failed", {
        error: sanitizeError(error),
      });
      res.status(500).json({ error: (error as Error).message });
    }
  },
);
export default router;
