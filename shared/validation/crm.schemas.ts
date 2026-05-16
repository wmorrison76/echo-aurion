import { z } from 'zod';
import { uuidSchema, isoDateSchema, moneySchema, emailSchema, phoneSchema } from './schema-helpers';

/**
 * Prospect schemas
 */
const prospectBase = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  createdBy: uuidSchema,
  updatedBy: uuidSchema,
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  leadSource: z.enum(['website', 'referral', 'cold_call', 'event', 'social_media', 'walk_in', 'other']),
  referredBy: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
  assignedTo: uuidSchema.optional(),
  assignedAt: isoDateSchema.optional(),
  eventType: z.string().optional(),
  eventDate: isoDateSchema.optional(),
  estimatedGuests: z.number().int().positive().optional(),
  estimatedBudget: moneySchema.optional(),
  qualifiedAt: isoDateSchema.optional(),
  disqualifiedAt: isoDateSchema.optional(),
  disqualificationReason: z.string().optional(),
  convertedToClientId: uuidSchema.optional(),
  convertedAt: isoDateSchema.optional(),
  notes: z.string().max(2000).optional(),
  nextActionDate: isoDateSchema.optional(),
  nextActionType: z.string().optional()
});

export const prospectCreateSchema = prospectBase.omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
});

export const prospectUpdateSchema = prospectCreateSchema.partial();

/**
 * Client schemas
 */
const clientBase = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  createdBy: uuidSchema,
  updatedBy: uuidSchema,
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companyName: z.string().optional(),
  email: emailSchema,
  phone: phoneSchema,
  alternatePhone: phoneSchema.optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  clientType: z.enum(['individual', 'corporate', 'nonprofit', 'government']),
  accountManager: uuidSchema.optional(),
  firstEventDate: isoDateSchema.optional(),
  lastEventDate: isoDateSchema.optional(),
  totalEvents: z.number().int().nonnegative(),
  lifetimeValue: moneySchema,
  averageEventValue: moneySchema,
  preferredContactMethod: z.enum(['email', 'phone', 'text']).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  specialRequests: z.string().max(2000).optional(),
  status: z.enum(['active', 'inactive', 'vip', 'blacklisted'])
});

export const clientCreateSchema = clientBase.omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  totalEvents: true,
  lifetimeValue: true,
  averageEventValue: true
});

export const clientUpdateSchema = clientCreateSchema.partial();

