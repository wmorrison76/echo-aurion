import { z } from 'zod';
import { uuidSchema, isoDateSchema, moneySchema, emailSchema, phoneSchema } from './schema-helpers';

/**
 * Employee schemas
 */
const employeeBase = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  createdBy: uuidSchema,
  updatedBy: uuidSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: emailSchema,
  phone: phoneSchema,
  dateOfBirth: isoDateSchema.optional(),
  employeeNumber: z.string().min(1, 'Employee number is required'),
  hireDate: isoDateSchema,
  terminationDate: isoDateSchema.optional(),
  status: z.enum(['active', 'terminated', 'on_leave', 'suspended']),
  positionId: uuidSchema,
  department: z.string().min(1, 'Department is required'),
  locationId: uuidSchema.optional(),
  payRate: moneySchema,
  payType: z.enum(['hourly', 'salary']),
  payFrequency: z.enum(['weekly', 'biweekly', 'monthly']).optional()
});

export const employeeCreateSchema = employeeBase.omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  name: true
});

export const employeeUpdateSchema = employeeCreateSchema.partial();

/**
 * Shift schemas
 */
const shiftBase = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  createdBy: uuidSchema,
  updatedBy: uuidSchema,
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  employeeId: uuidSchema,
  positionId: uuidSchema,
  locationId: uuidSchema.optional(),
  shiftDate: isoDateSchema,
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  breakMinutes: z.number().int().nonnegative(),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'no_show', 'cancelled']),
  scheduledHours: z.number().nonnegative(),
  regularPay: moneySchema,
  overtimePay: moneySchema,
  totalPay: moneySchema
});

export const shiftCreateSchema = shiftBase.omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
});

export const shiftUpdateSchema = shiftCreateSchema.partial();

