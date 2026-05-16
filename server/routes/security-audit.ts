/**
 * Security Audit API Routes
 * 
 * Endpoints for running security audits and viewing audit reports
 */

import { Router, Request, Response } from 'express';
import { securityAuditVerification } from '../scripts/security-audit-verification.js';
import { requireAuth } from '../middleware/auth';
import { getUserOrgId } from '../lib/multi-tenant';
import { logger } from '../lib/logger';

const router = Router();

/**
 * POST /api/security-audit/run
 * Run comprehensive security audit (admin only)
 */
router.post('/run', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getUserOrgId(req);
    const userId = (req as any).user?.id || (req as any).user?.sub;

    if (!orgId || !userId) {
      return res.status(400).json({
        error: 'MISSING_PARAMETERS',
        message: 'Organization ID and user ID are required',
      });
    }

    // TODO: Check if user is admin/security officer
    // For now, allow authenticated users to run audit

    logger.info('[SecurityAudit] Audit requested', { orgId, userId });

    const report = await securityAuditVerification.generateAuditReport();

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('[SecurityAudit] Audit failed', { error });
    res.status(500).json({
      error: 'AUDIT_FAILED',
      message: 'Failed to run security audit',
    });
  }
});

/**
 * GET /api/security-audit/routes
 * Get route audit results
 */
router.get('/routes', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getUserOrgId(req);

    if (!orgId) {
      return res.status(400).json({
        error: 'MISSING_ORG_ID',
        message: 'Organization ID is required',
      });
    }

    const routesResults = await securityAuditVerification.auditRoutes();

    res.json({
      success: true,
      data: {
        total: routesResults.length,
        secure: routesResults.filter((r) => r.status === 'secure').length,
        warnings: routesResults.filter((r) => r.status === 'warning').length,
        critical: routesResults.filter((r) => r.status === 'critical').length,
        routes: routesResults,
      },
    });
  } catch (error) {
    logger.error('[SecurityAudit] Failed to audit routes', { error });
    res.status(500).json({
      error: 'AUDIT_FAILED',
      message: 'Failed to audit routes',
    });
  }
});

/**
 * GET /api/security-audit/tables
 * Get table audit results
 */
router.get('/tables', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getUserOrgId(req);

    if (!orgId) {
      return res.status(400).json({
        error: 'MISSING_ORG_ID',
        message: 'Organization ID is required',
      });
    }

    const tablesResults = await securityAuditVerification.auditTables();

    res.json({
      success: true,
      data: {
        total: tablesResults.length,
        secure: tablesResults.filter((t) => t.status === 'secure').length,
        warnings: tablesResults.filter((t) => t.status === 'warning').length,
        critical: tablesResults.filter((t) => t.status === 'critical').length,
        tables: tablesResults,
      },
    });
  } catch (error) {
    logger.error('[SecurityAudit] Failed to audit tables', { error });
    res.status(500).json({
      error: 'AUDIT_FAILED',
      message: 'Failed to audit tables',
    });
  }
});

export default router;
