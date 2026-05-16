/**
 * PHASE 0: ENTERPRISE FOUNDATION - Day 3 Task 2
 * Zod Input Validation Middleware
 * 
 * Features:
 * - Validates request body, params, query, headers
 * - Prevents common attacks: buffer overflow, injection, XSS
 * - Type-safe validation with Zod schemas
 * - Clear error messages for clients
 * - Detailed logging for debugging
 */

import { z } from 'zod';
import { ValidationError } from '../lib/errorHandler';
import { logger } from '../lib/logger';

/**
 * Common validation schemas (reusable across routes)
 */
export const CommonSchemas = {
  // IDs
  uuid: z.string().uuid('Invalid UUID format'),
  orgId: z.string().uuid('Invalid organization ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  locationId: z.string().uuid('Invalid location ID format'),
  employeeId: z.string().uuid('Invalid employee ID format'),
  shiftId: z.string().uuid('Invalid shift ID format'),

  // Common fields
  email: z.string().email('Invalid email format').max(255),
  phone: z.string().regex(/^\+?[0-9\-\(\) ]+$/, 'Invalid phone format').max(20),
  name: z.string().min(1, 'Name is required').max(255),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  address: z.string().max(500),

  // Rates and percentages
  hourlyRate: z.number().min(0, 'Rate cannot be negative').max(10000, 'Rate too high'),
  percentage: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),

  // Dates
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  timestamp: z.string().datetime(),

  // Enums
  role: z.enum(['cook', 'server', 'bartender', 'manager', 'owner', 'admin']),
  status: z.enum(['scheduled', 'clocked', 'completed', 'no-show', 'cancelled']),
  tier: z.enum(['standard', 'premium', 'enterprise']),
};

/**
 * Middleware factory for validating request bodies
 * Usage: app.post('/api/employees', validateBody(createEmployeeSchema), handler)
 */
export const validateBody = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const validation = schema.safeParse(req.body);

      if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;

        logger.warn('Request validation failed', {
          requestId: req.id,
          orgId: req.user?.org_id,
          path: req.path,
          method: req.method,
          errors,
        });

        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          requestId: req.id,
          details: errors,
        });
      }

      // Replace req.body with validated data
      req.body = validation.data;
      next();
    } catch (error) {
      logger.error('Body validation error', {
        requestId: req.id,
        error: error instanceof Error ? error.message : 'Unknown',
      });

      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        requestId: req.id,
      });
    }
  };
};

/**
 * Middleware factory for validating route parameters
 * Usage: app.get('/api/employees/:id', validateParams(z.object({ id: CommonSchemas.uuid })), handler)
 */
export const validateParams = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const validation = schema.safeParse(req.params);

      if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid parameters',
          requestId: req.id,
          details: errors,
        });
      }

      req.params = validation.data;
      next();
    } catch (error) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Parameter validation failed',
        requestId: req.id,
      });
    }
  };
};

/**
 * Middleware factory for validating query parameters
 * Usage: app.get('/api/employees', validateQuery(z.object({ limit: z.number() })), handler)
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const validation = schema.safeParse(req.query);

      if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          requestId: req.id,
          details: errors,
        });
      }

      req.query = validation.data;
      next();
    } catch (error) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Query validation failed',
        requestId: req.id,
      });
    }
  };
};

/**
 * Common validation schemas for typical API operations
 */

// Create employee
export const createEmployeeSchema = z.object({
  org_id: CommonSchemas.orgId,
  location_id: CommonSchemas.locationId.optional(),
  first_name: CommonSchemas.firstName,
  last_name: CommonSchemas.lastName,
  email: CommonSchemas.email.optional(),
  phone: CommonSchemas.phone.optional(),
  hourly_rate: CommonSchemas.hourlyRate,
  role: CommonSchemas.role,
});

// Update employee
export const updateEmployeeSchema = z.object({
  org_id: CommonSchemas.orgId,
  first_name: CommonSchemas.firstName.optional(),
  last_name: CommonSchemas.lastName.optional(),
  email: CommonSchemas.email.optional(),
  phone: CommonSchemas.phone.optional(),
  hourly_rate: CommonSchemas.hourlyRate.optional(),
  role: CommonSchemas.role.optional(),
});

// Create shift
export const createShiftSchema = z.object({
  org_id: CommonSchemas.orgId,
  location_id: CommonSchemas.locationId,
  employee_id: CommonSchemas.employeeId.optional(),
  start_time: CommonSchemas.timestamp,
  end_time: CommonSchemas.timestamp.optional(),
  position: CommonSchemas.role,
});

// Update shift
export const updateShiftSchema = z.object({
  org_id: CommonSchemas.orgId,
  employee_id: CommonSchemas.employeeId.optional(),
  start_time: CommonSchemas.timestamp.optional(),
  end_time: CommonSchemas.timestamp.optional(),
  position: CommonSchemas.role.optional(),
  status: CommonSchemas.status.optional(),
});

// Pagination params (common query params)
export const paginationSchema = z.object({
  limit: z.number().min(1).max(1000).default(50).optional(),
  offset: z.number().min(0).default(0).optional(),
  sort: z.string().max(100).optional(),
  order: z.enum(['asc', 'desc']).default('desc').optional(),
});

// List employees query
export const listEmployeesSchema = paginationSchema.extend({
  org_id: CommonSchemas.orgId,
  location_id: CommonSchemas.locationId.optional(),
  role: CommonSchemas.role.optional(),
  active: z.boolean().optional(),
  search: z.string().max(100).optional(),
});

/**
 * Sanitization helpers
 */

/**
 * Sanitize string input (remove HTML, trim whitespace)
 */
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .substring(0, 1000); // Max 1000 chars
};

/**
 * Sanitize email
 */
export const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

/**
 * Middleware to sanitize common text fields
 */
export const sanitizeMiddleware = (req: any, res: any, next: any) => {
  // Sanitize body fields
  if (req.body) {
    for (const key in req.body) {
      if (
        typeof req.body[key] === 'string' &&
        ['name', 'first_name', 'last_name', 'address', 'notes', 'description'].includes(key)
      ) {
        req.body[key] = sanitizeString(req.body[key]);
      }
      if (key === 'email' && typeof req.body[key] === 'string') {
        req.body[key] = sanitizeEmail(req.body[key]);
      }
    }
  }

  next();
};

/**
 * Validation error formatter for responses
 */
export const formatValidationErrors = (
  errors: Record<string, string[]>
): Record<string, string> => {
  const formatted: Record<string, string> = {};

  for (const field in errors) {
    formatted[field] = errors[field][0] || 'Invalid value';
  }

  return formatted;
};

// ============================================================================
// INVENTORY VALIDATION SCHEMAS
// ============================================================================

/**
 * Common inventory field schemas
 */
export const InventorySchemas = {
  productId: z.string().uuid('Invalid product ID'),
  locationId: z.string().min(1, 'Location ID required').max(255),
  quantity: z.number().positive('Quantity must be positive'),
  unitCost: z.number().min(0, 'Unit cost cannot be negative'),
  wasteCategory: z.enum(['spoilage', 'damage', 'theft', 'quality', 'other']),
};

/**
 * Receipt line schema
 */
export const receiptLineSchema = z.object({
  product_id: InventorySchemas.productId,
  location_id: InventorySchemas.locationId,
  qty: InventorySchemas.quantity,
  unit_cost: InventorySchemas.unitCost,
  source_ref: z.string().max(255).optional(),
});

/**
 * Full inventory receipt request schema
 */
export const inventoryReceiptSchema = z.object({
  lines: z.array(receiptLineSchema).min(1, 'At least one receipt line required'),
  user_id: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Transfer line schema
 */
export const transferLineSchema = z.object({
  product_id: InventorySchemas.productId,
  from_location_id: InventorySchemas.locationId,
  to_location_id: InventorySchemas.locationId,
  qty: InventorySchemas.quantity,
});

/**
 * Full inventory transfer request schema
 */
export const inventoryTransferSchema = z.object({
  lines: z.array(transferLineSchema).min(1, 'At least one transfer line required'),
  user_id: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Waste line schema
 */
export const wasteLineSchema = z.object({
  product_id: InventorySchemas.productId,
  location_id: InventorySchemas.locationId,
  qty: InventorySchemas.quantity,
  category: InventorySchemas.wasteCategory,
  reason: z.string().max(500).optional(),
});

/**
 * Full inventory waste request schema
 */
export const inventoryWasteSchema = z.object({
  lines: z.array(wasteLineSchema).min(1, 'At least one waste line required'),
  user_id: z.string().uuid().optional(),
  batch_reason: z.string().max(1000).optional(),
});

/**
 * Inventory transaction history query schema
 */
export const inventoryHistoryQuerySchema = z.object({
  product_id: z.string().uuid().optional(),
  location_id: z.string().max(255).optional(),
  from_location_id: z.string().max(255).optional(),
  to_location_id: z.string().max(255).optional(),
  transaction_type: z.string().optional(),
  source_module: z.string().max(100).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  limit: z.number().min(1).max(1000).default(100).optional(),
  offset: z.number().min(0).default(0).optional(),
});
