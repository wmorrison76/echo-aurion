import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { logger } from "../lib/logger"; /** * Pagination query schema * Validates limit and offset from query params */
export const PaginationSchema = z.object({
  limit: z
    .string()
    .pipe(z.coerce.number().int().min(1).max(1000))
    .optional()
    .default("50"),
  offset: z
    .string()
    .pipe(z.coerce.number().int().min(0))
    .optional()
    .default("0"),
});
export type PaginationParams = z.infer<
  typeof PaginationSchema
>; /** * Pagination response wrapper * Returns data with metadata for client-side pagination UI */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
    totalPages: number;
  };
} /** * Parse and validate pagination params from request */
export function parsePaginationParams(
  query: Record<string, any>,
): PaginationParams {
  try {
    return PaginationSchema.parse(query);
  } catch (error) {
    logger.warn("Invalid pagination params, using defaults", { error });
    return { limit: 50, offset: 0 };
  }
} /** * Build paginated response with metadata * Useful for calculating total pages, hasNext, hasPrev */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  return {
    data,
    pagination: {
      offset,
      limit,
      total,
      hasNext: offset + limit < total,
      hasPrev: offset > 0,
      totalPages,
    },
  };
} /** * Pagination middleware * Attaches parsed pagination params to res.locals.pagination * Usage: router.get("/items", paginationMiddleware, async (req, res) => { ... }) */
export function paginationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const pagination = parsePaginationParams(req.query);
    res.locals.pagination = pagination;
    logger.debug("Pagination params parsed", {
      limit: pagination.limit,
      offset: pagination.offset,
    });
    next();
  } catch (error) {
    logger.error("Pagination middleware error", error);
    res.status(400).json({
      error: "Invalid pagination parameters",
      details: "limit and offset must be positive integers",
    });
  }
} /** * Helper to count total records from Supabase query * Usage with list endpoints: * const total = await countTotal( * supabase.from('table').select('id', { count: 'exact' }) * ); */
export async function countTotal(
  query: Promise<{ count: number | null; data: any; error: any }>,
): Promise<number> {
  try {
    const result = await query;
    if (result.error) {
      logger.warn("Error counting total records", { error: result.error });
      return 0;
    }
    return result.count || 0;
  } catch (error) {
    logger.error("Failed to count total records", error);
    return 0;
  }
} /** * Apply pagination range to Supabase query * Usage: * const { data } = await applyPaginationRange( * supabase.from('table').select('*'), * pagination * ); */
export function applyPaginationRange(query: any, pagination: PaginationParams) {
  return query.range(
    pagination.offset,
    pagination.offset + pagination.limit - 1,
  );
} /** * Common pagination limits by data type * Use these to prevent returning too much data */
export const PAGINATION_LIMITS = {
  INVOICES: 100,
  PAYMENTS: 50,
  ORDERS: 100,
  SENSOR_READINGS: 500,
  INVENTORY: 200,
  IoT_DEVICES: 50,
  WASTE_LOGS: 200,
  DEFAULT: 50,
  MAX: 1000,
};
