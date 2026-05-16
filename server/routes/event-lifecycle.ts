/**
 * Event Lifecycle API Routes
 * ==========================
 * 
 * REST API for Event Lifecycle Engine
 * Complete prospect-to-payment lifecycle management
 * 
 * Endpoints:
 * - POST /api/events/lifecycle - Create event from prospect
 * - GET /api/events/lifecycle/:id - Get event details
 * - PUT /api/events/lifecycle/:id/stage - Advance event stage
 * - POST /api/events/lifecycle/:id/menu - Add menu selections
 * - POST /api/events/lifecycle/:id/payment - Record payment
 * - GET /api/events/lifecycle/:id/costs - Get event cost breakdown (P&L drill-down)
 * - GET /api/events/lifecycle - List events with filters
 * - GET /api/events/lifecycle/stats - Get lifecycle statistics
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eventLifecycleEngine, EventLifecycleStage } from '../services/event-lifecycle-engine.js';
import { getOrgId } from '../lib/org-resolver.js';
import { logger } from '../lib/logger.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createEventSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  clientCompany: z.string().optional(),
  eventName: z.string().min(1),
  eventType: z.enum([
    'wedding', 'corporate', 'social', 'banquet', 'conference',
    'gala', 'private_dining', 'cocktail_reception', 'holiday_party', 'other'
  ]),
  eventDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  guestCount: z.number().int().positive(),
  estimatedRevenue: z.number().positive(),
  outletId: z.string().uuid(),
  assignedTo: z.string().uuid(),
  notes: z.string().optional(),
});

const advanceStageSchema = z.object({
  newStage: z.nativeEnum(EventLifecycleStage),
  performedBy: z.string().uuid(),
  notes: z.string().optional(),
  data: z.record(z.any()).optional(),
});

const menuSelectionSchema = z.object({
  menuItemId: z.string(),
  menuItemName: z.string(),
  recipeId: z.string().uuid().optional(),
  category: z.enum(['appetizer', 'entree', 'dessert', 'beverage', 'side', 'other']),
  quantity: z.number().positive(),
  perPerson: z.boolean().default(true),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  dietaryTags: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  specialInstructions: z.string().optional(),
});

const paymentSchema = z.object({
  type: z.enum(['deposit', 'progress', 'final', 'refund', 'adjustment']),
  amount: z.number().positive(),
  method: z.enum(['credit_card', 'check', 'wire', 'cash', 'house_account']),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']),
  referenceNumber: z.string().optional(),
  invoiceId: z.string().optional(),
  dueDate: z.string().optional(),
  paidDate: z.string().optional(),
  notes: z.string().optional(),
  processedBy: z.string().optional(),
});

// ============================================================================
// EVENT MANAGEMENT
// ============================================================================

/**
 * POST /api/events/lifecycle
 * Create new event from prospect
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const parsed = createEventSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const event = await eventLifecycleEngine.createEventFromProspect({
      id: req.body.prospectId || require('crypto').randomUUID(),
      ...parsed.data,
      orgId,
    });

    return res.status(201).json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    logger.error('[EventLifecycle API] Create event failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/events/lifecycle/:id
 * Get event details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const event = eventLifecycleEngine.getEvent(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    return res.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    logger.error('[EventLifecycle API] Get event failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/events/lifecycle/:id/stage
 * Advance event to new stage
 */
router.put('/:id/stage', async (req: Request, res: Response) => {
  try {
    const parsed = advanceStageSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const event = await eventLifecycleEngine.advanceStage(
      req.params.id,
      parsed.data.newStage,
      parsed.data.performedBy,
      parsed.data.notes,
      parsed.data.data
    );

    return res.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    logger.error('[EventLifecycle API] Advance stage failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/events/lifecycle
 * List events with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { outletId, status, dateFrom, dateTo } = req.query;

    const events = eventLifecycleEngine.listEvents(orgId, {
      outletId: outletId as string | undefined,
      status: status as EventLifecycleStage | undefined,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
    });

    return res.json({
      success: true,
      data: events,
      total: events.length,
    });
  } catch (error: any) {
    logger.error('[EventLifecycle API] List events failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// MENU MANAGEMENT
// ============================================================================

/**
 * POST /api/events/lifecycle/:id/menu
 * Add menu selections to event
 */
router.post('/:id/menu', async (req: Request, res: Response) => {
  try {
    const { selections } = req.body;

    if (!Array.isArray(selections)) {
      return res.status(400).json({ error: 'selections array required' });
    }

    // Validate each selection
    for (const selection of selections) {
      const parsed = menuSelectionSchema.safeParse(selection);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.flatten(),
        });
      }
    }

    const event = await eventLifecycleEngine.addMenuSelections(req.params.id, selections);

    return res.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    logger.error('[EventLifecycle API] Add menu failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// PAYMENT MANAGEMENT
// ============================================================================

/**
 * POST /api/events/lifecycle/:id/payment
 * Record payment for event
 */
router.post('/:id/payment', async (req: Request, res: Response) => {
  try {
    const parsed = paymentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const event = await eventLifecycleEngine.recordPayment(req.params.id, parsed.data);

    return res.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    logger.error('[EventLifecycle API] Record payment failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// COST TRACKING (P&L DRILL-DOWN)
// ============================================================================

/**
 * GET /api/events/lifecycle/:id/costs
 * Get event cost breakdown - enables P&L drill-down
 */
router.get('/:id/costs', async (req: Request, res: Response) => {
  try {
    const costs = eventLifecycleEngine.getEventProfitability(req.params.id);

    if (!costs) {
      return res.status(404).json({
        success: false,
        error: 'Event not found or costs not calculated',
      });
    }

    return res.json({
      success: true,
      data: costs,
    });
  } catch (error: any) {
    logger.error('[EventLifecycle API] Get costs failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/events/lifecycle/:id/costs/calculate
 * Trigger cost calculation for event
 */
router.post('/:id/costs/calculate', async (req: Request, res: Response) => {
  try {
    const event = eventLifecycleEngine.getEvent(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    const costs = await (eventLifecycleEngine as any).calculateEventCosts(event);

    return res.json({
      success: true,
      data: costs,
    });
  } catch (error: any) {
    logger.error('[EventLifecycle API] Calculate costs failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * GET /api/events/lifecycle/stats
 * Get lifecycle statistics
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const stats = eventLifecycleEngine.getStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('[EventLifecycle API] Get stats failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/events/lifecycle/stages
 * Get available lifecycle stages
 */
router.get('/stages/list', async (req: Request, res: Response) => {
  try {
    const stages = Object.values(EventLifecycleStage).map(stage => ({
      value: stage,
      label: stage.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      phase: getStagePhase(stage),
    }));

    return res.json({
      success: true,
      data: stages,
    });
  } catch (error: any) {
    logger.error('[EventLifecycle API] Get stages failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

function getStagePhase(stage: EventLifecycleStage): string {
  const phaseMap: Record<string, EventLifecycleStage[]> = {
    'Sales & Planning': [
      EventLifecycleStage.PROSPECT,
      EventLifecycleStage.QUALIFIED,
      EventLifecycleStage.PROPOSAL_SENT,
      EventLifecycleStage.NEGOTIATION,
      EventLifecycleStage.CONTRACT_SENT,
      EventLifecycleStage.CONTRACT_SIGNED,
      EventLifecycleStage.DEPOSIT_RECEIVED,
    ],
    'Event Design': [
      EventLifecycleStage.MENU_SELECTED,
      EventLifecycleStage.BEO_CREATED,
      EventLifecycleStage.BEO_APPROVED,
      EventLifecycleStage.LAYOUT_DESIGNED,
      EventLifecycleStage.LABOR_SCHEDULED,
    ],
    'Pre-Event': [
      EventLifecycleStage.INVENTORY_ORDERED,
      EventLifecycleStage.INVENTORY_RECEIVED,
      EventLifecycleStage.PRODUCTION_SCHEDULED,
      EventLifecycleStage.PREP_STARTED,
    ],
    'Event Execution': [
      EventLifecycleStage.SETUP_STARTED,
      EventLifecycleStage.EVENT_IN_PROGRESS,
      EventLifecycleStage.EVENT_COMPLETED,
    ],
    'Post-Event': [
      EventLifecycleStage.POST_EVENT_REVIEW,
      EventLifecycleStage.FINAL_INVOICE_SENT,
      EventLifecycleStage.PAYMENT_RECEIVED,
      EventLifecycleStage.CLOSED,
    ],
  };

  for (const [phase, stages] of Object.entries(phaseMap)) {
    if (stages.includes(stage)) {
      return phase;
    }
  }

  return 'Other';
}

export default router;
