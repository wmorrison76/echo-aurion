import { z } from 'zod';
import { uuidSchema, isoDateSchema, moneySchema } from './schema-helpers';

/**
 * InventoryItem schemas
 */
const inventoryItemBase = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  createdBy: uuidSchema,
  updatedBy: uuidSchema,
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  sku: z.string().min(1, 'SKU is required'),
  quantity: z.number().nonnegative('Quantity must be non-negative'),
  unit: z.string().min(1, 'Unit is required'),
  cost: moneySchema,
  supplierId: uuidSchema,
  categoryId: uuidSchema,
  locationId: uuidSchema,
  minStock: z.number().nonnegative(),
  maxStock: z.number().nonnegative(),
  reorderPoint: z.number().nonnegative(),
  lastOrdered: isoDateSchema.optional(),
  lastReceived: isoDateSchema.optional()
});

export const inventoryItemCreateSchema = inventoryItemBase.omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
});

export const inventoryItemUpdateSchema = inventoryItemCreateSchema.partial();

/**
 * InventoryLocation schemas
 */
const inventoryLocationBase = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  createdBy: uuidSchema,
  updatedBy: uuidSchema,
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['kitchen', 'walk_in', 'dry_storage', 'bar', 'prep', 'other']),
  capacity: z.number().positive().optional(),
  isActive: z.boolean()
});

export const inventoryLocationCreateSchema = inventoryLocationBase.omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
});

export const inventoryLocationUpdateSchema = inventoryLocationCreateSchema.partial();

/**
 * InventoryCategory schemas
 */
const inventoryCategoryBase = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  createdBy: uuidSchema,
  updatedBy: uuidSchema,
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  parentCategoryId: uuidSchema.optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  color: z.string().optional()
});

export const inventoryCategoryCreateSchema = inventoryCategoryBase.omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
});

export const inventoryCategoryUpdateSchema = inventoryCategoryCreateSchema.partial();

/**
 * InventoryTransaction schemas
 */
const inventoryTransactionBase = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  createdBy: uuidSchema,
  updatedBy: uuidSchema,
  itemId: uuidSchema,
  type: z.enum(['receipt', 'consumption', 'transfer', 'adjustment', 'waste']),
  quantity: z.number(),
  fromLocationId: uuidSchema.optional(),
  toLocationId: uuidSchema.optional(),
  referenceId: uuidSchema.optional(),
  referenceType: z.string().optional(),
  reason: z.string().max(500).optional()
});

export const inventoryTransactionCreateSchema = inventoryTransactionBase.omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
});

export const inventoryTransactionUpdateSchema = inventoryTransactionCreateSchema.partial();

