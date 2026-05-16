import { z } from 'zod';
import { uuidSchema, isoDateSchema, moneySchema, emailSchema, phoneSchema, urlSchema } from './schema-helpers';

/**
 * BEO schemas
 */
const beoBase = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  createdBy: uuidSchema,
  updatedBy: uuidSchema,
  name: z.string().min(1, 'Event name is required').max(200),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  approvalStatus: z.enum(['pending', 'approved', 'rejected', 'needs_review']),
  approvedBy: uuidSchema.optional(),
  approvedAt: isoDateSchema.optional(),
  rejectedBy: uuidSchema.optional(),
  rejectedAt: isoDateSchema.optional(),
  rejectionReason: z.string().optional(),
  clientId: uuidSchema,
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  eventType: z.enum(['wedding', 'corporate', 'social', 'meeting', 'conference', 'other']),
  eventDate: isoDateSchema,
  setupTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)'),
  breakdownTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)').optional(),
  guaranteedGuests: z.number().int().positive('Guaranteed guests must be positive'),
  estimatedGuests: z.number().int().positive('Estimated guests must be positive'),
  actualGuests: z.number().int().nonnegative().optional(),
  roomIds: z.array(uuidSchema),
  setupStyle: z.string().optional(),
  menuId: uuidSchema.optional(),
  hasBar: z.boolean(),
  barType: z.enum(['open', 'cash', 'hosted']).optional(),
  estimatedRevenue: moneySchema,
  actualRevenue: moneySchema.optional(),
  depositAmount: moneySchema,
  depositPaid: z.boolean(),
  depositPaidDate: isoDateSchema.optional(),
  balanceDue: moneySchema,
  balanceDueDate: isoDateSchema,
  serversNeeded: z.number().int().nonnegative(),
  chefRequired: z.boolean(),
  bartendersNeeded: z.number().int().nonnegative(),
  status: z.enum(['inquiry', 'tentative', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  cancelledAt: isoDateSchema.optional(),
  cancelledBy: uuidSchema.optional(),
  cancellationReason: z.string().optional(),
  cancellationFee: moneySchema.optional(),
  contractUrl: urlSchema.optional(),
  floorPlanUrl: urlSchema.optional(),
  specialRequests: z.string().max(2000).optional(),
  dietaryRestrictions: z.string().max(1000).optional(),
  internalNotes: z.string().max(2000).optional()
});

export const beoCreateSchema = beoBase.omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  approvalStatus: true,
  approvedBy: true,
  approvedAt: true,
  rejectedBy: true,
  rejectedAt: true
});

export const beoUpdateSchema = beoCreateSchema.partial();

/**
 * Room schemas
 */
const roomBase = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  createdBy: uuidSchema,
  updatedBy: uuidSchema,
  name: z.string().min(1, 'Room name is required').max(200),
  description: z.string().max(1000).optional(),
  locationId: uuidSchema,
  maxCapacity: z.number().int().positive('Max capacity must be positive'),
  minCapacity: z.number().int().positive().optional(),
  squareFeet: z.number().positive().optional(),
  ceilingHeight: z.number().positive().optional(),
  hasAV: z.boolean(),
  hasKitchen: z.boolean(),
  hasBar: z.boolean(),
  hasDanceFloor: z.boolean(),
  hasStage: z.boolean(),
  rentalRate: moneySchema,
  rentalRateType: z.enum(['hourly', 'daily', 'flat']),
  isActive: z.boolean(),
  photoUrls: z.array(urlSchema).optional(),
  floorPlanUrl: urlSchema.optional()
});

export const roomCreateSchema = roomBase.omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
});

export const roomUpdateSchema = roomCreateSchema.partial();

