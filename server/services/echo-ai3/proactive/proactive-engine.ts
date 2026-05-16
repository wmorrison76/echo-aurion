/**
 * Proactive Insights Engine
 * Echo tells operators what to do BEFORE they ask
 */

import { wisdomEngine } from '../wisdom/wisdom-engine';
import { UUID } from '../../../../shared/types/base';

interface ProactiveInsight {
  id: UUID;
  orgId: UUID;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'opportunity' | 'risk' | 'optimization' | 'alert';
  title: string;
  description: string;
  impact: string;
  confidence: number;
  suggestedAction: string;
  estimatedTimeToResolve: string;
  estimatedValueImpact: number;
  wisdomBased?: string;
  dueBy?: string;
}

export class ProactiveEngine {
  /**
   * Generate insights for an organization
   */
  async generateInsights(orgId: UUID): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];
    
    // 1. Forecast-based insights
    const forecastInsights = await this.analyzeForecast(orgId);
    insights.push(...forecastInsights);
    
    // 2. Inventory-based insights
    const inventoryInsights = await this.analyzeInventory(orgId);
    insights.push(...inventoryInsights);
    
    // 3. Labor-based insights
    const laborInsights = await this.analyzeLabor(orgId);
    insights.push(...laborInsights);
    
    // 4. Wisdom-based insights
    const wisdomInsights = this.generateWisdomInsights(orgId);
    insights.push(...wisdomInsights);
    
    // Sort by priority and confidence
    return insights.sort((a, b) => {
      const priorityScore = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aScore = priorityScore[a.priority] * a.confidence;
      const bScore = priorityScore[b.priority] * b.confidence;
      return bScore - aScore;
    });
  }
  
  /**
   * Forecast-based insights
   */
  private async analyzeForecast(orgId: UUID): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];
    
    // TODO: Get actual forecast data
    // For now, simulate scenarios
    
    // Weekend rush detection
    const today = new Date().getDay();
    if (today === 4) { // Thursday
      insights.push({
        id: crypto.randomUUID() as UUID,
        orgId,
        priority: 'high',
        type: 'alert',
        title: 'Weekend Rush in 2 Days',
        description: 'Forecast predicts 35% higher covers this weekend. Kitchen prep should start tomorrow.',
        impact: '+$4,200 revenue opportunity if executed well',
        confidence: 0.89,
        suggestedAction: 'Review weekend prep list, order additional proteins today, schedule extra prep cook Friday',
        estimatedTimeToResolve: '2 hours',
        estimatedValueImpact: 4200,
        wisdomBased: 'Prep for 110% of forecast, cook for 100%',
        dueBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    return insights;
  }
  
  /**
   * Inventory-based insights
   */
  private async analyzeInventory(orgId: UUID): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];
    
    // Simulate low inventory alert
    insights.push({
      id: crypto.randomUUID() as UUID,
      orgId,
      priority: 'medium',
      type: 'alert',
      title: 'Protein Inventory Running Low',
      description: 'Chicken breast at 40% of par level. Based on forecast, you\'ll run out by Saturday dinner.',
      impact: 'Risk of 86ing signature dish',
      confidence: 0.92,
      suggestedAction: 'Place emergency order with backup vendor for Friday AM delivery',
      estimatedTimeToResolve: '15 minutes',
      estimatedValueImpact: -2400,
      wisdomBased: 'Never run out of your signature dish',
      dueBy: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
    });
    
    // Waste optimization opportunity
    insights.push({
      id: crypto.randomUUID() as UUID,
      orgId,
      priority: 'low',
      type: 'optimization',
      title: 'Reduce Produce Waste',
      description: 'Historical data shows 15% waste on leafy greens. Menu engineering could reduce this.',
      impact: 'Save $380/month',
      confidence: 0.78,
      suggestedAction: 'Cross-utilize greens across more dishes, or reduce portion sizes',
      estimatedTimeToResolve: '1 hour',
      estimatedValueImpact: 380
    });
    
    return insights;
  }
  
  /**
   * Labor-based insights
   */
  private async analyzeLabor(orgId: UUID): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];
    
    // Understaffing risk
    const today = new Date().getDay();
    if (today === 5 || today === 6) { // Fri/Sat
      insights.push({
        id: crypto.randomUUID() as UUID,
        orgId,
        priority: 'urgent',
        type: 'risk',
        title: 'Potential Understaffing Tonight',
        description: 'Scheduled 6 servers for 180 covers. Historical data shows 8 servers needed for quality service.',
        impact: 'Guest satisfaction at risk, potential bad reviews',
        confidence: 0.87,
        suggestedAction: 'Call in backup server or reduce reservation capacity',
        estimatedTimeToResolve: '30 minutes',
        estimatedValueImpact: -1200,
        wisdomBased: 'Schedule your best server for the busiest shift',
        dueBy: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      });
    }
    
    return insights;
  }
  
  /**
   * Wisdom-based proactive insights
   */
  private generateWisdomInsights(orgId: UUID): ProactiveInsight[] {
    const insights: ProactiveInsight[] = [];
    const allWisdom = wisdomEngine.getAllWisdom();
    
    // Randomly select 1-2 wisdom tips as proactive advice
    const tipOfDay = allWisdom[Math.floor(Math.random() * allWisdom.length)];
    
    insights.push({
      id: crypto.randomUUID() as UUID,
      orgId,
      priority: 'low',
      type: 'opportunity',
      title: `Daily Wisdom: ${tipOfDay.domain}`,
      description: tipOfDay.principle,
      impact: `Based on ${tipOfDay.yearsOfExperience} years of experience`,
      confidence: tipOfDay.confidence,
      suggestedAction: tipOfDay.reasoning,
      estimatedTimeToResolve: 'Ongoing practice',
      estimatedValueImpact: 0,
      wisdomBased: tipOfDay.principle
    });
    
    return insights;
  }
}

export const proactiveEngine = new ProactiveEngine();
