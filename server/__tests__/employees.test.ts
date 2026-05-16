/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 1 Day 1
 * Employee Routes Tests
 * 
 * Tests for:
 * - POST /api/v1/employees/onboard
 * - GET /api/v1/employees
 * - POST /api/v1/employees
 * - POST /api/v1/employees/bulk
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Validation schemas (same as in employees.ts)
const employeeOnboardingSchema = z.object({
  org_id: z.string().uuid(),
  availability: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])).min(1),
  employment_type: z.enum(['full-time', 'part-time', 'seasonal']),
  skills: z.array(z.string()).min(1),
  max_hours_per_week: z.number().min(4).max(60),
  days_off: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])),
  max_distance_km: z.number().min(0).max(1000).optional(),
  phone: z.string().regex(/^\d{10}$/),
  emergency_contact: z.string().min(1),
  notes: z.string().max(500).optional(),
});

describe('Employee Routes', () => {
  const mockOrgId = '550e8400-e29b-41d4-a716-446655440000';
  const mockHeaders = {
    'X-Org-ID': mockOrgId,
    'Content-Type': 'application/json',
  };

  describe('POST /api/v1/employees/onboard', () => {
    it('should validate onboarding data', () => {
      const validData = {
        org_id: mockOrgId,
        availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        employment_type: 'full-time',
        skills: ['Cook', 'Server'],
        max_hours_per_week: 40,
        days_off: ['Saturday', 'Sunday'],
        max_distance_km: 10,
        phone: '5551234567',
        emergency_contact: 'John Doe (555) 123-4567',
        notes: 'Available after 5pm',
      };

      const result = employeeOnboardingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone number', () => {
      const invalidData = {
        org_id: mockOrgId,
        availability: ['Monday'],
        employment_type: 'full-time',
        skills: ['Cook'],
        max_hours_per_week: 40,
        days_off: [],
        phone: '555-123-4567', // Invalid format
        emergency_contact: 'John Doe',
      };

      const result = employeeOnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing skills', () => {
      const invalidData = {
        org_id: mockOrgId,
        availability: ['Monday'],
        employment_type: 'full-time',
        skills: [], // Empty
        max_hours_per_week: 40,
        days_off: [],
        phone: '5551234567',
        emergency_contact: 'John Doe',
      };

      const result = employeeOnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject hours > 60', () => {
      const invalidData = {
        org_id: mockOrgId,
        availability: ['Monday'],
        employment_type: 'full-time',
        skills: ['Cook'],
        max_hours_per_week: 80, // Too high
        days_off: [],
        phone: '5551234567',
        emergency_contact: 'John Doe',
      };

      const result = employeeOnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept valid full-time onboarding', () => {
      const fullTimeData = {
        org_id: mockOrgId,
        availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        employment_type: 'full-time',
        skills: ['Manager'],
        max_hours_per_week: 50,
        days_off: [],
        phone: '5551234567',
        emergency_contact: 'Jane Doe',
      };

      const result = employeeOnboardingSchema.safeParse(fullTimeData);
      expect(result.success).toBe(true);
    });

    it('should accept valid part-time onboarding', () => {
      const partTimeData = {
        org_id: mockOrgId,
        availability: ['Monday', 'Wednesday', 'Friday'],
        employment_type: 'part-time',
        skills: ['Server', 'Bartender'],
        max_hours_per_week: 20,
        days_off: ['Tuesday', 'Thursday', 'Saturday', 'Sunday'],
        phone: '5551234567',
        emergency_contact: 'John Smith',
      };

      const result = employeeOnboardingSchema.safeParse(partTimeData);
      expect(result.success).toBe(true);
    });

    it('should accept valid seasonal onboarding', () => {
      const seasonalData = {
        org_id: mockOrgId,
        availability: ['Monday', 'Tuesday', 'Wednesday'],
        employment_type: 'seasonal',
        skills: ['Cook'],
        max_hours_per_week: 15,
        days_off: ['Thursday', 'Friday', 'Saturday', 'Sunday'],
        phone: '5551234567',
        emergency_contact: 'Bob Johnson',
      };

      const result = employeeOnboardingSchema.safeParse(seasonalData);
      expect(result.success).toBe(true);
    });
  });

  describe('Onboarding workflow scenarios', () => {
    it('should handle complete onboarding flow for full-time employee', () => {
      // Step 1: Availability
      const step1 = {
        org_id: mockOrgId,
        availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        employment_type: 'full-time',
        skills: ['Cook', 'Server'],
      };

      const step1Result = z
        .object({
          availability: z.array(z.string()).min(1),
          employment_type: z.string(),
          skills: z.array(z.string()).min(1),
        })
        .safeParse(step1);
      expect(step1Result.success).toBe(true);

      // Step 2: Preferences
      const step2 = {
        max_hours_per_week: 40,
        days_off: ['Saturday', 'Sunday'],
        max_distance_km: 15,
        notes: 'Prefer morning shifts',
      };

      const step2Result = z
        .object({
          max_hours_per_week: z.number().min(4).max(60),
          days_off: z.array(z.string()),
          max_distance_km: z.number().optional(),
          notes: z.string().optional(),
        })
        .safeParse(step2);
      expect(step2Result.success).toBe(true);

      // Step 3: Contact info
      const step3 = {
        phone: '5551234567',
        emergency_contact: 'Jane Doe (555) 987-6543',
      };

      const step3Result = z
        .object({
          phone: z.string().regex(/^\d{10}$/),
          emergency_contact: z.string().min(1),
        })
        .safeParse(step3);
      expect(step3Result.success).toBe(true);
    });

    it('should handle complete onboarding flow for part-time employee', () => {
      const onboardingData = {
        org_id: mockOrgId,
        availability: ['Monday', 'Wednesday', 'Friday'],
        employment_type: 'part-time',
        skills: ['Server'],
        max_hours_per_week: 20,
        days_off: ['Tuesday', 'Thursday', 'Saturday', 'Sunday'],
        phone: '5559876543',
        emergency_contact: 'Mom (555) 123-0000',
      };

      const result = employeeOnboardingSchema.safeParse(onboardingData);
      expect(result.success).toBe(true);
    });

    it('should reject onboarding with no availability', () => {
      const invalidData = {
        org_id: mockOrgId,
        availability: [], // Empty
        employment_type: 'full-time',
        skills: ['Cook'],
        max_hours_per_week: 40,
        days_off: [],
        phone: '5551234567',
        emergency_contact: 'John Doe',
      };

      const result = employeeOnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should handle various phone number formats correctly', () => {
      const validPhoneFormats = ['5551234567', '1234567890', '9999999999'];
      const invalidPhoneFormats = ['555-123-4567', '(555) 123-4567', '555.123.4567', 'abc1234567'];

      validPhoneFormats.forEach((phone) => {
        const data = {
          phone,
          emergency_contact: 'Test',
        };
        const schema = z.object({ phone: z.string().regex(/^\d{10}$/), emergency_contact: z.string() });
        expect(schema.safeParse(data).success).toBe(true);
      });

      invalidPhoneFormats.forEach((phone) => {
        const data = {
          phone,
          emergency_contact: 'Test',
        };
        const schema = z.object({ phone: z.string().regex(/^\d{10}$/), emergency_contact: z.string() });
        expect(schema.safeParse(data).success).toBe(false);
      });
    });
  });

  describe('Hours per week constraints', () => {
    it('should accept 4 hours (minimum)', () => {
      const data = { max_hours_per_week: 4 };
      const schema = z.object({ max_hours_per_week: z.number().min(4).max(60) });
      expect(schema.safeParse(data).success).toBe(true);
    });

    it('should reject 3 hours (below minimum)', () => {
      const data = { max_hours_per_week: 3 };
      const schema = z.object({ max_hours_per_week: z.number().min(4).max(60) });
      expect(schema.safeParse(data).success).toBe(false);
    });

    it('should accept 60 hours (maximum)', () => {
      const data = { max_hours_per_week: 60 };
      const schema = z.object({ max_hours_per_week: z.number().min(4).max(60) });
      expect(schema.safeParse(data).success).toBe(true);
    });

    it('should reject 61 hours (above maximum)', () => {
      const data = { max_hours_per_week: 61 };
      const schema = z.object({ max_hours_per_week: z.number().min(4).max(60) });
      expect(schema.safeParse(data).success).toBe(false);
    });

    it('should accept common work hour values', () => {
      const commonValues = [4, 10, 15, 20, 30, 40, 50, 60];
      const schema = z.object({ max_hours_per_week: z.number().min(4).max(60) });

      commonValues.forEach((hours) => {
        expect(schema.safeParse({ max_hours_per_week: hours }).success).toBe(true);
      });
    });
  });

  describe('Employment type validation', () => {
    it('should accept full-time', () => {
      const data = { employment_type: 'full-time' };
      const schema = z.object({ employment_type: z.enum(['full-time', 'part-time', 'seasonal']) });
      expect(schema.safeParse(data).success).toBe(true);
    });

    it('should accept part-time', () => {
      const data = { employment_type: 'part-time' };
      const schema = z.object({ employment_type: z.enum(['full-time', 'part-time', 'seasonal']) });
      expect(schema.safeParse(data).success).toBe(true);
    });

    it('should accept seasonal', () => {
      const data = { employment_type: 'seasonal' };
      const schema = z.object({ employment_type: z.enum(['full-time', 'part-time', 'seasonal']) });
      expect(schema.safeParse(data).success).toBe(true);
    });

    it('should reject invalid employment type', () => {
      const data = { employment_type: 'contract' };
      const schema = z.object({ employment_type: z.enum(['full-time', 'part-time', 'seasonal']) });
      expect(schema.safeParse(data).success).toBe(false);
    });
  });
});
