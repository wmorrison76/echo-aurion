/**
 * Proactive Insights API
 */

import { Router } from 'express';
import { proactiveEngine } from '../services/echo-ai3/proactive/proactive-engine';

const router = Router();

/**
 * GET /api/insights
 * Get proactive insights for organization
 */
router.get('/', async (req, res) => {
  try {
    const orgId = req.user!.orgId;
    const insights = await proactiveEngine.generateInsights(orgId);
    
    res.json({
      insights,
      count: insights.length,
      urgent: insights.filter(i => i.priority === 'urgent').length,
      high: insights.filter(i => i.priority === 'high').length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/insights/urgent
 * Get only urgent insights
 */
router.get('/urgent', async (req, res) => {
  try {
    const orgId = req.user!.orgId;
    const allInsights = await proactiveEngine.generateInsights(orgId);
    const urgent = allInsights.filter(i => i.priority === 'urgent' || i.priority === 'high');
    
    res.json({ insights: urgent, count: urgent.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
