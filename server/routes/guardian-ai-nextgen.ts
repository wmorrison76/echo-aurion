/**
 * Guardian AI Next-Generation API Routes
 * 
 * The gold standard system that all competitors will benchmark against
 * All text is i18n-ready with translation keys
 */

import { Router, Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import {
  behavioralAnalysisEngine,
  predictiveFraudEngine,
  crossModuleIntelligenceEngine,
  regulatoryComplianceEngine,
  realTimeMonitoringEngine,
} from '../services/guardian-ai-nextgen.js';

const router = Router();

/**
 * POST /api/guardian/nextgen/predict-fraud
 * Predict fraud before transaction is processed
 */
router.post('/predict-fraud', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { transaction, historicalTransactions, userProfile } = req.body;

    if (!transaction) {
      return res.status(400).json({
        success: false,
        error: 'Transaction is required',
        errorKey: 'guardian.nextgen.error.missing.transaction',
      });
    }

    const prediction = await predictiveFraudEngine.predictFraud(
      transaction,
      historicalTransactions || [],
      userProfile
    );

    res.json({
      success: true,
      data: prediction,
      message: prediction.recommendedAction === 'BLOCK'
        ? 'Fraud predicted - transaction blocked'
        : prediction.recommendedAction === 'REVIEW'
        ? 'Fraud risk detected - review recommended'
        : 'Transaction appears safe',
      messageKey: prediction.recommendedAction === 'BLOCK'
        ? 'guardian.nextgen.success.fraud.blocked'
        : prediction.recommendedAction === 'REVIEW'
        ? 'guardian.nextgen.warning.fraud.review'
        : 'guardian.nextgen.success.safe',
    });
  } catch (error: any) {
    console.error('[GuardianNextGen] Error predicting fraud:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to predict fraud',
      errorKey: 'guardian.nextgen.error.prediction',
    });
  }
});

/**
 * POST /api/guardian/nextgen/analyze-behavior
 * Analyze user behavior and detect anomalies
 */
router.post('/analyze-behavior', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, transaction, context } = req.body;

    if (!userId || !transaction) {
      return res.status(400).json({
        success: false,
        error: 'User ID and transaction are required',
        errorKey: 'guardian.nextgen.error.missing.params',
      });
    }

    const anomalies = await behavioralAnalysisEngine.analyzeBehavior(
      userId,
      transaction,
      context || {}
    );

    res.json({
      success: true,
      data: {
        anomalies,
        anomalyCount: anomalies.length,
        criticalAnomalies: anomalies.filter(a => a.severity === 'CRITICAL').length,
      },
      message: anomalies.length > 0
        ? `${anomalies.length} behavioral anomaly(ies) detected`
        : 'No behavioral anomalies detected',
      messageKey: anomalies.length > 0
        ? 'guardian.nextgen.success.anomalies.detected'
        : 'guardian.nextgen.success.no.anomalies',
    });
  } catch (error: any) {
    console.error('[GuardianNextGen] Error analyzing behavior:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze behavior',
      errorKey: 'guardian.nextgen.error.behavior.analysis',
    });
  }
});

/**
 * POST /api/guardian/nextgen/cross-module-context
 * Gather context from all modules for enhanced decision-making
 */
router.post('/cross-module-context', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { orgId, outletId, date } = req.body;
    const userOrgId = req.user?.orgId || orgId;

    if (!userOrgId) {
      return res.status(400).json({
        success: false,
        error: 'Org ID is required',
        errorKey: 'guardian.nextgen.error.missing.orgId',
      });
    }

    const context = await crossModuleIntelligenceEngine.gatherContext(
      userOrgId,
      outletId,
      date
    );

    res.json({
      success: true,
      data: context,
      message: 'Cross-module context gathered successfully',
      messageKey: 'guardian.nextgen.success.context.gathered',
    });
  } catch (error: any) {
    console.error('[GuardianNextGen] Error gathering context:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to gather context',
      errorKey: 'guardian.nextgen.error.context',
    });
  }
});

/**
 * POST /api/guardian/nextgen/enhance-decision
 * Enhance Guardian decision with cross-module context
 */
router.post('/enhance-decision', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { guardianResult, context } = req.body;

    if (!guardianResult) {
      return res.status(400).json({
        success: false,
        error: 'Guardian result is required',
        errorKey: 'guardian.nextgen.error.missing.result',
      });
    }

    const enhancedResult = await crossModuleIntelligenceEngine.enhanceGuardianDecision(
      guardianResult,
      context || {}
    );

    res.json({
      success: true,
      data: enhancedResult,
      message: 'Guardian decision enhanced with cross-module context',
      messageKey: 'guardian.nextgen.success.decision.enhanced',
    });
  } catch (error: any) {
    console.error('[GuardianNextGen] Error enhancing decision:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to enhance decision',
      errorKey: 'guardian.nextgen.error.enhancement',
    });
  }
});

/**
 * GET /api/guardian/nextgen/regulatory-updates
 * Check for new regulatory updates
 */
router.get('/regulatory-updates', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { jurisdiction } = req.query;
    const jurisdictionCode = (jurisdiction as string) || 'US';

    const newRules = await regulatoryComplianceEngine.checkForNewRegulations(jurisdictionCode);

    res.json({
      success: true,
      data: {
        rules: newRules,
        count: newRules.length,
        autoApplied: newRules.filter(r => r.autoApplied).length,
        requiresReview: newRules.filter(r => r.requiresManualReview).length,
      },
      message: `${newRules.length} new regulatory rule(s) found`,
      messageKey: 'guardian.nextgen.success.regulatory.updates',
    });
  } catch (error: any) {
    console.error('[GuardianNextGen] Error checking regulatory updates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check regulatory updates',
      errorKey: 'guardian.nextgen.error.regulatory.check',
    });
  }
});

/**
 * POST /api/guardian/nextgen/monitoring/start
 * Start real-time continuous monitoring
 */
router.post('/monitoring/start', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { orgId } = req.body;
    const userOrgId = req.user?.orgId || orgId;

    if (!userOrgId) {
      return res.status(400).json({
        success: false,
        error: 'Org ID is required',
        errorKey: 'guardian.nextgen.error.missing.orgId',
      });
    }

    realTimeMonitoringEngine.startMonitoring(userOrgId);

    res.json({
      success: true,
      data: {
        orgId: userOrgId,
        status: 'MONITORING',
      },
      message: 'Real-time monitoring started',
      messageKey: 'guardian.nextgen.success.monitoring.started',
    });
  } catch (error: any) {
    console.error('[GuardianNextGen] Error starting monitoring:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start monitoring',
      errorKey: 'guardian.nextgen.error.monitoring.start',
    });
  }
});

/**
 * POST /api/guardian/nextgen/monitoring/stop
 * Stop real-time continuous monitoring
 */
router.post('/monitoring/stop', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    realTimeMonitoringEngine.stopMonitoring();

    res.json({
      success: true,
      data: {
        status: 'STOPPED',
      },
      message: 'Real-time monitoring stopped',
      messageKey: 'guardian.nextgen.success.monitoring.stopped',
    });
  } catch (error: any) {
    console.error('[GuardianNextGen] Error stopping monitoring:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to stop monitoring',
      errorKey: 'guardian.nextgen.error.monitoring.stop',
    });
  }
});

export default router;
