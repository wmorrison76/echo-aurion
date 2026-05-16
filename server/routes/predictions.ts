import { Router, Request, Response, NextFunction } from 'express';
import { validateQuery } from '../middleware/validation';
import { tenantValidationMiddleware } from '../middleware/tenantValidation';
import { z } from 'zod';

const router = Router();

// Middleware
router.use(tenantValidationMiddleware);

// Query validation schemas
const overtimePredictionSchema = z.object({
  org_id: z.string().min(1),
  timeframe: z.enum(['5days', '7days', '14days']).optional().default('5days'),
});

const accuracyPredictionSchema = z.object({
  org_id: z.string().min(1),
  days: z.coerce.number().int().min(1).max(30).optional().default(7),
});

// GET /api/v1/predictions/overtime
// Returns overtime risk predictions for next N days
router.get('/overtime', validateQuery(overtimePredictionSchema), async (req: Request, res: Response) => {
  try {
    const { org_id, timeframe } = req.query as {
      org_id: string;
      timeframe: '5days' | '7days' | '14days';
    };

    const days = timeframe === '5days' ? 5 : timeframe === '7days' ? 7 : 14;

    // Mock implementation - in production, query shift_predictions table
    const predictions = generateMockOvertimePredictions(days, org_id);

    res.json({
      success: true,
      predictions,
      metadata: {
        org_id,
        timeframe,
        generated_at: new Date().toISOString(),
        count: predictions.length,
      },
    });
  } catch (error) {
    console.error('Overtime prediction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overtime predictions',
    });
  }
});

// GET /api/v1/predictions/accuracy
// Returns forecast accuracy metrics
router.get('/accuracy', validateQuery(accuracyPredictionSchema), async (req: Request, res: Response) => {
  try {
    const { org_id, days } = req.query as {
      org_id: string;
      days: number;
    };

    const accuracyData = generateMockAccuracyData(days, org_id);

    res.json({
      success: true,
      todayAccuracy: accuracyData.todayAccuracy,
      trend: accuracyData.trend,
      history: accuracyData.history,
      metadata: {
        org_id,
        days,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Accuracy prediction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch accuracy predictions',
    });
  }
});

// GET /api/v1/predictions/staffing
// Returns staffing recommendations
router.get('/staffing', validateQuery(z.object({
  org_id: z.string().min(1),
  location_id: z.string().optional(),
  date: z.string().optional(),
})), async (req: Request, res: Response) => {
  try {
    const { org_id, location_id, date } = req.query;

    const recommendations = generateMockStaffingRecommendations(org_id as string, location_id as string | undefined);

    res.json({
      success: true,
      recommendations,
      metadata: {
        org_id,
        location_id,
        date: date || new Date().toISOString().split('T')[0],
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Staffing prediction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staffing predictions',
    });
  }
});

// Mock Data Generators

function generateMockOvertimePredictions(days: number, orgId: string) {
  const predictions = [
    {
      employeeId: 'emp-001',
      name: 'Sarah Johnson',
      department: 'Kitchen',
      currentHours: 38,
      predictedOvertimeDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      overtimeProbability: 92,
      confidence: 88,
      availableReplacement: {
        employeeId: 'emp-005',
        name: 'Mike Chen',
      },
    },
    {
      employeeId: 'emp-002',
      name: 'Emily Rodriguez',
      department: 'Service',
      currentHours: 36,
      predictedOvertimeDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      overtimeProbability: 78,
      confidence: 82,
    },
    {
      employeeId: 'emp-003',
      name: 'James Smith',
      department: 'Kitchen',
      currentHours: 39,
      predictedOvertimeDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      overtimeProbability: 85,
      confidence: 79,
      availableReplacement: {
        employeeId: 'emp-006',
        name: 'Lisa Wong',
      },
    },
  ];

  return predictions.slice(0, Math.ceil(Math.random() * 3));
}

function generateMockAccuracyData(days: number, orgId: string) {
  const history = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const baseAccuracy = 80 + Math.random() * 15;
    const forecast = Math.floor(Math.random() * 150) + 100;
    const actual = Math.floor(forecast * (0.8 + Math.random() * 0.4));
    const accuracy = Math.min(100, Math.round((Math.min(forecast, actual) / Math.max(forecast, actual)) * 100));

    history.push({
      date: date.toISOString().split('T')[0],
      forecast,
      actual,
      accuracy,
    });
  }

  const accuracyValues = history.map((h) => h.accuracy);
  const todayAccuracy = Math.round(accuracyValues.reduce((a, b) => a + b) / accuracyValues.length);
  const trend = history.length > 1 ? accuracyValues[history.length - 1] - accuracyValues[0] : 0;

  return {
    todayAccuracy,
    trend,
    history,
  };
}

function generateMockStaffingRecommendations(orgId: string, locationId?: string) {
  return {
    recommended_staff: 12,
    current_scheduled: 10,
    gap: 2,
    confidence: 87,
    peak_hours: ['11:00', '12:00', '18:00', '19:00'],
    positions_needed: [
      {
        position: 'Server',
        current: 3,
        recommended: 4,
        shortage: 1,
      },
      {
        position: 'Chef',
        current: 2,
        recommended: 2,
        shortage: 0,
      },
      {
        position: 'Busser',
        current: 3,
        recommended: 4,
        shortage: 1,
      },
    ],
    cost_impact: {
      additional_hours: 8,
      additional_cost: 120,
    },
  };
}

export default router;
