/**
 * Response Time Optimizer Middleware
 * 
 * Optimizes API response times through:
 * - Parallel data fetching
 * - Compression
 * - Field selection
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import compression from "compression";

/**
 * Compression middleware (gzip for responses >1KB)
 */
export const compressionMiddleware = compression({
  filter: (req: Request, res: Response) => {
    // Only compress if response is likely to be >1KB
    const contentType = res.getHeader("content-type") as string;
    return contentType?.includes("application/json") || 
           contentType?.includes("text/");
  },
  threshold: 1024, // 1KB
});

/**
 * Parallel data fetching helper
 */
export async function fetchParallel<T>(
  fetchers: Array<() => Promise<T>>
): Promise<T[]> {
  return Promise.all(fetchers.map(fn => fn()));
}

/**
 * Field selection middleware
 */
export function fieldSelectionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check for fields query parameter
  const fields = req.query.fields as string | undefined;
  
  if (fields) {
    // Store field selection for use in route handlers
    (req as any).selectedFields = fields.split(",").map(f => f.trim());
  }

  next();
}

/**
 * Optimize response by selecting only requested fields
 */
export function optimizeResponse<T extends Record<string, any>>(
  data: T | T[],
  selectedFields?: string[]
): Partial<T> | Partial<T>[] {
  if (!selectedFields || selectedFields.length === 0) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => selectFields(item, selectedFields));
  }

  return selectFields(data, selectedFields);
}

function selectFields<T extends Record<string, any>>(
  item: T,
  fields: string[]
): Partial<T> {
  const result: Partial<T> = {};
  
  fields.forEach(field => {
    if (field in item) {
      result[field as keyof T] = item[field];
    }
  });

  return result;
}
