/**
 * Background Knowledge Crawler Service
 * Continuously crawls and builds knowledge base in development mode
 * Pauses or switches to on-demand in production mode
 */

import KnowledgeManager from "../cognition/knowledgeManager";
import KnowledgeProgressTracker from "./knowledgeProgressTracker";
import type { RecipeCodexMetadata } from "../codex";

export interface BackgroundCrawlerConfig {
  enabled: boolean;
  mode: "learning" | "on_demand";
  crawlIntervalMs: number; // milliseconds between crawls
  batchSize: number;
  topics: string[];
  autoSwitchWhenReady: boolean;
}

/**
 * Background Crawler
 * Runs knowledge crawler in the background during development
 */
export class BackgroundKnowledgeCrawler {
  private manager: KnowledgeManager | null = null;
  private tracker: KnowledgeProgressTracker | null = null;
  private config: BackgroundCrawlerConfig;
  private crawlTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private crawlCount = 0;

  constructor(config: Partial<BackgroundCrawlerConfig> = {}) {
    this.config = {
      enabled: true,
      mode: "learning",
      crawlIntervalMs: 60000, // 1 minute for testing, would be longer in prod
      batchSize: 5,
      topics: [
        "allergen safety",
        "flavor chemistry",
        "pastry techniques",
        "baking science",
        "banquet service",
        "catering logistics",
        "culinary terminology",
        "ingredient sourcing",
        "nutritional data",
        "regional cuisines",
        "molecular gastronomy",
        "preservation techniques",
        "food safety",
        "menu design",
        "cost optimization",
        "sustainable cooking",
      ],
      autoSwitchWhenReady: true,
      ...config,
    };
  }

  /**
   * Initialize the crawler with knowledge base
   */
  initialize(
    recipes: RecipeCodexMetadata[],
    ingredients: Record<string, any>,
  ): void {
    if (this.manager) {
      console.log("⚠️ Crawler already initialized, skipping");
      return;
    }

    // Looser vetting criteria for initial knowledge gathering
    const vetCriteria = {
      minAuthorityScore: 0.3, // Very low threshold for initial gathering
      minSourceTrust: 0.2, // Very low - user recipes are trusted
      requiresCulinaryBrainApproval: false, // Skip brain approval for speed
      allergenValidationRequired: false, // Skip allergen check - recipes may not have this
      flavorBalanceValidation: false, // Skip for now
      ingredientVerification: false, // Skip ingredient verification
      techniqueVerification: false, // Skip for now
    };

    this.manager = new KnowledgeManager({
      enableAutoCrawl: false,
      enableAutoVetting: true,
      enableGapDetection: true,
      vetCriteria,
    });

    this.tracker = new KnowledgeProgressTracker();

    this.manager.registerKnowledgeBase(recipes, ingredients);

    console.log(`✅ Background Knowledge Crawler initialized with:`);
    console.log(`   - ${recipes.length} recipes`);
    console.log(`   - ${Object.keys(ingredients).length} unique ingredients`);
    console.log(`   - Crawl interval: ${this.config.crawlIntervalMs}ms`);
    console.log(`   - Batch size: ${this.config.batchSize}`);

    if (this.config.enabled && this.config.mode === "learning") {
      console.log("🚀 Starting crawler in Learning Mode automatically");
      this.start();
    }
  }

  /**
   * Start the background crawler
   */
  start(): void {
    if (this.isRunning) {
      console.log("⚠️ Crawler already running");
      return;
    }

    if (!this.manager) {
      console.warn(
        "❌ Crawler not initialized - initializing with empty data...",
      );
      // Initialize with empty data so crawler can still function
      this.manager = new KnowledgeManager({
        enableAutoCrawl: false,
        enableAutoVetting: true,
        enableGapDetection: true,
      });
      this.tracker = new KnowledgeProgressTracker();
      this.manager.registerKnowledgeBase([], {});
    }

    this.isRunning = true;
    console.log("🚀 Starting Background Knowledge Crawler (Learning Mode)");

    // First crawl immediately
    this.runCrawlBatch();

    // Then schedule periodic crawls
    this.crawlTimer = setInterval(() => {
      this.runCrawlBatch();
    }, this.config.crawlIntervalMs);
  }

  /**
   * Stop the background crawler
   */
  stop(): void {
    if (!this.isRunning) return;

    if (this.crawlTimer) {
      clearInterval(this.crawlTimer);
      this.crawlTimer = null;
    }

    this.isRunning = false;
    console.log("⏹️ Background Knowledge Crawler stopped");
  }

  /**
   * Run a batch of crawls
   */
  private async runCrawlBatch(): Promise<void> {
    if (!this.manager || !this.tracker) return;

    try {
      const topicsToProcess = this.selectTopicsForBatch();

      console.log(
        `📚 Crawling batch ${this.crawlCount + 1}: ${topicsToProcess.join(", ")}`,
      );

      for (const topic of topicsToProcess) {
        try {
          console.log(`  🔍 Searching for: ${topic}...`);
          const result = await this.manager.expandKnowledge(topic, "scheduled");

          // Detailed logging of vetting results
          const approved = result.vetResult.filter(
            (v) => v.level === "approved" || v.level === "approved_with_notes",
          );
          const rejected = result.vetResult.filter(
            (v) => v.level === "rejected",
          );
          const quarantined = result.vetResult.filter(
            (v) => v.level === "quarantined",
          );

          console.log(
            `    Found ${result.crawlResult.knowledge.length} items, vetting results:`,
          );
          console.log(`      ✅ Approved: ${approved.length}`);
          console.log(`      ⚠️  Quarantined: ${quarantined.length}`);
          console.log(`      ❌ Rejected: ${rejected.length}`);

          // Log details of approved items
          approved.forEach((item) => {
            const vet = result.vetResult.find((v) => v.id === item.id);
            console.log(`        ✓ [${vet?.score.toFixed(2)}] ${item.id}`);
          });

          // Log details of rejected items with reasons
          rejected.slice(0, 3).forEach((item) => {
            const vet = result.vetResult.find((v) => v.id === item.id);
            const issues =
              vet?.issues.map((i) => i.message).join(", ") || "Unknown";
            console.log(
              `        ✗ [${vet?.score.toFixed(2)}] ${item.id}: ${issues}`,
            );
          });

          // Update progress tracker with approved items' metadata
          const metadata: Record<string, any> = {};
          approved.forEach((vetResult) => {
            const title = vetResult.metadata?.title || "";

            let cuisineRegion =
              vetResult.metadata?.cuisine ||
              vetResult.metadata?.cuisineRegion ||
              "";

            if (!cuisineRegion && title) {
              const cuisineKeywords = [
                "chinese",
                "japanese",
                "thai",
                "korean",
                "indian",
                "vietnamese",
                "french",
                "italian",
                "spanish",
                "german",
                "mexican",
                "brazilian",
                "american",
                "middle eastern",
                "african",
                "oceanic",
                "asian",
                "mediterranean",
                "greek",
                "portuguese",
                "indian",
                "fusion",
              ];

              const lowerTitle = title.toLowerCase();
              for (const cuisine of cuisineKeywords) {
                if (lowerTitle.includes(cuisine)) {
                  cuisineRegion = cuisine;
                  break;
                }
              }
            }

            metadata[vetResult.id] = {
              ...vetResult.metadata,
              category: vetResult.metadata?.category || "general",
              type: vetResult.metadata?.type || "general",
              cuisineRegion: cuisineRegion || "american",
              title: title,
            };
          });

          try {
            console.log(`  📊 Metadata for ${topic}:`, {
              metadataCount: Object.keys(metadata).length,
              sampleMetadata: Object.values(metadata).slice(0, 2),
            });
            this.tracker.updateWithCrawlResults(
              approved.length,
              rejected.length,
              quarantined.length,
              metadata,
            );
          } catch (trackerError) {
            console.error(
              `  ❌ Failed to update progress tracker:`,
              trackerError,
            );
          }

          console.log(
            `  ✅ ${topic}: ${approved.length} approved, ${result.crawlResult.failureCount} failures`,
          );
        } catch (error) {
          console.error(`  ❌ Failed to crawl "${topic}":`, error);
        }
      }

      this.crawlCount++;

      // Check if should switch modes
      if (this.config.autoSwitchWhenReady) {
        const progress = this.tracker.getProgressState();
        if (progress.mode === "on_demand") {
          console.log(
            "✨ Auto-switched to On-Demand Mode - Knowledge base is substantial!",
          );
          this.config.mode = "on_demand";
          this.stop();
        }
      }

      // Log progress
      const progress = this.tracker.getSummary();
      console.log(`📊 Progress: ${progress.progress}`);
      if (progress.nextThreshold) {
        console.log(`   Next threshold: ${progress.nextThreshold}`);
      }
    } catch (error) {
      console.error("❌ Crawler batch failed:", error);
    }
  }

  /**
   * Select topics for this batch
   */
  private selectTopicsForBatch(): string[] {
    const start =
      (this.crawlCount * this.config.batchSize) % this.config.topics.length;
    const selected = [];

    for (let i = 0; i < this.config.batchSize; i++) {
      const index = (start + i) % this.config.topics.length;
      selected.push(this.config.topics[index]);
    }

    return selected;
  }

  /**
   * Manually trigger a crawl
   */
  async crawlTopic(topic: string): Promise<void> {
    if (!this.manager) {
      throw new Error("Crawler not initialized");
    }

    const result = await this.manager.expandKnowledge(topic, "manual");
    console.log(
      `✅ Manual crawl: ${topic} - ${result.newlyApprovedKnowledge.length} items`,
    );
  }

  /**
   * Get current progress
   */
  getProgress() {
    if (!this.tracker) {
      return null;
    }

    return this.tracker.getProgressState();
  }

  /**
   * Get progress summary
   */
  getProgressSummary() {
    if (!this.tracker) {
      return null;
    }

    return this.tracker.getSummary();
  }

  /**
   * Switch mode
   */
  setMode(mode: "learning" | "on_demand"): void {
    this.config.mode = mode;

    if (this.tracker) {
      this.tracker.setMode(mode);
    }

    if (mode === "learning" && !this.isRunning) {
      this.start();
    } else if (mode === "on_demand" && this.isRunning) {
      this.stop();
    }

    console.log(`🔄 Switched to ${mode} mode`);
  }

  /**
   * Get crawler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      mode: this.config.mode,
      crawlCount: this.crawlCount,
      isInitialized: !!this.manager,
      intervalMs: this.config.crawlIntervalMs,
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop();
    if (this.manager) {
      this.manager.destroy();
      this.manager = null;
    }
  }
}

// Global instance for app-wide access
let globalCrawler: BackgroundKnowledgeCrawler | null = null;

/**
 * Get or create the global crawler instance
 */
export function getBackgroundCrawler(): BackgroundKnowledgeCrawler {
  if (!globalCrawler) {
    globalCrawler = new BackgroundKnowledgeCrawler({
      enabled: false,
      mode: "on_demand",
      crawlIntervalMs: 60000,
      batchSize: 8,
      autoSwitchWhenReady: true,
    });
  }

  return globalCrawler;
}

/**
 * Initialize the global crawler
 */
export function initializeBackgroundCrawler(
  recipes: RecipeCodexMetadata[],
  ingredients: Record<string, any>,
): void {
  const crawler = getBackgroundCrawler();
  crawler.initialize(recipes, ingredients);
}

export default BackgroundKnowledgeCrawler;
