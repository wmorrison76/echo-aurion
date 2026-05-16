/**
 * Wisdom Engine
 * 35 years of hospitality experience - COMPLETE VERSION
 */

interface WisdomRule {
  id: string;
  domain: string;
  principle: string;
  reasoning: string;
  confidence: number;
  yearsOfExperience: number;
}

export class WisdomEngine {
  private wisdomBase: WisdomRule[] = [
    // ========================================================================
    // CORE KITCHEN WISDOM
    // ========================================================================
    {
      id: 'kitchen-001',
      domain: 'kitchen',
      principle: 'Never run out of your signature dish',
      reasoning: 'Guests come specifically for it. Running out damages reputation more than overstock costs.',
      confidence: 0.98,
      yearsOfExperience: 35
    },
    {
      id: 'kitchen-002',
      domain: 'kitchen',
      principle: 'Order fish daily, meat weekly, dry goods monthly',
      reasoning: 'Freshness is non-negotiable for protein. Balance freshness with storage efficiency.',
      confidence: 0.95,
      yearsOfExperience: 35
    },
    {
      id: 'kitchen-003',
      domain: 'kitchen',
      principle: 'Prep for 110% of forecast, cook for 100%',
      reasoning: 'Better to have extra mise en place than scramble during service.',
      confidence: 0.92,
      yearsOfExperience: 30
    },
    {
      id: 'kitchen-004',
      domain: 'kitchen',
      principle: 'Taste everything before service',
      reasoning: 'Seasoning and flavor are the difference between good and great. Check every batch.',
      confidence: 0.99,
      yearsOfExperience: 35
    },
    {
      id: 'kitchen-005',
      domain: 'kitchen',
      principle: 'Label and date everything',
      reasoning: 'FIFO only works if you know what came in when. Prevents waste and food safety issues.',
      confidence: 0.98,
      yearsOfExperience: 30
    },
    {
      id: 'kitchen-006',
      domain: 'kitchen',
      principle: 'Your mise en place is your lifeline',
      reasoning: 'During the rush, there is no time to look for things. Everything must be within arm\'s reach.',
      confidence: 0.97,
      yearsOfExperience: 35
    },
    {
      id: 'kitchen-007',
      domain: 'kitchen',
      principle: 'Clean as you go, not after service',
      reasoning: 'A clean station means clear mind. Clutter causes mistakes during the rush.',
      confidence: 0.95,
      yearsOfExperience: 28
    },
    {
      id: 'kitchen-008',
      domain: 'kitchen',
      principle: 'If you think it needs more salt, it probably does',
      reasoning: 'Most food fails from under-seasoning, not over. Trust your palate.',
      confidence: 0.92,
      yearsOfExperience: 30
    },
    
    // ========================================================================
    // SERVICE EXCELLENCE
    // ========================================================================
    {
      id: 'service-001',
      domain: 'service',
      principle: 'Schedule your best server for the busiest shift',
      reasoning: 'When it matters most, excellence compounds. A great server makes everyone better.',
      confidence: 0.96,
      yearsOfExperience: 35
    },
    {
      id: 'service-002',
      domain: 'service',
      principle: 'Never seat a party of 6+ without checking kitchen capacity',
      reasoning: 'Large parties can break kitchen flow. Coordination prevents disaster.',
      confidence: 0.94,
      yearsOfExperience: 28
    },
    {
      id: 'service-003',
      domain: 'service',
      principle: 'Greet every table within 60 seconds',
      reasoning: 'First impression sets the tone. Guests tolerate slow service better when acknowledged immediately.',
      confidence: 0.96,
      yearsOfExperience: 32
    },
    {
      id: 'service-004',
      domain: 'service',
      principle: 'Read the table before you speak',
      reasoning: 'Body language tells you if they want conversation or efficiency. Adapt your approach.',
      confidence: 0.94,
      yearsOfExperience: 28
    },
    {
      id: 'service-005',
      domain: 'service',
      principle: 'Never run to a table, but walk with purpose',
      reasoning: 'Running signals panic. Purposeful walking shows control while maintaining urgency.',
      confidence: 0.91,
      yearsOfExperience: 25
    },
    {
      id: 'service-006',
      domain: 'service',
      principle: 'Server called out 2 hours before dinner rush? Call everyone, not just backups',
      reasoning: 'Backups are busy. Cast a wide net fast. Someone will save you.',
      confidence: 0.93,
      yearsOfExperience: 32
    },
    
    // ========================================================================
    // FINANCIAL INTELLIGENCE
    // ========================================================================
    {
      id: 'finance-001',
      domain: 'finance',
      principle: 'Food cost is meaningless without yield calculation',
      reasoning: 'Raw cost ignores trim loss. A $10/lb protein at 50% yield costs $20/lb usable.',
      confidence: 0.99,
      yearsOfExperience: 35
    },
    {
      id: 'finance-002',
      domain: 'finance',
      principle: 'Labor is your second highest cost and your only competitive advantage',
      reasoning: 'Great people create experiences. Price-cutting on labor destroys quality.',
      confidence: 0.97,
      yearsOfExperience: 35
    },
    {
      id: 'finance-003',
      domain: 'finance',
      principle: 'Your theoretical food cost and actual cost will never match',
      reasoning: 'Waste, theft, over-portioning, and mistakes always create variance. 2-3% is normal.',
      confidence: 0.97,
      yearsOfExperience: 35
    },
    {
      id: 'finance-004',
      domain: 'finance',
      principle: 'Menu engineering is more important than cost control',
      reasoning: 'Selling high-margin items matters more than cutting pennies. Guide guests to profitable choices.',
      confidence: 0.95,
      yearsOfExperience: 32
    },
    
    // ========================================================================
    // CRISIS MANAGEMENT
    // ========================================================================
    {
      id: 'crisis-001',
      domain: 'crisis',
      principle: 'When the walk-in dies, buy ice immediately and call repair',
      reasoning: 'Every minute counts. Ice buys time. Hesitation costs thousands.',
      confidence: 1.0,
      yearsOfExperience: 35
    },
    {
      id: 'crisis-002',
      domain: 'crisis',
      principle: 'When in doubt, 86 it',
      reasoning: 'Running out is better than serving substandard food. Protect your reputation.',
      confidence: 0.97,
      yearsOfExperience: 35
    },
    {
      id: 'crisis-003',
      domain: 'crisis',
      principle: 'The health inspector is never "just checking in"',
      reasoning: 'Every visit is an opportunity to fail. Be inspection-ready every single day.',
      confidence: 1.0,
      yearsOfExperience: 35
    },
    {
      id: 'crisis-004',
      domain: 'crisis',
      principle: 'When the rush hits, slow down',
      reasoning: 'Speed comes from rhythm, not panic. Calm, deliberate movements prevent mistakes.',
      confidence: 0.96,
      yearsOfExperience: 33
    },
    
    // ========================================================================
    // GUEST RELATIONS
    // ========================================================================
    {
      id: 'guest-001',
      domain: 'guest',
      principle: 'Fix complaints immediately, not after service',
      reasoning: 'A resolved issue creates loyalty. A delayed resolution creates a bad review.',
      confidence: 0.98,
      yearsOfExperience: 35
    },
    {
      id: 'guest-002',
      domain: 'guest',
      principle: 'An angry guest just wants to be heard',
      reasoning: 'Most complaints de-escalate when you listen first and solve second. Validate their frustration.',
      confidence: 0.98,
      yearsOfExperience: 35
    },
    {
      id: 'guest-003',
      domain: 'guest',
      principle: 'Comp strategically, not reflexively',
      reasoning: 'Free food solves some problems and creates others. Fix the issue first, comp if necessary.',
      confidence: 0.95,
      yearsOfExperience: 32
    },
    
    // ========================================================================
    // VENDOR MANAGEMENT
    // ========================================================================
    {
      id: 'vendor-001',
      domain: 'vendor',
      principle: 'Always have a backup vendor for critical items',
      reasoning: 'Supply chain breaks. Having options prevents menu disasters.',
      confidence: 0.96,
      yearsOfExperience: 30
    },
    {
      id: 'vendor-002',
      domain: 'vendor',
      principle: 'Build relationships before you need favors',
      reasoning: 'Emergency deliveries happen for people, not accounts.',
      confidence: 0.95,
      yearsOfExperience: 35
    },
    {
      id: 'vendor-003',
      domain: 'vendor',
      principle: 'Pay your vendors on time, every time',
      reasoning: 'Credit is a privilege. Reliable payers get better prices, priority, and favors.',
      confidence: 0.99,
      yearsOfExperience: 35
    },
    {
      id: 'vendor-004',
      domain: 'vendor',
      principle: 'Check in deliveries before the driver leaves',
      reasoning: 'Once they leave, you own it. Bad product, short counts - catch them immediately.',
      confidence: 0.98,
      yearsOfExperience: 33
    },
    
    // ========================================================================
    // STAFFING MASTERY
    // ========================================================================
    {
      id: 'staff-001',
      domain: 'staffing',
      principle: 'Hire for attitude, train for skill',
      reasoning: 'Skills can be taught. Character cannot. Great attitudes create great teams.',
      confidence: 0.99,
      yearsOfExperience: 35
    },
    {
      id: 'staff-002',
      domain: 'staffing',
      principle: 'Cross-train everyone on everything',
      reasoning: 'Flexibility prevents crises. Single points of failure kill operations.',
      confidence: 0.91,
      yearsOfExperience: 28
    },
    {
      id: 'staff-003',
      domain: 'staffing',
      principle: 'Pay your best people more than market rate',
      reasoning: 'Excellence is rare. Losing great staff costs more than raises. Retain your A-team.',
      confidence: 0.99,
      yearsOfExperience: 35
    },
    {
      id: 'staff-004',
      domain: 'staffing',
      principle: 'Fire fast, hire slow',
      reasoning: 'Bad employees damage morale daily. Take time to find great ones, remove toxic ones immediately.',
      confidence: 0.96,
      yearsOfExperience: 33
    },
    
    // ========================================================================
    // MENU DESIGN
    // ========================================================================
    {
      id: 'menu-001',
      domain: 'menu',
      principle: 'Your menu should have one thing you do better than anyone',
      reasoning: 'Reputation is built on excellence, not breadth. Be known for something.',
      confidence: 0.97,
      yearsOfExperience: 35
    },
    {
      id: 'menu-002',
      domain: 'menu',
      principle: 'Ingredient overlap reduces complexity and waste',
      reasoning: 'Using the same base ingredients across dishes simplifies purchasing and prep.',
      confidence: 0.94,
      yearsOfExperience: 30
    },
    {
      id: 'menu-003',
      domain: 'menu',
      principle: 'Smaller menus execute better than large ones',
      reasoning: 'Every item adds complexity. 12 great dishes beat 30 mediocre ones.',
      confidence: 0.96,
      yearsOfExperience: 35
    }
  ];
  
  /**
   * Get wisdom - PRIORITIZE DOMAIN MATCH
   */
  getWisdom(domain: string, situation: string): WisdomRule[] {
    // First: Get exact domain matches
    const domainMatches = this.wisdomBase.filter(w => w.domain === domain);
    
    // Second: Get relevant from other domains
    const otherRelevant = this.wisdomBase
      .filter(w => w.domain !== domain && this.isRelevant(w, situation))
      .sort((a, b) => (b.confidence * b.yearsOfExperience) - (a.confidence * a.yearsOfExperience));
    
    // Domain matches first, then others
    return [...domainMatches, ...otherRelevant];
  }
  
  private isRelevant(wisdom: WisdomRule, situation: string): boolean {
    const keywords = situation.toLowerCase().split(' ');
    const wisdomText = (wisdom.principle + ' ' + wisdom.reasoning).toLowerCase();
    return keywords.some(kw => wisdomText.includes(kw));
  }
  
  addWisdom(rule: Omit<WisdomRule, 'id'>): void {
    this.wisdomBase.push({
      id: `custom-${Date.now()}`,
      ...rule
    });
  }
  
  getAllWisdom(): WisdomRule[] {
    return this.wisdomBase;
  }
}

export const wisdomEngine = new WisdomEngine();
