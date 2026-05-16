/**
 * Volume Detection API Routes
 * Handles volume detection requests from mobile app
 */

import { Router } from "express";
import { VolumeDetectionService } from "../services/volume-detection-service";
import { captureException } from "../sentry-init";

const router = Router();

/**
 * POST /api/volume/detect
 * Detect volume from bottle image
 */
router.post("/detect", async (req, res) => {
  try {
    const { image, mode, timestamp } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: "Image is required",
      });
    }

    const result = await VolumeDetectionService.detectVolume({
      image,
      mode: mode || "bottle",
      timestamp,
    });

    res.json(result);
  } catch (error) {
    console.error("[VOLUME-DETECTION] API error:", error);
    captureException(error as Error, { context: "volume-detection.detect" });

    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /api/volume/override
 * Record manual override for ML model improvement
 */
router.post("/override", async (req, res) => {
  try {
    const { scanId, manualVolume } = req.body;

    if (!scanId || manualVolume === undefined) {
      return res.status(400).json({
        success: false,
        error: "scanId and manualVolume are required",
      });
    }

    await VolumeDetectionService.recordOverride(scanId, manualVolume);

    res.json({ success: true });
  } catch (error) {
    console.error("[VOLUME-DETECTION] Override error:", error);
    captureException(error as Error, { context: "volume-detection.override" });

    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/volume/health
 * Health check for volume detection service
 */
router.get("/health", async (req, res) => {
  res.json({
    status: "healthy",
    service: "volume-detection",
    timestamp: new Date().toISOString(),
  });
});

export default router;
