/**
 * Improved Wisdom Matching
 * Better domain identification and relevance scoring
 */

export class WisdomMatcher {
  private domainKeywords = {
    kitchen: ['kitchen', 'cook', 'prep', 'food', 'chef', 'dish', 'recipe', 'ingredient', 'order fish', 'order meat', 'mise en place'],
    service: ['service', 'server', 'waiter', 'guest', 'table', 'seat', 'reservation', 'host', 'dining room', 'call out', 'called out'],
    finance: ['cost', 'price', 'money', 'profit', 'budget', 'revenue', 'expense', 'margin', 'yield'],
    staffing: ['staff', 'employee', 'hire', 'recruit', 'train', 'schedule', 'shift', 'team'],
    menu: ['menu', 'dish', 'signature', 'recipe', 'plate'],
    vendor: ['vendor', 'supplier', 'distributor', 'order', 'delivery', 'purvey'],
    crisis: ['emergency', 'broken', 'failed', 'crisis', 'problem', 'urgent', 'walk-in died', 'equipment'],
    guest: ['complaint', 'unhappy', 'review', 'feedback', 'dissatisfied']
  };
  
  /**
   * Identify domain with better accuracy
   */
  identifyDomain(text: string): string {
    const lower = text.toLowerCase();
    const scores: Record<string, number> = {};
    
    // Score each domain
    for (const [domain, keywords] of Object.entries(this.domainKeywords)) {
      scores[domain] = keywords.filter(kw => lower.includes(kw)).length;
    }
    
    // Find highest score
    const bestDomain = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)[0];
    
    return bestDomain && bestDomain[1] > 0 ? bestDomain[0] : 'general';
  }
  
  /**
   * Calculate relevance score (0-1)
   */
  calculateRelevance(wisdomText: string, query: string): number {
    const queryTerms = query.toLowerCase().split(' ');
    const wisdomLower = wisdomText.toLowerCase();
    
    let matches = 0;
    let totalWeight = 0;
    
    queryTerms.forEach((term, idx) => {
      // Earlier terms are more important
      const weight = 1 / (idx + 1);
      totalWeight += weight;
      
      if (wisdomLower.includes(term)) {
        matches += weight;
      }
    });
    
    return totalWeight > 0 ? matches / totalWeight : 0;
  }
}

export const wisdomMatcher = new WisdomMatcher();
