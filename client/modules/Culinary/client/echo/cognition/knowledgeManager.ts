/**
 * EchoAi³ Knowledge Management System
 * Orchestrates crawler, gap detection, and vetting systems
 * Manages the complete knowledge lifecycle and integration
 */

import KnowledgeCrawler, {
  type CrawledKnowledge,
  type CrawlerResult,
  type TriggerType,
  type KnowledgeSource,
} from "./knowledgeCrawler";
import KnowledgeGapDetector, {
  type GapAnalysis,
  type KnowledgeGap,
} from "./gapDetector";
import KnowledgeVettingEngine, {
  type VettingResult,
  type VettingCriteria,
} from "./knowledgeVetting";
import type { IngredientChemistryProfile } from "../codex/ingredientChemistry";
import type { RecipeCodexMetadata } from "../codex";

export interface KnowledgeManagementConfig {
  enableAutoCrawl: boolean;
  enableAutoVetting: boolean;
  enableGapDetection: boolean;
  crawlSchedule?: {
    interval: number; // milliseconds
    topics: string[];
  };
  vetCriteria?: Partial<VettingCriteria>;
}

export interface KnowledgeIntegrationJob {
  id: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  type: "crawl" | "vet" | "gap_detection" | "integration";
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: any;
  error?: string;
  progress: number; // 0-1
}

export interface KnowledgeMetrics {
  totalKnowledgeItems: number;
  approvedItems: number;
  rejectedItems: number;
  quarantinedItems: number;
  averageTrustScore: number;
  lastCrawlTime: number;
  lastIntegrationTime: number;
  detectedGaps: number;
  coveredDomains: string[];
}

/**
 * Central Knowledge Manager
 * Coordinates all knowledge-related operations
 */
export class KnowledgeManager {
  private crawler: KnowledgeCrawler;
  private gapDetector: KnowledgeGapDetector;
  private vettingEngine: KnowledgeVettingEngine;
  private config: KnowledgeManagementConfig;
  private jobs: Map<string, KnowledgeIntegrationJob>;
  private knowledgeLibrary: Map<string, CrawledKnowledge>;
  private vettingResults: Map<string, VettingResult>;
  private gapAnalysis: GapAnalysis | null;
  private culinaryBrain: any;
  private scheduleTimer?: NodeJS.Timeout;

  constructor(
    config: Partial<KnowledgeManagementConfig> = {},
    culinaryBrain?: any,
  ) {
    this.config = {
      enableAutoCrawl: false,
      enableAutoVetting: true,
      enableGapDetection: true,
      ...config,
    };

    this.crawler = new KnowledgeCrawler();
    this.gapDetector = new KnowledgeGapDetector();
    this.vettingEngine = new KnowledgeVettingEngine(culinaryBrain);
    this.culinaryBrain = culinaryBrain;
    this.jobs = new Map();
    this.knowledgeLibrary = new Map();
    this.vettingResults = new Map();
    this.gapAnalysis = null;

    if (config.enableAutoCrawl && config.crawlSchedule) {
      this.startScheduledCrawl(config.crawlSchedule);
    }
  }

  /**
   * Register knowledge base components
   */
  registerKnowledgeBase(
    recipes: RecipeCodexMetadata[],
    ingredients: Record<string, any>,
  ): void {
    this.gapDetector.registerRecipes(recipes);
    this.gapDetector.registerIngredients(ingredients);

    // Register recipes with crawler for local searching
    this.crawler.registerLocalRecipes(recipes);

    const ingredientMap = new Map<string, IngredientChemistryProfile>();
    Object.entries(ingredients).forEach(([id, ingredient]) => {
      ingredientMap.set(id, ingredient as IngredientChemistryProfile);
    });
    this.vettingEngine.registerIngredientDatabase(ingredientMap);
  }

  /**
   * Run complete knowledge expansion workflow
   */
  async expandKnowledge(
    query: string,
    triggerType: TriggerType = "user_query",
  ): Promise<{
    crawlResult: CrawlerResult;
    vetResult: VettingResult[];
    newlyApprovedKnowledge: CrawledKnowledge[];
  }> {
    const jobId = this.createJob("crawl");

    try {
      // Phase 1: Crawl
      this.updateJobProgress(jobId, 0.2, "Crawling knowledge sources...");
      const crawlResult = await this.crawler.crawlByQuery(query);

      // Phase 2: Vet each item
      this.updateJobProgress(jobId, 0.4, "Vetting crawled knowledge...");
      const vetResults: VettingResult[] = [];
      for (const knowledge of crawlResult.knowledge) {
        const vetResult = await this.vettingEngine.vetKnowledge(
          knowledge,
          this.config.vetCriteria,
        );
        vetResults.push(vetResult);
        this.vettingResults.set(knowledge.id, vetResult);
      }

      // Phase 3: Store approved knowledge
      this.updateJobProgress(jobId, 0.7, "Integrating approved knowledge...");
      const approvedKnowledge = crawlResult.knowledge.filter(
        (k) =>
          this.vettingResults.get(k.id)?.level === "approved" ||
          this.vettingResults.get(k.id)?.level === "approved_with_notes",
      );

      approvedKnowledge.forEach((knowledge) => {
        this.knowledgeLibrary.set(knowledge.id, knowledge);
      });

      // Phase 4: Update gap analysis
      this.updateJobProgress(jobId, 0.9, "Analyzing gaps...");
      if (this.config.enableGapDetection) {
        await this.analyzeGaps();
      }

      this.completeJob(jobId, {
        crawlResult,
        vetResult: vetResults,
        approvedCount: approvedKnowledge.length,
      });

      return {
        crawlResult,
        vetResult: vetResults,
        newlyApprovedKnowledge: approvedKnowledge,
      };
    } catch (error) {
      this.failJob(
        jobId,
        error instanceof Error ? error.message : "Unknown error",
      );
      throw error;
    }
  }

  /**
   * Analyze knowledge gaps and trigger targeted crawls
   */
  async analyzeGaps(): Promise<GapAnalysis> {
    const jobId = this.createJob("gap_detection");

    try {
      const analysis = this.gapDetector.detectAllGaps();
      this.gapAnalysis = analysis;

      // Automatically crawl critical gaps
      if (this.config.enableAutoCrawl) {
        const criticalGaps = analysis.gaps.filter(
          (g) => g.priority === "critical",
        );
        for (const gap of criticalGaps.slice(0, 5)) {
          // Limit to 5 auto-crawls
          this.crawlGap(gap.id, gap.category);
        }
      }

      this.completeJob(jobId, analysis);
      return analysis;
    } catch (error) {
      this.failJob(
        jobId,
        error instanceof Error ? error.message : "Unknown error",
      );
      throw error;
    }
  }

  /**
   * Crawl specific knowledge gap
   */
  async crawlGap(gapId: string, gapType: string): Promise<CrawlerResult> {
    const jobId = this.createJob("crawl");

    try {
      const result = await this.crawler.crawlGap(gapType, gapType);
      this.completeJob(jobId, result);
      return result;
    } catch (error) {
      this.failJob(
        jobId,
        error instanceof Error ? error.message : "Unknown error",
      );
      throw error;
    }
  }

  /**
   * Manual knowledge import and vetting
   */
  async importAndVet(
    knowledge: CrawledKnowledge,
    criteria?: Partial<VettingCriteria>,
  ): Promise<VettingResult> {
    const vetResult = await this.vettingEngine.vetKnowledge(
      knowledge,
      criteria,
    );

    if (
      vetResult.level === "approved" ||
      vetResult.level === "approved_with_notes"
    ) {
      this.knowledgeLibrary.set(knowledge.id, knowledge);
    }

    this.vettingResults.set(knowledge.id, vetResult);
    return vetResult;
  }

  /**
   * Get recommended knowledge sources for a query
   */
  getRecommendedSources(query: string): KnowledgeSource[] {
    const queryLower = query.toLowerCase();

    const sourceMap: Record<string, KnowledgeSource[]> = {
      "allergen|allergy|intolerance": [
        "ingredient_supplier",
        "academic_paper",
        "recipe_database",
      ],
      "flavor|taste|balance": ["academic_paper", "food_blog", "youtube_video"],
      "technique|method|process": [
        "youtube_video",
        "food_blog",
        "restaurant_menu",
      ],
      "cost|price|budget": ["ingredient_supplier", "restaurant_menu"],
      "nutrition|calorie|macro": [
        "academic_paper",
        "recipe_database",
        "ingredient_supplier",
      ],
      "ingredient|substitut": [
        "food_blog",
        "recipe_database",
        "ingredient_supplier",
      ],
      "trend|modern|fusion": ["restaurant_menu", "food_blog", "youtube_video"],
    };

    let recommendedSources: KnowledgeSource[] = [];

    for (const [keyword, sources] of Object.entries(sourceMap)) {
      if (queryLower.includes(keyword)) {
        recommendedSources = [...new Set([...recommendedSources, ...sources])];
      }
    }

    return recommendedSources.length > 0
      ? recommendedSources
      : ["recipe_database", "academic_paper", "food_blog"];
  }

  /**
   * Get knowledge metrics and statistics
   */
  getMetrics(): KnowledgeMetrics {
    const results = Array.from(this.vettingResults.values());

    return {
      totalKnowledgeItems: this.knowledgeLibrary.size,
      approvedItems: results.filter((r) => r.level === "approved").length,
      rejectedItems: results.filter((r) => r.level === "rejected").length,
      quarantinedItems: results.filter((r) => r.level === "quarantined").length,
      averageTrustScore:
        results.reduce((sum, r) => sum + r.score, 0) /
        Math.max(results.length, 1),
      lastCrawlTime: this.getLastJobTime("crawl"),
      lastIntegrationTime: this.getLastJobTime("integration"),
      detectedGaps: this.gapAnalysis?.gaps.length || 0,
      coveredDomains: Array.from(
        new Set(
          Array.from(this.knowledgeLibrary.values()).map((k) => k.source),
        ),
      ).map((s) => s.toString()),
    };
  }

  /**
   * Get gap analysis results
   */
  getGapAnalysis(): GapAnalysis | null {
    return this.gapAnalysis;
  }

  /**
   * Get knowledge library
   */
  getApprovedKnowledge(): CrawledKnowledge[] {
    const approved: CrawledKnowledge[] = [];

    this.knowledgeLibrary.forEach((knowledge) => {
      const vetResult = this.vettingResults.get(knowledge.id);
      if (
        vetResult &&
        (vetResult.level === "approved" ||
          vetResult.level === "approved_with_notes")
      ) {
        approved.push(knowledge);
      }
    });

    return approved;
  }

  /**
   * Get vetting results for knowledge
   */
  getVettingResults(knowledgeId?: string): VettingResult[] {
    if (knowledgeId) {
      const result = this.vettingResults.get(knowledgeId);
      return result ? [result] : [];
    }

    return Array.from(this.vettingResults.values());
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): KnowledgeIntegrationJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs
   */
  getAllJobs(): KnowledgeIntegrationJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Start scheduled knowledge crawl
   */
  private startScheduledCrawl(schedule: {
    interval: number;
    topics: string[];
  }): void {
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
    }

    this.scheduleTimer = setInterval(() => {
      this.crawler.crawlScheduled(schedule.topics);
    }, schedule.interval);
  }

  /**
   * Stop scheduled crawl
   */
  stopScheduledCrawl(): void {
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
      this.scheduleTimer = undefined;
    }
  }

  /**
   * Helper: Create integration job
   */
  private createJob(type: KnowledgeIntegrationJob["type"]): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.jobs.set(jobId, {
      id: jobId,
      status: "pending",
      type,
      createdAt: Date.now(),
      progress: 0,
    });

    return jobId;
  }

  /**
   * Helper: Update job progress
   */
  private updateJobProgress(
    jobId: string,
    progress: number,
    message: string,
  ): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = "in_progress";
      job.startedAt = job.startedAt || Date.now();
      job.progress = progress;
    }
  }

  /**
   * Helper: Complete job
   */
  private completeJob(jobId: string, result: any): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = "completed";
      job.result = result;
      job.completedAt = Date.now();
      job.progress = 1;
    }
  }

  /**
   * Helper: Fail job
   */
  private failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = "failed";
      job.error = error;
      job.completedAt = Date.now();
    }
  }

  /**
   * Helper: Get last job time of specific type
   */
  private getLastJobTime(type: KnowledgeIntegrationJob["type"]): number {
    const jobs = Array.from(this.jobs.values()).filter((j) => j.type === type);
    const lastCompleted = jobs
      .filter((j) => j.status === "completed")
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0];

    return lastCompleted?.completedAt || 0;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopScheduledCrawl();
  }
}

export default KnowledgeManager;
