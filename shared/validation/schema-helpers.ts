/**
 * Zod Schema Helpers
 * Common patterns for creating validation schemas
 */

import { z } from 'zod';

/**
 * UUID validation (v4 format)
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * ISO Date validation
 */
export const isoDateSchema = z.string().datetime('Invalid ISO date format');

/**
 * Email validation
 */
export const emailSchema = z.string().email('Invalid email format');

/**
 * Phone number validation (basic)
 */
export const phoneSchema = z.string().regex(
  /^\+?[1-9]\d{1,14}$/,
  'Invalid phone number format (use E.164 format)'
);

/**
 * URL validation
 */
export const urlSchema = z.string().url('Invalid URL format');

/**
 * Money (cents) validation
 */
export const moneySchema = z.number().int().nonnegative('Amount must be non-negative');

/**
 * Percentage validation (0-100)
 */
export const percentageSchema = z.number().min(0).max(100, 'Percentage must be between 0 and 100');

/**
 * Hex color validation
 */
export const hexColorSchema = z.string().regex(
  /^#[0-9A-Fa-f]{6}$/,
  'Invalid hex color format (use #RRGGBB)'
);

/**
 * Create schema for updating (all fields optional)
 */
export function createUpdateSchema<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.partial();
}

/**
 * Create schema for creating (exclude base entity fields)
 */
export function createCreateSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  excludeFields: string[] = ['id', 'orgId', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy']
) {
  return schema.omit(
    excludeFields.reduce((acc, field) => ({ ...acc, [field]: true }), {} as any)
  );
}
