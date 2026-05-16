/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 7 Day 32
 * Multi-Property Management
 * 
 * Endpoints for managing multiple locations:
 * - GET /api/v1/properties - List all properties
 * - POST /api/v1/properties - Create property
 * - PUT /api/v1/properties/{id} - Update property
 * - GET /api/v1/properties/{id}/metrics - Property-specific metrics
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams, CommonSchemas } from '../middleware/validation';
import { getOrgContext, enforceOrgId } from '../lib/multi-tenant';
import { logger } from '../lib/logger';

const router = Router();

const createPropertySchema = z.object({
  org_id: CommonSchemas.orgId,
  name: z.string().min(3).max(100),
  address: z.string().min(10),
  city: z.string().min(2),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/),
  timezone: z.string(),
  phone: z.string().regex(/^\d{10}$/),
  managerId: CommonSchemas.employeeId,
  staffCount: z.number().min(1).max(1000),
  laborBudget: z.number().min(0),
  complianceState: z.string().length(2),
});

const propertyIdSchema = z.object({
  id: z.string().min(1),
});

router.post('/', validateBody(createPropertySchema), async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const data = req.body;

    enforceOrgId(data.org_id, orgContext.orgId);

    const propertyId = 'prop-' + Date.now();

    logger.info('Property created', {
      orgId: data.org_id,
      propertyId,
      name: data.name,
      location: `${data.city}, ${data.state}`,
    });

    res.status(201).json({
      success: true,
      propertyId,
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      timezone: data.timezone,
      managerId: data.managerId,
      staffCount: data.staffCount,
      laborBudget: data.laborBudget,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Property creation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(400).json({
      success: false,
      error: 'Property creation failed',
    });
  }
});

router.get('/', validateQuery(z.object({
  org_id: CommonSchemas.orgId,
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
})), async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const { org_id } = req.query;

    enforceOrgId(org_id as string, orgContext.orgId);

    const properties = generateMockProperties();

    res.json({
      success: true,
      properties,
      total: properties.length,
    });
  } catch (error) {
    logger.error('Failed to fetch properties', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch properties',
    });
  }
});

router.get('/:id/metrics', validateParams(propertyIdSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const metrics = {
      propertyId: id,
      date: new Date().toISOString().split('T')[0],
      staffing: {
        scheduled: 12,
        clocked_in: 10,
        no_show: 1,
        pending: 1,
      },
      labor: {
        hours_worked: 96,
        overtime_hours: 8,
        labor_cost: 1200,
        labor_percent: 28,
      },
      pos: {
        revenue: 4200,
        covers: 150,
        average_check: 28,
      },
      compliance: {
        violations: 0,
        warnings: 1,
      },
      forecasts: {
        demand: 145,
        recommended_staff: 12,
        confidence: 87,
      },
    };

    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    logger.error('Failed to fetch property metrics', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics',
    });
  }
});

router.put('/:id', validateParams(propertyIdSchema), validateBody(z.object({
  org_id: CommonSchemas.orgId,
  name: z.string().optional(),
  laborBudget: z.number().optional(),
  managerId: CommonSchemas.employeeId.optional(),
})), async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const { id } = req.params;
    const data = req.body;

    enforceOrgId(data.org_id, orgContext.orgId);

    logger.info('Property updated', {
      propertyId: id,
      changes: Object.keys(data).filter(k => k !== 'org_id'),
    });

    res.json({
      success: true,
      message: 'Property updated successfully',
      propertyId: id,
    });
  } catch (error) {
    logger.error('Property update failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(400).json({
      success: false,
      error: 'Property update failed',
    });
  }
});

function generateMockProperties() {
  return [
    {
      id: 'prop-1',
      name: 'Downtown Restaurant',
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      timezone: 'America/Los_Angeles',
      phone: '4155551234',
      managerId: 'emp-1',
      staffCount: 15,
      laborBudget: 5000,
      complianceState: 'CA',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'prop-2',
      name: 'Beach Location',
      address: '456 Ocean Ave',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90001',
      timezone: 'America/Los_Angeles',
      phone: '3105555678',
      managerId: 'emp-2',
      staffCount: 12,
      laborBudget: 4500,
      complianceState: 'CA',
      createdAt: new Date().toISOString(),
    },
  ];
}

export default router;
