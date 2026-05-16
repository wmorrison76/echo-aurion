/**
 * Guardian AI API Routes
 * 
 * Endpoints for 4-Layer AI Guardian validation
 * All text is i18n-ready with translation keys
 */

import { Router, Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import { GuardianOrchestrator } from '../services/guardian-ai-enhanced.js';
import type { JournalEntry, APInvoice } from '../services/guardian-ai-enhanced.js';

const router = Router();

/**
 * POST /api/guardian/validate
 * Run all Guardian checks on a transaction
 */
router.post('/validate', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { transaction, recentTransactions, historicalTransactions, context } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!transaction || !orgId) {
      return res.status(400).json({
        success: false,
        error: 'Transaction and orgId are required',
        errorKey: 'guardian.api.error.missing.params', // i18n key
      });
    }

    // Get GL accounts for Argus
    // In production, fetch from database
    const glAccounts = new Map();

    // Create orchestrator
    const orchestrator = new GuardianOrchestrator(glAccounts);

    // Run Guardian checks
    const result = await orchestrator.runGuardianChecks(
      transaction,
      recentTransactions || [],
      historicalTransactions || [],
      {
        ...context,
        userProfile: req.user,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        echoAI3Enabled: context?.echoAI3Enabled !== false,
      }
    );

    res.json({
      success: true,
      data: result,
      message: result.passedAll
        ? 'Transaction passed all Guardian checks'
        : 'Transaction has issues that need attention',
      messageKey: result.passedAll
        ? 'guardian.api.success.passed' // i18n key
        : 'guardian.api.warning.issues', // i18n key
    });
  } catch (error: any) {
    console.error('[GuardianAI] Error validating transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate transaction',
      errorKey: 'guardian.api.error.generic', // i18n key
    });
  }
});

/**
 * POST /api/guardian/argus/validate
 * Run Argus Guardian checks only
 */
router.post('/argus/validate', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { transaction } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!transaction || !orgId) {
      return res.status(400).json({
        success: false,
        error: 'Transaction and orgId are required',
        errorKey: 'guardian.api.error.missing.params',
      });
    }

    const { ArgusGuardian } = await import('../services/guardian-ai-enhanced.js');
    const glAccounts = new Map();
    const argus = new ArgusGuardian(glAccounts);

    const result = 'lines' in transaction
      ? await argus.validateJournalEntry(transaction)
      : await argus.validateAPInvoice(transaction);

    res.json({
      success: true,
      data: result,
      messageKey: result.passed
        ? 'guardian.argus.success.passed'
        : 'guardian.argus.error.failed',
    });
  } catch (error: any) {
    console.error('[GuardianAI] Error running Argus checks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run Argus checks',
      errorKey: 'guardian.api.error.argus',
    });
  }
});

/**
 * POST /api/guardian/zelda/detect-duplicates
 * Run Zelda Guardian duplicate detection
 */
router.post('/zelda/detect-duplicates', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { invoices, recentInvoices, historicalInvoices } = req.body;

    if (!invoices || !Array.isArray(invoices)) {
      return res.status(400).json({
        success: false,
        error: 'Invoices array is required',
        errorKey: 'guardian.api.error.missing.invoices',
      });
    }

    const { ZeldaGuardian } = await import('../services/guardian-ai-enhanced.js');
    const zelda = new ZeldaGuardian();

    const result = await zelda.detectDuplicates(
      invoices,
      recentInvoices || [],
      historicalInvoices || []
    );

    res.json({
      success: true,
      data: result,
      messageKey: result.passed
        ? 'guardian.zelda.success.no.duplicates'
        : 'guardian.zelda.warning.duplicates.found',
    });
  } catch (error: any) {
    console.error('[GuardianAI] Error running Zelda checks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run Zelda checks',
      errorKey: 'guardian.api.error.zelda',
    });
  }
});

/**
 * POST /api/guardian/phoenix/detect-anomalies
 * Run Phoenix Guardian anomaly detection
 */
router.post('/phoenix/detect-anomalies', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { entries, historicalEntries, context } = req.body;

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({
        success: false,
        error: 'Entries array is required',
        errorKey: 'guardian.api.error.missing.entries',
      });
    }

    const { PhoenixGuardian } = await import('../services/guardian-ai-enhanced.js');
    const phoenix = new PhoenixGuardian();

    const result = await phoenix.detectAnomalies(
      entries,
      historicalEntries || [],
      {
        ...context,
        userProfile: req.user,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }
    );

    res.json({
      success: true,
      data: result,
      messageKey: result.passed
        ? 'guardian.phoenix.success.no.anomalies'
        : 'guardian.phoenix.warning.anomalies.found',
    });
  } catch (error: any) {
    console.error('[GuardianAI] Error running Phoenix checks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run Phoenix checks',
      errorKey: 'guardian.api.error.phoenix',
    });
  }
});

/**
 * POST /api/guardian/odin/log
 * Create immutable audit trail (Odin)
 */
router.post('/odin/log', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { action, details } = req.body;
    const actor = req.user?.sub || 'system';

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required',
        errorKey: 'guardian.api.error.missing.action',
      });
    }

    const { OdinGuardian } = await import('../services/guardian-ai-enhanced.js');
    const odin = new OdinGuardian();

    const result = await odin.logImmutable(
      action,
      actor,
      details || {},
      {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }
    );

    res.json({
      success: true,
      data: result,
      messageKey: 'guardian.odin.success.logged',
    });
  } catch (error: any) {
    console.error('[GuardianAI] Error logging audit trail:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to log audit trail',
      errorKey: 'guardian.api.error.odin',
    });
  }
});

/**
 * GET /api/guardian/odin/verify-integrity
 * Verify integrity of transaction chain
 */
router.get('/odin/verify-integrity', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { entryIds } = req.query;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!entryIds || !orgId) {
      return res.status(400).json({
        success: false,
        error: 'Entry IDs and orgId are required',
        errorKey: 'guardian.api.error.missing.params',
      });
    }

    // In production, fetch entries from database
    const entries: any[] = [];

    const { OdinGuardian } = await import('../services/guardian-ai-enhanced.js');
    const odin = new OdinGuardian();

    const integrityVerified = await odin.verifyIntegrity(entries);

    res.json({
      success: true,
      data: {
        integrityVerified,
        message: integrityVerified
          ? 'All transactions verified - no tampering detected'
          : 'Integrity issues detected - investigation required',
        messageKey: integrityVerified
          ? 'guardian.odin.success.integrity.verified'
          : 'guardian.odin.error.integrity.issues',
      },
    });
  } catch (error: any) {
    console.error('[GuardianAI] Error verifying integrity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify integrity',
      errorKey: 'guardian.api.error.integrity',
    });
  }
});

/**
 * GET /api/guardian/odin/audit-report
 * Generate comprehensive audit report
 */
router.get('/odin/audit-report', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, includeChain } = req.query;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'orgId is required',
        errorKey: 'guardian.api.error.missing.orgId',
      });
    }

    // In production, fetch entries and invoices from database
    const entries: any[] = [];
    const invoices: any[] = [];

    const { OdinGuardian } = await import('../services/guardian-ai-enhanced.js');
    const odin = new OdinGuardian();

    const report = await odin.generateAuditReport(entries, invoices, {
      startDate: startDate as string,
      endDate: endDate as string,
      includeChain: includeChain === 'true',
    });

    res.json({
      success: true,
      data: report,
      messageKey: 'guardian.odin.success.report.generated',
    });
  } catch (error: any) {
    console.error('[GuardianAI] Error generating audit report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate audit report',
      errorKey: 'guardian.api.error.report',
    });
  }
});

/**
 * POST /api/guardian/phoenix/rollback
 * Prepare rollback with comprehensive audit trail
 */
router.post('/phoenix/rollback', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { entryId, reason } = req.body;
    const requestedBy = req.user?.sub;

    if (!entryId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Entry ID and reason are required',
        errorKey: 'guardian.api.error.missing.params',
      });
    }

    const { PhoenixGuardian } = await import('../services/guardian-ai-enhanced.js');
    const phoenix = new PhoenixGuardian();

    const rollback = await phoenix.prepareRollback(entryId, reason, {
      requestedBy,
      approvalRequired: true, // Rollbacks always require approval
    });

    res.json({
      success: true,
      data: rollback,
      messageKey: 'guardian.phoenix.success.rollback.prepared',
    });
  } catch (error: any) {
    console.error('[GuardianAI] Error preparing rollback:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to prepare rollback',
      errorKey: 'guardian.api.error.rollback',
    });
  }
});

export default router;
