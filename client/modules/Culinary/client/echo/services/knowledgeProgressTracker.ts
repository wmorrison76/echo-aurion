/**
 * EchoAi³ Knowledge Progress Tracker
 * Monitors knowledge base growth and tracks progress across domains
 * OPTIMIZED: Index-based lookups, single-pass processing, pre-normalized strings
 */

export type CulinaryType =
  | "general"
  | "pastry"
  | "baking"
  | "banquet"
  | "catering";

export type Region =
  | "chinese"
  | "japanese"
  | "thai"
  | "korean"
  | "indian"
  | "vietnamese"
  | "french"
  | "italian"
  | "spanish"
  | "german"
  | "mexican"
  | "brazilian"
  | "american"
  | "middle_eastern"
  | "african"
  | "oceanic";

export interface CulinaryTypeMetrics {
  type: CulinaryType;
  label: string;
  coverage: number; // 0-100
  itemsApproved: number;
  checkpoints: {
    allergens: boolean;
    nutrition: boolean;
    techniques: boolean;
    flavorBalance: boolean;
    substitutions: boolean;
  };
}

export interface RegionalMetrics {
  region: Region;
  label: string;
  coverage: number; // 0-100
  recipesCount: number;
  cuisinesRepresented: string[];
}

export interface KnowledgeProgressState {
  mode: "learning" | "on_demand";
  totalApprovedItems: number;
  totalRejectedItems: number;
  totalQuarantinedItems: number;
  overallCoverage: number; // 0-100
  culinaryMetrics: CulinaryTypeMetrics[];
  regionalMetrics: RegionalMetrics[];
  lastUpdated: number;
  modeAutoSwitchThresholds: {
    coveragePercentage: number; // e.g., 75
    minApprovedItems: number; // e.g., 10000
  };
  didAutoSwitch: boolean;
  autoSwitchTime?: number;
}

// Pre-computed cuisine mappings for O(1) lookups (replaces string includes searches)
const REGION_CUISINE_ALIASES: Record<Region, Set<string>> = {
  chinese: new Set(["chinese", "cantonese", "sichuan", "hunan"]),
  japanese: new Set(["japanese", "sushi", "ramen", "tempura"]),
  thai: new Set(["thai", "pad thai", "tom yum"]),
  korean: new Set(["korean", "korean bbq", "kimchi"]),
  indian: new Set(["indian", "curry", "tandoori", "naan"]),
  vietnamese: new Set(["vietnamese", "pho", "banh mi"]),
  french: new Set(["french", "haute cuisine", "french bistro", "provence"]),
  italian: new Set(["italian", "pasta", "risotto", "gelato"]),
  spanish: new Set(["spanish", "tapas", "paella"]),
  german: new Set(["german", "sausage", "pretzel"]),
  mexican: new Set(["mexican", "tacos", "mole", "enchiladas"]),
  brazilian: new Set(["brazilian", "churrasco", "feijoada"]),
  american: new Set(["american", "bbq", "burgers", "southern"]),
  middle_eastern: new Set(["middle eastern", "lebanese", "israeli", "persian"]),
  african: new Set(["african", "ethiopian", "moroccan", "west african"]),
  oceanic: new Set(["oceanic", "australian", "polynesian", "hawaiian"]),
};

/**
 * Knowledge Progress Tracker
 * Monitors and tracks knowledge base growth
 */
export class KnowledgeProgressTracker {
  private state: KnowledgeProgressState;
  private localStorageKey = "echo_knowledge_progress";
  // Cache pre-normalized metadata for single-pass processing
  private normalizedMetadataCache: Array<{
    original: any;
    cuisineLower: string;
    titleLower: string;
    categoryLower: string;
  }> = [];

  constructor() {
    this.state = this.loadState() || this.getDefaultState();
  }

  /**
   * Update progress with crawler results
   * OPTIMIZED: Single-pass processing with pre-normalized strings
   */
  updateWithCrawlResults(
    approvedCount: number,
    rejectedCount: number,
    quarantinedCount: number,
    metadataByCategory: Record<string, any>,
  ): KnowledgeProgressState {
    this.state.totalApprovedItems += approvedCount;
    this.state.totalRejectedItems += rejectedCount;
    this.state.totalQuarantinedItems += quarantinedCount;

    // Pre-normalize metadata once for all calculations
    this.normalizeMetadata(metadataByCategory);

    // Single-pass update for both culinary and regional metrics
    this.updateMetricsInSinglePass();

    // Calculate overall coverage
    this.state.overallCoverage = this.calculateOverallCoverage();

    // Check for auto-switch to on-demand mode
    this.checkAutoSwitch();

    // Save state
    this.saveState();

    return this.state;
  }

  /**
   * Pre-normalize metadata strings once to avoid repeated .toLowerCase() calls
   * Time complexity: O(n) where n is metadata items
   */
  private normalizeMetadata(metadata: Record<string, any>): void {
    const metadataValues = Object.values(metadata).filter(
      (m) => m && typeof m === "object",
    );

    this.normalizedMetadataCache = metadataValues.map((m: any) => ({
      original: m,
      cuisineLower: (m.cuisineRegion || m.cuisine || "").toLowerCase(),
      titleLower: (m.title || "").toLowerCase(),
      categoryLower: (m.category || m.type || "").toLowerCase(),
    }));
  }

  /**
   * Update both culinary and regional metrics in single pass
   * OPTIMIZED: O(n) instead of O(35n)
   * Time complexity: O(n * (5 + 16)) = O(21n) but with optimized comparisons
   */
  private updateMetricsInSinglePass(): void {
    // Reset metrics to recalculate
    const culinaryAccumulators: Record<
      CulinaryType,
      {
        count: number;
        hasAllergens: boolean;
        hasNutrition: boolean;
        hasTechniques: boolean;
        hasFlavorBalance: boolean;
        hasSubstitutions: boolean;
      }
    > = {
      general: {
        count: 0,
        hasAllergens: false,
        hasNutrition: false,
        hasTechniques: false,
        hasFlavorBalance: false,
        hasSubstitutions: false,
      },
      pastry: {
        count: 0,
        hasAllergens: false,
        hasNutrition: false,
        hasTechniques: false,
        hasFlavorBalance: false,
        hasSubstitutions: false,
      },
      baking: {
        count: 0,
        hasAllergens: false,
        hasNutrition: false,
        hasTechniques: false,
        hasFlavorBalance: false,
        hasSubstitutions: false,
      },
      banquet: {
        count: 0,
        hasAllergens: false,
        hasNutrition: false,
        hasTechniques: false,
        hasFlavorBalance: false,
        hasSubstitutions: false,
      },
      catering: {
        count: 0,
        hasAllergens: false,
        hasNutrition: false,
        hasTechniques: false,
        hasFlavorBalance: false,
        hasSubstitutions: false,
      },
    };

    const regionalAccumulators: Record<Region, number> = {
      chinese: 0,
      japanese: 0,
      thai: 0,
      korean: 0,
      indian: 0,
      vietnamese: 0,
      french: 0,
      italian: 0,
      spanish: 0,
      german: 0,
      mexican: 0,
      brazilian: 0,
      american: 0,
      middle_eastern: 0,
      african: 0,
      oceanic: 0,
    };

    // Single pass through all normalized metadata
    for (const normalized of this.normalizedMetadataCache) {
      const { original, cuisineLower, categoryLower } = normalized;

      // CULINARY TYPE MATCHING (single pass for all 5 types)
      const types: CulinaryType[] = [
        "general",
        "pastry",
        "baking",
        "banquet",
        "catering",
      ];
      for (const type of types) {
        if (categoryLower.includes(type) || cuisineLower.includes(type)) {
          const acc = culinaryAccumulators[type];
          acc.count++;
          if (
            Array.isArray(original.allergens) &&
            original.allergens.length > 0
          ) {
            acc.hasAllergens = true;
          }
          if (original.nutrition) {
            acc.hasNutrition = true;
          }
          if (
            Array.isArray(original.technique) &&
            original.technique.length > 0
          ) {
            acc.hasTechniques = true;
          }
          if (original.flavorBalance) {
            acc.hasFlavorBalance = true;
          }
          if (original.substitutions) {
            acc.hasSubstitutions = true;
          }
        }
      }

      // REGIONAL MATCHING (optimized with Set lookups)
      const regionKeys = Object.keys(REGION_CUISINE_ALIASES) as Region[];
      for (const region of regionKeys) {
        const cuisineSet = REGION_CUISINE_ALIASES[region];
        if (
          cuisineSet.has(cuisineLower) ||
          Array.from(cuisineSet).some((c) => normalized.titleLower.includes(c))
        ) {
          regionalAccumulators[region]++;
        }
      }
    }

    // Update culinary metrics from accumulators
    this.state.culinaryMetrics.forEach((metric) => {
      const acc = culinaryAccumulators[metric.type];
      metric.itemsApproved = acc.count;
      metric.coverage =
        Math.min(100, acc.count * 5) +
        Object.values(acc).filter((v) => v === true).length * 10;
      metric.checkpoints = {
        allergens: acc.hasAllergens,
        nutrition: acc.hasNutrition,
        techniques: acc.hasTechniques,
        flavorBalance: acc.hasFlavorBalance,
        substitutions: acc.hasSubstitutions,
      };
    });

    // Update regional metrics from accumulators
    this.state.regionalMetrics.forEach((metric) => {
      const count = regionalAccumulators[metric.region];
      metric.recipesCount = count;
      metric.coverage = Math.min(100, (count / 100) * 100);
      metric.cuisinesRepresented = Array.from(
        REGION_CUISINE_ALIASES[metric.region],
      ).filter((c) =>
        this.normalizedMetadataCache.some((n) => n.cuisineLower.includes(c)),
      );
    });
  }

  /**
   * Calculate overall coverage percentage
   */
  private calculateOverallCoverage(): number {
    const allMetrics = [
      ...this.state.culinaryMetrics,
      ...this.state.regionalMetrics,
    ];

    if (allMetrics.length === 0) return 0;

    const avgCoverage =
      allMetrics.reduce((sum, m) => sum + m.coverage, 0) / allMetrics.length;
    return Math.min(100, Math.round(avgCoverage));
  }

  /**
   * Check if should auto-switch to on-demand mode
   */
  private checkAutoSwitch(): void {
    const {
      totalApprovedItems,
      overallCoverage,
      modeAutoSwitchThresholds,
      mode,
    } = this.state;

    if (mode === "learning") {
      const coverageReached =
        overallCoverage >= modeAutoSwitchThresholds.coveragePercentage;
      const itemsReached =
        totalApprovedItems >= modeAutoSwitchThresholds.minApprovedItems;

      if (coverageReached && itemsReached) {
        this.state.mode = "on_demand";
        this.state.didAutoSwitch = true;
        this.state.autoSwitchTime = Date.now();
      }
    }
  }

  /**
   * Get current progress state
   */
  getProgressState(): KnowledgeProgressState {
    return { ...this.state };
  }

  /**
   * Get progress for specific culinary type
   */
  getCulinaryProgress(type: CulinaryType): CulinaryTypeMetrics | undefined {
    return this.state.culinaryMetrics.find((m) => m.type === type);
  }

  /**
   * Get progress for specific region
   */
  getRegionalProgress(region: Region): RegionalMetrics | undefined {
    return this.state.regionalMetrics.find((m) => m.region === region);
  }

  /**
   * Get mode status
   */
  getMode(): "learning" | "on_demand" {
    return this.state.mode;
  }

  /**
   * Manually switch mode
   */
  setMode(mode: "learning" | "on_demand"): void {
    this.state.mode = mode;
    this.saveState();
  }

  /**
   * Reset progress (for testing)
   */
  reset(): void {
    this.state = this.getDefaultState();
    this.saveState();
  }

  /**
   * Get summary for display
   */
  getSummary(): {
    mode: string;
    coverage: number;
    approved: number;
    progress: string;
    nextThreshold?: string;
  } {
    const coverageToGo = Math.max(
      0,
      this.state.modeAutoSwitchThresholds.coveragePercentage -
        this.state.overallCoverage,
    );
    const itemsToGo = Math.max(
      0,
      this.state.modeAutoSwitchThresholds.minApprovedItems -
        this.state.totalApprovedItems,
    );

    return {
      mode:
        this.state.mode === "learning"
          ? "🚀 Learning Mode"
          : "⚡ On-Demand Mode",
      coverage: this.state.overallCoverage,
      approved: this.state.totalApprovedItems,
      progress: `${this.state.overallCoverage}% coverage, ${this.state.totalApprovedItems.toLocaleString()} items approved`,
      nextThreshold:
        this.state.mode === "learning"
          ? `${coverageToGo.toFixed(0)}% coverage or ${itemsToGo.toLocaleString()} items to auto-switch`
          : undefined,
    };
  }

  /**
   * Helper: Get default state
   */
  private getDefaultState(): KnowledgeProgressState {
    return {
      mode: "learning",
      totalApprovedItems: 0,
      totalRejectedItems: 0,
      totalQuarantinedItems: 0,
      overallCoverage: 0,
      culinaryMetrics: [
        {
          type: "general",
          label: "General Culinary",
          coverage: 0,
          itemsApproved: 0,
          checkpoints: {
            allergens: false,
            nutrition: false,
            techniques: false,
            flavorBalance: false,
            substitutions: false,
          },
        },
        {
          type: "pastry",
          label: "Pastry & Desserts",
          coverage: 0,
          itemsApproved: 0,
          checkpoints: {
            allergens: false,
            nutrition: false,
            techniques: false,
            flavorBalance: false,
            substitutions: false,
          },
        },
        {
          type: "baking",
          label: "Baking & Bread",
          coverage: 0,
          itemsApproved: 0,
          checkpoints: {
            allergens: false,
            nutrition: false,
            techniques: false,
            flavorBalance: false,
            substitutions: false,
          },
        },
        {
          type: "banquet",
          label: "Banquet & Plated",
          coverage: 0,
          itemsApproved: 0,
          checkpoints: {
            allergens: false,
            nutrition: false,
            techniques: false,
            flavorBalance: false,
            substitutions: false,
          },
        },
        {
          type: "catering",
          label: "Catering & Service",
          coverage: 0,
          itemsApproved: 0,
          checkpoints: {
            allergens: false,
            nutrition: false,
            techniques: false,
            flavorBalance: false,
            substitutions: false,
          },
        },
      ],
      regionalMetrics: [
        {
          region: "chinese",
          label: "🇨🇳 Chinese",
          coverage: 0,
          recipesCount: 0,
          cuisinesRepresented: [],
        },
        {
          region: "japanese",
          label: "🇯🇵 Japanese",
          coverage: 0,
          recipesCount: 0,
          cuisinesRepresented: [],
        },
        {
          region: "thai",
          label: "🇹🇭 Thai",
          coverage: 0,
          recipesCount: 0,
          cuisinesRepresented: [],
        },
        {
          region: "korean",
          label: "🇰🇷 Korean",
          coverage: 0,
          recipesCount: 0,
          cuisinesRepresented: [],
        },
        {
          region: "indian",
          label: "🇮🇳 Indian",
          coverage: 0,
          recipesCount: 0,
          cuisinesRepresented: [],
        },
        {
          region: "vietnamese",
          label: "🇻🇳 Vietnamese",
          coverage: 0,
          recipesCount: 0,
          cuisinesRepresented: [],
        },
        {
          region: "french",
          label: "🇫🇷 French",
          coverage: 0,
          recipesCount: 0,
          cuisinesRepresented: [],
        },
        {
          region: "italian",
          label: "🇮🇹 Italian",
          coverage: 0,
          recipesCount: 0,
          cuisinesRepresented: [],
        },
        {
          region: "spanish",
          label: "🇪🇸 Spanish",
          coverage: 0,
          recipesCount: 0,
          cuisinesRepresented: [],
        },
        {
          region: "german",
          label: "🇩🇪 German",
          coverage: 0,
          recipesCount: 0,
          cuisinesRepresented: [],
        },
        {
          region: "mexican",
          label: "🇲🇽 Mexican",
          coverage: 0,
          recipesCount: 0,
          cuisinesRepresented: [],
        },
        {
          region: "brazilian",
          label: "🇧🇷 Brazilian",
          coverage: 0,
          recipesCount: 0,
          cuisinesRepresented: [],
        },
        {
          region: "american",
          label: "🇺🇸 American",
          coverage: 0,
          recipesCount: 0,
          cuisinesRepresented: [],
        },
        {
          region: "middle_eastern",
          label: "🌍 Middle Eastern",
          coverage: 0,
          recipesCount: 0,
          cuisinesRepresented: [],
        },
        {
          region: "african",
          label: "🌍 African",
          coverage: 0,
          recipesCount: 0,
          cuisinesRepresented: [],
        },
        {
          region: "oceanic",
          label: "🌏 Oceanic",
          coverage: 0,
          recipesCount: 0,
          cuisinesRepresented: [],
        },
      ],
      lastUpdated: Date.now(),
      modeAutoSwitchThresholds: {
        coveragePercentage: 75,
        minApprovedItems: 10000,
      },
      didAutoSwitch: false,
    };
  }

  /**
   * Helper: Save state to localStorage
   */
  private saveState(): void {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(this.state));
    } catch (error) {
      console.warn("Failed to save knowledge progress state:", error);
    }
  }

  /**
   * Helper: Load state from localStorage
   */
  private loadState(): KnowledgeProgressState | null {
    try {
      const saved = localStorage.getItem(this.localStorageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn("Failed to load knowledge progress state:", error);
      return null;
    }
  }
}

export default KnowledgeProgressTracker;
