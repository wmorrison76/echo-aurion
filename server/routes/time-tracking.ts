/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 2 Day 9
 * Time Tracking API (Clock In/Out)
 * 
 * Endpoints:
 * - POST /api/v1/time-tracking/clock-in
 * - POST /api/v1/time-tracking/clock-out
 * - GET /api/v1/time-tracking/current
 * - GET /api/v1/time-tracking/history
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateBody, validateParams, CommonSchemas } from '../middleware/validation';
import { enforceOrgId, getOrgContext } from '../lib/multi-tenant';
import { logger, auditLogger } from '../lib/logger';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const clockInSchema = z.object({
  employee_id: CommonSchemas.employeeId,
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  timestamp: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

const clockOutSchema = z.object({
  employee_id: CommonSchemas.employeeId,
  timestamp: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

// ============================================================================
// POST /api/v1/time-tracking/clock-in - CLOCK IN
// ============================================================================

router.post(
  '/clock-in',
  validateBody(clockInSchema),
  async (req: any, res: Response) => {
    try {
      const orgContext = getOrgContext(req);
      const { employee_id, location, timestamp, notes } = req.body;

      logger.info('Clock in attempt', {
        requestId: req.id,
        orgId: orgContext.orgId,
        employeeId: employee_id,
        location: location ? `${location.lat},${location.lng}` : 'none',
      });

      // TODO: In Phase 1, verify employee is scheduled
      // const scheduled = await db.query(
      //   `SELECT id FROM shifts WHERE employee_id = ? AND org_id = ? AND ? BETWEEN start_time AND end_time`,
      //   [employee_id, orgContext.orgId, timestamp]
      // );

      // const offSchedule = !scheduled.length;
      const offSchedule = false; // Mock

      // TODO: In Phase 1, insert into time_tracking table
      // const result = await db.query(
      //   `INSERT INTO time_tracking (org_id, employee_id, clock_in_time, gps_latitude, gps_longitude, created_at)
      //    VALUES (?, ?, ?, ?, ?, NOW())
      //    RETURNING id, clock_in_time`,
      //   [orgContext.orgId, employee_id, timestamp, location?.lat, location?.lng]
      // );

      const trackingId = 'track-' + Date.now();

      // Audit log
      await auditLogger.logModification(
        orgContext.orgId,
        orgContext.userId,
        'CREATE',
        'time_tracking',
        trackingId,
        {
          employee_id,
          clock_in_time: timestamp,
          location,
          off_schedule: offSchedule,
        }
      );

      res.status(201).json({
        id: trackingId,
        employee_id,
        clock_in_time: timestamp,
        off_schedule: offSchedule,
        message: offSchedule ? 'Clocked in (off-schedule)' : 'Clocked in successfully',
      });
    } catch (error) {
      throw error;
    }
  }
);

// ============================================================================
// POST /api/v1/time-tracking/clock-out - CLOCK OUT
// ============================================================================

router.post(
  '/clock-out',
  validateBody(clockOutSchema),
  async (req: any, res: Response) => {
    try {
      const orgContext = getOrgContext(req);
      const { employee_id, timestamp, notes } = req.body;

      logger.info('Clock out attempt', {
        requestId: req.id,
        orgId: orgContext.orgId,
        employeeId: employee_id,
      });

      // TODO: In Phase 1, find active clock-in record
      // const clockIn = await db.query(
      //   `SELECT id, clock_in_time FROM time_tracking
      //    WHERE employee_id = ? AND org_id = ? AND clock_out_time IS NULL
      //    ORDER BY clock_in_time DESC LIMIT 1`,
      //   [employee_id, orgContext.orgId]
      // );

      const mockClockInTime = new Date(Date.now() - 8 * 3600000); // 8 hours ago
      const hoursWorked = (new Date(timestamp).getTime() - mockClockInTime.getTime()) / 3600000;

      // TODO: In Phase 1, update time_tracking with clock_out_time
      // const result = await db.query(
      //   `UPDATE time_tracking SET clock_out_time = ? WHERE id = ? RETURNING *`,
      //   [timestamp, clockIn.id]
      // );

      const trackingId = 'track-' + Date.now();

      // Audit log
      await auditLogger.logModification(
        orgContext.orgId,
        orgContext.userId,
        'UPDATE',
        'time_tracking',
        trackingId,
        {
          employee_id,
          clock_out_time: timestamp,
          hours_worked: hoursWorked,
        }
      );

      // Check for overtime
      const isOvertime = hoursWorked > 8;

      res.status(200).json({
        id: trackingId,
        employee_id,
        clock_in_time: mockClockInTime.toISOString(),
        clock_out_time: timestamp,
        hours_worked: hoursWorked.toFixed(2),
        is_overtime: isOvertime,
        message: isOvertime ? 'Overtime recorded!' : 'Clocked out successfully',
      });
    } catch (error) {
      throw error;
    }
  }
);

// ============================================================================
// GET /api/v1/time-tracking/current - CURRENT CLOCKING STATUS
// ============================================================================

router.get('/current', async (req: any, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const { employee_id } = req.query;

    if (!employee_id) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'employee_id is required',
      });
    }

    logger.debug('Get current clocking status', {
      requestId: req.id,
      orgId: orgContext.orgId,
      employeeId: employee_id,
    });

    // TODO: In Phase 1, query time_tracking for current status
    // const result = await db.query(
    //   `SELECT id, employee_id, clock_in_time, clock_out_time FROM time_tracking
    //    WHERE employee_id = ? AND org_id = ? ORDER BY clock_in_time DESC LIMIT 1`,
    //   [employee_id, orgContext.orgId]
    // );

    // Mock response
    const status = {
      clockedIn: false,
      employeeId: employee_id,
      currentShiftId: null,
      clockInTime: null,
      lastClockInTime: new Date(Date.now() - 24 * 3600000).toISOString(),
    };

    res.json(status);
  } catch (error) {
    throw error;
  }
});

// ============================================================================
// GET /api/v1/time-tracking/history - CLOCKING HISTORY
// ============================================================================

router.get('/history', async (req: any, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const { employee_id, days = 30, limit = 50, offset = 0 } = req.query;

    if (!employee_id) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'employee_id is required',
      });
    }

    logger.debug('Get clocking history', {
      requestId: req.id,
      orgId: orgContext.orgId,
      employeeId: employee_id,
      days: parseInt(days),
    });

    // TODO: In Phase 1, query time_tracking history
    // const query = `
    //   SELECT id, employee_id, clock_in_time, clock_out_time,
    //     EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 3600 as hours
    //   FROM time_tracking
    //   WHERE employee_id = ? AND org_id = ? AND clock_in_time >= NOW() - INTERVAL '? days'
    //   ORDER BY clock_in_time DESC
    //   LIMIT ? OFFSET ?
    // `;

    // Mock response
    const history = [];
    for (let i = 0; i < 10; i++) {
      const clockIn = new Date(Date.now() - i * 24 * 3600000);
      const clockOut = new Date(clockIn.getTime() + 8 * 3600000);

      history.push({
        id: `track-${i}`,
        employee_id,
        clock_in_time: clockIn.toISOString(),
        clock_out_time: clockOut.toISOString(),
        hours_worked: 8,
        date: clockIn.toISOString().split('T')[0],
      });
    }

    res.json({
      data: history.slice(offset, offset + limit),
      pagination: { limit, offset, total: history.length },
      summary: {
        total_hours_30days: 160,
        avg_hours_per_day: 8,
        overtime_hours: 0,
      },
    });
  } catch (error) {
    throw error;
  }
});

export default router;
