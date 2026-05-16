/**
 * Memory System
 * Echo remembers everything and learns
 */

interface Memory {
  id: string;
  timestamp: string;
  type: 'decision' | 'outcome' | 'conversation' | 'lesson';
  content: any;
  importance: number; // 0-1
  accessed: number; // access count
}

export class MemorySystem {
  private shortTermMemory: Memory[] = []; // Last 24 hours
  private longTermMemory: Memory[] = []; // Persistent
  
  /**
   * Store a memory
   */
  remember(
    type: Memory['type'],
    content: any,
    importance: number = 0.5
  ): string {
    const memory: Memory = {
      id: `mem-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      content,
      importance,
      accessed: 0
    };
    
    this.shortTermMemory.push(memory);
    
    // Move important memories to long-term
    if (importance > 0.7) {
      this.longTermMemory.push(memory);
    }
    
    // Cleanup old short-term memories
    this.cleanupShortTerm();
    
    return memory.id;
  }
  
  /**
   * Recall memories
   */
  recall(query: string, limit: number = 10): Memory[] {
    const allMemories = [...this.shortTermMemory, ...this.longTermMemory];
    
    // Simple relevance scoring
    const scored = allMemories.map(m => ({
      memory: m,
      relevance: this.calculateRelevance(m, query)
    }));
    
    // Sort by relevance and importance
    scored.sort((a, b) => 
      (b.relevance * b.memory.importance) - (a.relevance * a.memory.importance)
    );
    
    // Update access count
    scored.slice(0, limit).forEach(s => s.memory.accessed++);
    
    return scored.slice(0, limit).map(s => s.memory);
  }
  
  /**
   * Calculate relevance
   */
  private calculateRelevance(memory: Memory, query: string): number {
    const queryTerms = query.toLowerCase().split(' ');
    const contentStr = JSON.stringify(memory.content).toLowerCase();
    
    const matches = queryTerms.filter(term => contentStr.includes(term)).length;
    return matches / queryTerms.length;
  }
  
  /**
   * Cleanup old short-term memories
   */
  private cleanupShortTerm(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    this.shortTermMemory = this.shortTermMemory.filter(m =>
      new Date(m.timestamp) > oneDayAgo
    );
  }
  
  /**
   * Get memory stats
   */
  getStats(): {
    shortTerm: number;
    longTerm: number;
    totalAccesses: number;
  } {
    return {
      shortTerm: this.shortTermMemory.length,
      longTerm: this.longTermMemory.length,
      totalAccesses: [...this.shortTermMemory, ...this.longTermMemory]
        .reduce((sum, m) => sum + m.accessed, 0)
    };
  }
}

export const memorySystem = new MemorySystem();
