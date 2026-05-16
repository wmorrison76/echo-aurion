/**
 * Region Detection Middleware
 * 
 * Automatically detects client region and routes requests appropriately.
 * Supports geo-location based routing for optimal latency.
 */

import { Request, Response, NextFunction } from "express";
import { getMultiRegionRouter } from "../lib/multi-region-routing";
import { logger } from "../lib/logger";

export interface RegionRequest extends Request {
  region?: {
    detected: string;
    preferred: string;
    latency: number;
  };
}

/**
 * Middleware to detect and set region for request
 */
export function regionDetectionMiddleware(
  req: RegionRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const router = getMultiRegionRouter();

    // Detect region from headers (set by load balancer/CDN)
    const regionHeader = req.headers["x-region"] || req.headers["cf-ray"] || req.headers["x-forwarded-for"];
    const detectedRegion = detectRegionFromHeaders(regionHeader);

    // Get best region for this request
    const operation = req.method === "GET" || req.method === "HEAD" ? "read" : "write";
    const bestRegion = router.getBestRegion(operation);

    req.region = {
      detected: detectedRegion,
      preferred: bestRegion.id,
      latency: bestRegion.latency || 0,
    };

    // Add region headers to response
    res.setHeader("X-Region", bestRegion.id);
    res.setHeader("X-Region-Detected", detectedRegion);

    next();
  } catch (error) {
    logger.error("[RegionDetection] Error detecting region:", error);
    // Continue without region detection
    next();
  }
}

/**
 * Detect region from request headers
 */
function detectRegionFromHeaders(header: string | string[] | undefined): string {
  if (!header) {
    return "us-east-1"; // Default
  }

  const headerStr = Array.isArray(header) ? header[0] : header;

  // Cloudflare Ray header format: [region]-[datacenter]
  if (headerStr.includes("-")) {
    const parts = headerStr.split("-");
    const regionCode = parts[0]?.toLowerCase();

    // Map common region codes
    const regionMap: Record<string, string> = {
      iad: "us-east-1",
      ord: "us-east-1",
      dfw: "us-east-1",
      lax: "us-west-1",
      sfo: "us-west-1",
      sea: "us-west-1",
      lhr: "eu-west-1",
      ams: "eu-west-1",
      fra: "eu-west-1",
    };

    for (const [code, region] of Object.entries(regionMap)) {
      if (regionCode?.includes(code)) {
        return region;
      }
    }
  }

  // X-Forwarded-For IP geolocation (simplified)
  // In production, use a proper geolocation service
  if (headerStr.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    // Simple heuristic: first octet ranges
    const firstOctet = parseInt(headerStr.split(".")[0] || "0");
    if (firstOctet >= 1 && firstOctet <= 127) {
      return "us-east-1"; // Rough heuristic
    }
  }

  return "us-east-1"; // Default fallback
}

/**
 * Middleware to enforce region routing for write operations
 */
export function enforceRegionRouting(
  req: RegionRequest,
  res: Response,
  next: NextFunction
): void {
  const isWriteOperation = !["GET", "HEAD", "OPTIONS"].includes(req.method);

  if (isWriteOperation && req.region) {
    const router = getMultiRegionRouter();
    const primary = router.getPrimaryRegion();

    // Ensure writes go to primary
    if (req.region.preferred !== primary.id) {
      logger.warn(
        `[RegionRouting] Write operation redirected to primary: ${req.region.preferred} -> ${primary.id}`
      );
      req.region.preferred = primary.id;
      res.setHeader("X-Region-Redirected", "true");
    }
  }

  next();
}
