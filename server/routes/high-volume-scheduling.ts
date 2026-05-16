/**
 * High-Volume Scheduling API Routes
 * 
 * Endpoints for:
 * - Batch BEO processing (100+ per week)
 * - Staff shortage forecasting
 * - Job share management
 * - Outlet demand forecasting
 */

import { Router, Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import { highVolumeBEOProcessor } from '../services/high-volume-beo-processor.js';
import { staffShortageForecaster } from '../services/staff-shortage-forecaster.js';
import { outletDemandForecaster } from '../services/outlet-demand-forecaster.js';
import { jobShareManager } from '../services/job-share-manager.js';

const router = Router();

/**
 * POST /api/scheduling/batch-process-week
 * Process a batch of BEOs for a week (100+ BEOs)
 */
router.post('/batch-process-week', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { weekStart, weekEnd, options } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !weekStart || !weekEnd) {
      return res.status(400).json({
        success: false,
        error: 'orgId, weekStart, and weekEnd are required',
      });
    }

    const result = await highVolumeBEOProcessor.processWeeklyBatch(
      weekStart,
      weekEnd,
      orgId,
      options
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[HighVolumeScheduling] Error processing batch:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/scheduling/weekly-allocation
 * Get staff allocation across all events for a week
 */
router.get('/weekly-allocation', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { weekStart, weekEnd } = req.query;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!orgId || !weekStart || !weekEnd) {
      return res.status(400).json({
        success: false,
        error: 'orgId, weekStart, and weekEnd are required',
      });
    }

    const allocation = await highVolumeBEOProcessor.getWeeklyStaffAllocation(
      weekStart as string,
      weekEnd as string,
      orgId
    );

    res.json({ success: true, data: allocation });
  } catch (error: any) {
    console.error('[HighVolumeScheduling] Error fetching allocation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/scheduling/forecast-shortages
 * Forecast staff shortages for a future period
 */
router.post('/forecast-shortages', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, lookAheadWeeks } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'orgId, startDate, and endDate are required',
      });
    }

    const forecast = await staffShortageForecaster.forecastShortages(
      startDate,
      endDate,
      orgId,
      lookAheadWeeks || 4
    );

    res.json({ success: true, data: forecast });
  } catch (error: any) {
    console.error('[HighVolumeScheduling] Error forecasting shortages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/scheduling/generate-job-shares
 * Generate job share opportunities from forecast
 */
router.post('/generate-job-shares', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { forecast } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !forecast) {
      return res.status(400).json({
        success: false,
        error: 'orgId and forecast are required',
      });
    }

    const opportunities = await staffShortageForecaster.generateJobShareOpportunities(
      forecast,
      orgId
    );

    res.json({ success: true, data: opportunities });
  } catch (error: any) {
    console.error('[HighVolumeScheduling] Error generating job shares:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/scheduling/propose-job-share
 * Propose job share to Chef for approval
 */
router.post('/propose-job-share', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { opportunity, chefId } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !opportunity || !chefId) {
      return res.status(400).json({
        success: false,
        error: 'orgId, opportunity, and chefId are required',
      });
    }

    const result = await staffShortageForecaster.proposeJobShareToChef(
      opportunity,
      orgId,
      chefId
    );

    res.json({ success: result.success, data: result });
  } catch (error: any) {
    console.error('[HighVolumeScheduling] Error proposing job share:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/scheduling/forecast-outlet-demand
 * Forecast demand for an outlet
 */
router.post('/forecast-outlet-demand', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { outletId, startDate, endDate, lookBackDays } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !outletId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'orgId, outletId, startDate, and endDate are required',
      });
    }

    const forecast = await outletDemandForecaster.forecastOutletDemand(
      outletId,
      startDate,
      endDate,
      orgId,
      lookBackDays || 90
    );

    res.json({ success: true, data: forecast });
  } catch (error: any) {
    console.error('[HighVolumeScheduling] Error forecasting outlet demand:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/scheduling/outlet-job-shares
 * Generate job share opportunities from outlet forecast
 */
router.post('/outlet-job-shares', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { forecast } = req.body;

    if (!forecast) {
      return res.status(400).json({
        success: false,
        error: 'forecast is required',
      });
    }

    const opportunities = await outletDemandForecaster.generateJobShareOpportunities(forecast);

    res.json({ success: true, data: opportunities });
  } catch (error: any) {
    console.error('[HighVolumeScheduling] Error generating outlet job shares:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/scheduling/job-share/create
 * Create job share posting
 */
router.post('/job-share/create', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { opportunity } = req.body;
    const createdBy = req.user?.id || req.body.createdBy;

    if (!opportunity || !createdBy) {
      return res.status(400).json({
        success: false,
        error: 'opportunity and createdBy are required',
      });
    }

    const posting = await jobShareManager.createJobSharePosting(opportunity, createdBy);

    res.json({ success: true, data: posting });
  } catch (error: any) {
    console.error('[HighVolumeScheduling] Error creating job share:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/scheduling/job-share/submit-approval
 * Submit job share for Chef approval
 */
router.post('/job-share/submit-approval', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { opportunityId, chefId } = req.body;

    if (!opportunityId || !chefId) {
      return res.status(400).json({
        success: false,
        error: 'opportunityId and chefId are required',
      });
    }

    const result = await jobShareManager.submitForChefApproval(opportunityId, chefId);

    res.json({ success: result.success, data: result });
  } catch (error: any) {
    console.error('[HighVolumeScheduling] Error submitting for approval:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/scheduling/job-share/chef-approve
 * Chef approves job share
 */
router.post('/job-share/chef-approve', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { opportunityId, chefId, chefName } = req.body;

    if (!opportunityId || !chefId || !chefName) {
      return res.status(400).json({
        success: false,
        error: 'opportunityId, chefId, and chefName are required',
      });
    }

    const result = await jobShareManager.chefApproveJobShare(opportunityId, chefId, chefName);

    res.json({ success: result.success, data: result });
  } catch (error: any) {
    console.error('[HighVolumeScheduling] Error approving job share:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/scheduling/job-share/chef-reject
 * Chef rejects job share
 */
router.post('/job-share/chef-reject', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { opportunityId, chefId, reason } = req.body;

    if (!opportunityId || !chefId) {
      return res.status(400).json({
        success: false,
        error: 'opportunityId and chefId are required',
      });
    }

    const result = await jobShareManager.chefRejectJobShare(opportunityId, chefId, reason || 'No reason provided');

    res.json({ success: result.success, data: result });
  } catch (error: any) {
    console.error('[HighVolumeScheduling] Error rejecting job share:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/scheduling/job-share/apply
 * Employee applies for job share
 */
router.post('/job-share/apply', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { opportunityId, employeeId, employeeName, notes } = req.body;

    if (!opportunityId || !employeeId || !employeeName) {
      return res.status(400).json({
        success: false,
        error: 'opportunityId, employeeId, and employeeName are required',
      });
    }

    const application = await jobShareManager.applyForJobShare(
      opportunityId,
      employeeId,
      employeeName,
      notes
    );

    res.json({ success: true, data: application });
  } catch (error: any) {
    console.error('[HighVolumeScheduling] Error applying for job share:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/scheduling/job-share/assign
 * Assign employee to job share
 */
router.post('/job-share/assign', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { opportunityId, applicationId, assignedBy } = req.body;

    if (!opportunityId || !applicationId || !assignedBy) {
      return res.status(400).json({
        success: false,
        error: 'opportunityId, applicationId, and assignedBy are required',
      });
    }

    const result = await jobShareManager.assignJobShare(opportunityId, applicationId, assignedBy);

    res.json({ success: result.success, data: result });
  } catch (error: any) {
    console.error('[HighVolumeScheduling] Error assigning job share:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/scheduling/job-share/list
 * Get job share postings
 */
router.get('/job-share/list', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string | undefined,
      date: req.query.date as string | undefined,
      role: req.query.role as string | undefined,
      chefApproved: req.query.chefApproved === 'true' ? true : req.query.chefApproved === 'false' ? false : undefined,
    };

    const postings = await jobShareManager.getJobSharePostings(filters);

    res.json({ success: true, data: postings });
  } catch (error: any) {
    console.error('[HighVolumeScheduling] Error fetching job shares:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/scheduling/job-share/:opportunityId
 * Get job share posting by ID
 */
router.get('/job-share/:opportunityId', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { opportunityId } = req.params;

    const posting = await jobShareManager.getJobSharePosting(opportunityId);

    if (!posting) {
      return res.status(404).json({ success: false, error: 'Job share posting not found' });
    }

    res.json({ success: true, data: posting });
  } catch (error: any) {
    console.error('[HighVolumeScheduling] Error fetching job share:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
