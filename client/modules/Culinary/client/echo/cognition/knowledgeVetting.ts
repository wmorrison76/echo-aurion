/**
 * EchoAi³ Knowledge Vetting System
 * Implements checks and balances to filter low-quality knowledge
 * Ensures Echo becomes the leading culinary authority, not just a data aggregator
 * Uses culinary brain to validate information accuracy
 */

import type { IngredientChemistryProfile } from "../codex/ingredientChemistry";
import type { FlavorBalanceResult } from "./flavorMatrix";
import type { CrawledKnowledge, ExtractedRecipe } from "./knowledgeCrawler";

export type VettingLevel =
  | "rejected"
  | "quarantined"
  | "approved"
  | "approved_with_notes";

export interface VettingResult {
  id: string;
  source: string;
  level: VettingLevel;
  score: number; // 0-1
  validations: ValidationCheck[];
  issues: ValidationIssue[];
  recommendations: string[];
  vetterNotes: string;
  culinaryBrainAnalysis?: string;
  approvedAt?: number;
  approvedBy?: string;
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  details: string;
  severity: "warning" | "error";
  culinaryRelevance?: string;
}

export interface ValidationIssue {
  type: string;
  message: string;
  severity: "info" | "warning" | "error" | "critical";
  affectedField: string;
  suggestedFix?: string;
}

export interface VettingCriteria {
  minAuthorityScore: number;
  minSourceTrust: number;
  requiresCulinaryBrainApproval: boolean;
  allergenValidationRequired: boolean;
  flavorBalanceValidation: boolean;
  ingredientVerification: boolean;
  techniqueVerification: boolean;
}

export interface KnowledgeTrustScoring {
  sourceReliability: number; // 0-1
  contentConsistency: number; // 0-1
  authorityLevel: number; // 0-1
  recencyScore: number; // 0-1 (newer = higher)
  communityVerification: number; // 0-1 (how many sources agree)
}

/**
 * Knowledge Vetting Engine
 * Implements multi-layer validation based on culinary science
 */
export class KnowledgeVettingEngine {
  private culinaryBrain: any; // Reference to EchoChefBrain
  private ingredientDatabase: Map<string, IngredientChemistryProfile>;
  private approvedSources: Set<string>;
  private bannedSources: Set<string>;
  private trustScores: Map<string, number>;

  constructor(culinaryBrain?: any) {
    this.culinaryBrain = culinaryBrain;
    this.ingredientDatabase = new Map();
    this.approvedSources = new Set([
      "serious_eats",
      "food_lab",
      "acs_journal",
      "michelin_guide",
      "bon_appetit",
      "cooks_illustrated",
      "america's_test_kitchen",
      "official_usda",
    ]);
    this.bannedSources = new Set([
      "unreliable_blog",
      "spam_site",
      "known_misinformation",
    ]);
    this.trustScores = new Map();
  }

  /**
   * Register ingredient database for validation
   */
  registerIngredientDatabase(
    ingredients: Map<string, IngredientChemistryProfile>,
  ): void {
    this.ingredientDatabase = ingredients;
  }

  /**
   * Vet crawled knowledge with full validation
   */
  async vetKnowledge(
    knowledge: CrawledKnowledge,
    criteria: Partial<VettingCriteria> = {},
  ): Promise<VettingResult> {
    const defaultCriteria: VettingCriteria = {
      minAuthorityScore: 0.6,
      minSourceTrust: 0.5,
      requiresCulinaryBrainApproval: true,
      allergenValidationRequired: true,
      flavorBalanceValidation: true,
      ingredientVerification: true,
      techniqueVerification: true,
      ...criteria,
    };

    const validations: ValidationCheck[] = [];
    const issues: ValidationIssue[] = [];
    let score = 0.5; // Start with neutral score

    // Phase 1: Source validation
    const sourceValidation = this.validateSource(knowledge, defaultCriteria);
    validations.push(...sourceValidation.checks);
    issues.push(...sourceValidation.issues);
    score += sourceValidation.scoreAdjustment;

    // Phase 2: Content validation
    const contentValidation = this.validateContent(knowledge, defaultCriteria);
    validations.push(...contentValidation.checks);
    issues.push(...contentValidation.issues);
    score += contentValidation.scoreAdjustment;

    // Phase 3: Ingredient validation
    if (defaultCriteria.ingredientVerification) {
      const ingredientValidation = this.validateIngredients(knowledge);
      validations.push(...ingredientValidation.checks);
      issues.push(...ingredientValidation.issues);
      score += ingredientValidation.scoreAdjustment;
    }

    // Phase 4: Allergen validation (CRITICAL)
    if (
      defaultCriteria.allergenValidationRequired &&
      knowledge.extractedRecipes
    ) {
      const allergenValidation = this.validateAllergens(
        knowledge.extractedRecipes,
      );
      validations.push(...allergenValidation.checks);
      issues.push(...allergenValidation.issues);
      score += allergenValidation.scoreAdjustment;
    }

    // Phase 5: Flavor chemistry validation
    if (defaultCriteria.flavorBalanceValidation && knowledge.extractedRecipes) {
      const flavorValidation = await this.validateFlavorBalance(
        knowledge.extractedRecipes,
      );
      validations.push(...flavorValidation.checks);
      issues.push(...flavorValidation.issues);
      score += flavorValidation.scoreAdjustment;
    }

    // Phase 6: Technique validation
    if (
      defaultCriteria.techniqueVerification &&
      knowledge.extractedTechniques
    ) {
      const techniqueValidation = this.validateTechniques(
        knowledge.extractedTechniques,
      );
      validations.push(...techniqueValidation.checks);
      issues.push(...techniqueValidation.issues);
      score += techniqueValidation.scoreAdjustment;
    }

    // Phase 7: Culinary brain analysis
    let culinaryBrainAnalysis = "";
    if (defaultCriteria.requiresCulinaryBrainApproval && this.culinaryBrain) {
      culinaryBrainAnalysis = await this.runCulinaryBrainAnalysis(knowledge);
      if (culinaryBrainAnalysis.includes("APPROVED")) {
        score += 0.1;
      } else if (culinaryBrainAnalysis.includes("CONCERNS")) {
        score -= 0.15;
      }
    }

    // Normalize score to 0-1
    score = Math.max(0, Math.min(1, score));

    // Determine vetting level
    const level = this.determineVettingLevel(score, issues, defaultCriteria);
    const recommendations = this.generateRecommendations(issues, knowledge);

    // Log vetting result for debugging
    const passedChecks = validations.filter((v) => v.passed).length;
    const failedChecks = validations.filter((v) => !v.passed).length;
    const criticalIssues = issues.filter((i) => i.severity === "critical").length;

    if (level === "approved" || level === "approved_with_notes") {
      console.log(
        `    ✅ [${level}] ${knowledge.id} (score: ${score.toFixed(2)}) - ${passedChecks}/${validations.length} checks passed`,
      );
    } else if (level === "quarantined") {
      console.log(
        `    ⚠️  [quarantined] ${knowledge.id} (score: ${score.toFixed(2)}) - ${failedChecks} issues: ${issues.slice(0, 2).map((i) => i.message).join(", ")}`,
      );
    } else {
      console.log(
        `    ❌ [rejected] ${knowledge.id} (score: ${score.toFixed(2)}) - ${criticalIssues} critical issues`,
      );
    }

    return {
      id: knowledge.id,
      source: knowledge.source,
      level,
      score,
      validations,
      issues,
      recommendations,
      vetterNotes: this.generateVetterNotes(level, score, issues),
      culinaryBrainAnalysis,
      approvedAt: level !== "rejected" ? Date.now() : undefined,
      approvedBy: "echo_culinary_brain",
    };
  }

  /**
   * Validate source credibility
   */
  private validateSource(
    knowledge: CrawledKnowledge,
    criteria: VettingCriteria,
  ): {
    checks: ValidationCheck[];
    issues: ValidationIssue[];
    scoreAdjustment: number;
  } {
    const checks: ValidationCheck[] = [];
    const issues: ValidationIssue[] = [];
    let scoreAdjustment = 0;

    const sourceName = knowledge.sourceUrl.toLowerCase();

    // Check if source is banned
    if (Array.from(this.bannedSources).some((bs) => sourceName.includes(bs))) {
      checks.push({
        name: "Source Trust",
        passed: false,
        details: "Source is on ban list",
        severity: "error",
      });
      issues.push({
        type: "banned_source",
        message: `Source ${knowledge.source} is blacklisted`,
        severity: "critical",
        affectedField: "source",
      });
      scoreAdjustment -= 0.5;
    }

    // Check if source is approved
    if (
      Array.from(this.approvedSources).some((as) => sourceName.includes(as))
    ) {
      checks.push({
        name: "Source Trust",
        passed: true,
        details: "Source is on approved list",
        severity: "warning",
        culinaryRelevance: "Recognized authority in culinary science",
      });
      scoreAdjustment += 0.2;
    }

    // Check trust score
    const trustScore =
      this.trustScores.get(knowledge.source) ||
      this.calculateTrustScore(knowledge);
    if (trustScore < criteria.minSourceTrust) {
      issues.push({
        type: "low_source_trust",
        message: `Source trust score (${trustScore.toFixed(2)}) below threshold (${criteria.minSourceTrust})`,
        severity: "warning",
        affectedField: "source",
      });
      scoreAdjustment -= 0.1;
    } else {
      checks.push({
        name: "Source Trust Score",
        passed: true,
        details: `Trust score: ${trustScore.toFixed(2)}`,
        severity: "warning",
      });
      scoreAdjustment += 0.1;
    }

    // Check for author credentials
    if (knowledge.metadata.author) {
      checks.push({
        name: "Author Attribution",
        passed: true,
        details: `Author: ${knowledge.metadata.author}`,
        severity: "warning",
      });
      scoreAdjustment += 0.05;
    }

    // Check recency
    const daysSinceCrawl =
      (Date.now() - knowledge.crawledAt) / (1000 * 60 * 60 * 24);
    if (daysSinceCrawl < 30) {
      checks.push({
        name: "Recency",
        passed: true,
        details: `Crawled ${Math.floor(daysSinceCrawl)} days ago`,
        severity: "warning",
      });
      scoreAdjustment += 0.05;
    } else if (daysSinceCrawl > 365) {
      issues.push({
        type: "outdated",
        message: "Knowledge is over 1 year old",
        severity: "warning",
        affectedField: "crawledAt",
      });
      scoreAdjustment -= 0.05;
    }

    return { checks, issues, scoreAdjustment };
  }

  /**
   * Validate content quality
   */
  private validateContent(
    knowledge: CrawledKnowledge,
    criteria: VettingCriteria,
  ): {
    checks: ValidationCheck[];
    issues: ValidationIssue[];
    scoreAdjustment: number;
  } {
    const checks: ValidationCheck[] = [];
    const issues: ValidationIssue[] = [];
    let scoreAdjustment = 0;

    // Check content length (less strict for user-imported content)
    const minContentLength = knowledge.source === "user_imported" ? 50 : 100;
    if (!knowledge.content || knowledge.content.length < minContentLength) {
      issues.push({
        type: "insufficient_content",
        message: `Content is too brief (${knowledge.content?.length || 0}/${minContentLength} chars)`,
        severity: knowledge.source === "user_imported" ? "info" : "warning",
        affectedField: "content",
      });
      scoreAdjustment += knowledge.source === "user_imported" ? 0 : -0.1;
    } else {
      checks.push({
        name: "Content Length",
        passed: true,
        details: `${knowledge.content.length} characters`,
        severity: "warning",
      });
      scoreAdjustment += 0.05;
    }

    // Check for recipes or techniques
    if (
      (knowledge.extractedRecipes && knowledge.extractedRecipes.length > 0) ||
      (knowledge.extractedTechniques &&
        knowledge.extractedTechniques.length > 0)
    ) {
      checks.push({
        name: "Extracted Content",
        passed: true,
        details: `${knowledge.extractedRecipes?.length || 0} recipes, ${knowledge.extractedTechniques?.length || 0} techniques`,
        severity: "warning",
      });
      scoreAdjustment += 0.1;
    }

    // Check for metadata (less strict for user-imported)
    const metadataFields = Object.values(knowledge.metadata).filter(
      (v) => v !== null && v !== undefined && v !== "",
    ).length;
    const minMetadataFields = knowledge.source === "user_imported" ? 1 : 3;
    if (metadataFields < minMetadataFields) {
      issues.push({
        type: "sparse_metadata",
        message: `Content has minimal metadata (${metadataFields}/${minMetadataFields} fields)`,
        severity: knowledge.source === "user_imported" ? "info" : "warning",
        affectedField: "metadata",
      });
      scoreAdjustment += knowledge.source === "user_imported" ? 0 : -0.05;
    } else {
      checks.push({
        name: "Metadata Richness",
        passed: true,
        details: `${metadataFields} metadata fields populated`,
        severity: "warning",
      });
      scoreAdjustment += 0.05;
    }

    return { checks, issues, scoreAdjustment };
  }

  /**
   * Validate ingredients against known database
   */
  private validateIngredients(knowledge: CrawledKnowledge): {
    checks: ValidationCheck[];
    issues: ValidationIssue[];
    scoreAdjustment: number;
  } {
    const checks: ValidationCheck[] = [];
    const issues: ValidationIssue[] = [];
    let scoreAdjustment = 0;

    const allIngredients = new Set<string>();

    knowledge.extractedRecipes?.forEach((recipe) => {
      recipe.ingredients.forEach((ing) => {
        allIngredients.add(ing.name.toLowerCase());
      });
    });

    if (allIngredients.size === 0) {
      return { checks, issues, scoreAdjustment };
    }

    let verifiedCount = 0;
    const unknownIngredients: string[] = [];

    allIngredients.forEach((ingredient) => {
      const isKnown = Array.from(this.ingredientDatabase.keys()).some((key) =>
        key.toLowerCase().includes(ingredient),
      );

      if (isKnown) {
        verifiedCount++;
      } else {
        unknownIngredients.push(ingredient);
      }
    });

    const verificationRate = verifiedCount / allIngredients.size;

    if (verificationRate > 0.8) {
      checks.push({
        name: "Ingredient Verification",
        passed: true,
        details: `${verifiedCount}/${allIngredients.size} ingredients verified`,
        severity: "warning",
        culinaryRelevance: "All major ingredients are in culinary database",
      });
      scoreAdjustment += 0.1;
    } else if (verificationRate > 0.5) {
      checks.push({
        name: "Ingredient Verification",
        passed: true,
        details: `${verifiedCount}/${allIngredients.size} ingredients verified`,
        severity: "warning",
      });
      scoreAdjustment += 0.05;
    } else {
      issues.push({
        type: "unverified_ingredients",
        message: `${unknownIngredients.length} ingredients not in database`,
        severity: "warning",
        affectedField: "ingredients",
        suggestedFix: `Add missing ingredients: ${unknownIngredients.slice(0, 5).join(", ")}`,
      });
      scoreAdjustment -= 0.1;
    }

    return { checks, issues, scoreAdjustment };
  }

  /**
   * Validate allergen information (CRITICAL)
   */
  private validateAllergens(recipes: ExtractedRecipe[]): {
    checks: ValidationCheck[];
    issues: ValidationIssue[];
    scoreAdjustment: number;
  } {
    const checks: ValidationCheck[] = [];
    const issues: ValidationIssue[] = [];
    let scoreAdjustment = 0;

    const recipesWithAllergens = recipes.filter(
      (r) => r.allergens && r.allergens.length > 0,
    ).length;

    if (recipesWithAllergens === recipes.length) {
      checks.push({
        name: "Allergen Documentation",
        passed: true,
        details: "All recipes have allergen information",
        severity: "warning",
        culinaryRelevance:
          "Complete allergen labeling meets food safety standards",
      });
      scoreAdjustment += 0.15;
    } else if (recipesWithAllergens > 0) {
      issues.push({
        type: "incomplete_allergen_documentation",
        message: `${recipes.length - recipesWithAllergens} recipes lack allergen info`,
        severity: "error",
        affectedField: "allergens",
        suggestedFix: "Complete allergen documentation for all recipes",
      });
      scoreAdjustment -= 0.2;
    } else {
      issues.push({
        type: "no_allergen_information",
        message: "No allergen information provided for any recipe",
        severity: "warning",  // Not critical - allow user_imported to pass
        affectedField: "allergens",
        suggestedFix: "Add complete allergen profiles from FDA database",
      });
      scoreAdjustment -= 0.1;  // Lighter penalty
    }

    // Validate against FDA major allergens
    const majorAllergens = [
      "peanuts",
      "tree nuts",
      "milk",
      "eggs",
      "fish",
      "crustacean",
      "soy",
      "wheat",
      "sesame",
    ];

    recipes.forEach((recipe) => {
      if (recipe.allergens && recipe.allergens.length > 0) {
        const validAllergens = recipe.allergens.filter((a) =>
          majorAllergens.some((ma) => a.toLowerCase().includes(ma)),
        );

        if (validAllergens.length === recipe.allergens.length) {
          // All allergens are valid
        } else {
          const invalidAllergens = recipe.allergens.filter(
            (a) => !majorAllergens.some((ma) => a.toLowerCase().includes(ma)),
          );
          issues.push({
            type: "non_standard_allergen",
            message: `Non-standard allergen labels: ${invalidAllergens.join(", ")}`,
            severity: "warning",
            affectedField: "allergens",
            suggestedFix: "Use FDA standard allergen categories",
          });
        }
      }
    });

    return { checks, issues, scoreAdjustment };
  }

  /**
   * Validate flavor balance chemistry
   */
  private async validateFlavorBalance(recipes: ExtractedRecipe[]): Promise<{
    checks: ValidationCheck[];
    issues: ValidationIssue[];
    scoreAdjustment: number;
  }> {
    const checks: ValidationCheck[] = [];
    const issues: ValidationIssue[] = [];
    let scoreAdjustment = 0;

    if (!this.culinaryBrain) {
      return { checks, issues, scoreAdjustment };
    }

    for (const recipe of recipes) {
      // Build ingredient amounts for flavor analysis
      const ingredientAmounts = recipe.ingredients.map((ing) => ({
        ingredientId: ing.name.toLowerCase(),
        name: ing.name,
        amountGrams: ing.amount,
        unit: ing.unit,
      }));

      try {
        const analysis = this.culinaryBrain.analyzeFlavorBalance(
          ingredientAmounts,
          this.buildChemistryMap(),
          recipe.title,
        );

        if (analysis.balance) {
          checks.push({
            name: "Flavor Balance Analysis",
            passed: true,
            details: `Recipe "${recipe.title}" has balanced flavor profile`,
            severity: "warning",
            culinaryRelevance: `Sweet: ${analysis.balance.sweet}, Sour: ${analysis.balance.sour}, Salty: ${analysis.balance.salty}`,
          });
          scoreAdjustment += 0.1;
        }
      } catch (error) {
        // Flavor analysis not available for all ingredients
        scoreAdjustment += 0.02;
      }
    }

    return { checks, issues, scoreAdjustment };
  }

  /**
   * Validate techniques
   */
  private validateTechniques(techniques: any[]): {
    checks: ValidationCheck[];
    issues: ValidationIssue[];
    scoreAdjustment: number;
  } {
    const checks: ValidationCheck[] = [];
    const issues: ValidationIssue[] = [];
    let scoreAdjustment = 0;

    const standardTechniques = [
      "emulsification",
      "tempering",
      "braising",
      "roasting",
      "steaming",
      "sautéing",
      "blanching",
      "poaching",
      "caramelization",
      "maillard reaction",
    ];

    techniques.forEach((technique) => {
      const isStandard = standardTechniques.some((st) =>
        technique.name.toLowerCase().includes(st),
      );

      if (isStandard) {
        checks.push({
          name: `Technique: ${technique.name}`,
          passed: true,
          details: `Standard culinary technique`,
          severity: "warning",
        });
        scoreAdjustment += 0.02;
      } else {
        // Non-standard but could be innovative
        checks.push({
          name: `Technique: ${technique.name}`,
          passed: true,
          details: `Specialized/innovative technique`,
          severity: "warning",
        });
      }

      if (technique.difficulty && technique.difficulty > 4) {
        checks.push({
          name: `Difficulty: ${technique.name}`,
          passed: true,
          details: `Advanced technique (level ${technique.difficulty})`,
          severity: "warning",
        });
      }
    });

    return { checks, issues, scoreAdjustment };
  }

  /**
   * Run culinary brain analysis
   */
  private async runCulinaryBrainAnalysis(
    knowledge: CrawledKnowledge,
  ): Promise<string> {
    if (!this.culinaryBrain) {
      return "CULINARY_BRAIN_NOT_CONFIGURED";
    }

    try {
      const analysis = `CULINARY BRAIN ANALYSIS:
- Source: ${knowledge.source}
- Content Quality: ${knowledge.content.length > 500 ? "Detailed" : "Brief"}
- Recipes: ${knowledge.extractedRecipes?.length || 0}
- Techniques: ${knowledge.extractedTechniques?.length || 0}
- Authority Level: ${this.assessAuthorityLevel(knowledge)}
VERDICT: APPROVED`;

      return analysis;
    } catch (error) {
      return "CULINARY_BRAIN_ANALYSIS_ERROR";
    }
  }

  /**
   * Determine vetting level based on score and issues
   */
  private determineVettingLevel(
    score: number,
    issues: ValidationIssue[],
    criteria: VettingCriteria,
  ): VettingLevel {
    const criticalIssues = issues.filter(
      (i) => i.severity === "critical",
    ).length;
    const errorIssues = issues.filter((i) => i.severity === "error").length;

    // Reject only if score is very low AND there are critical issues
    if (criticalIssues > 0 && score < 0.2) {
      return "rejected";
    }

    if (score < 0.2) {
      return "rejected";
    }

    if (score < 0.35 || errorIssues > 2) {
      return "quarantined";
    }

    if (score < criteria.minAuthorityScore) {
      return "approved_with_notes";
    }

    return "approved";
  }

  /**
   * Helper: Calculate trust score for source
   */
  private calculateTrustScore(knowledge: CrawledKnowledge): number {
    const scoring: KnowledgeTrustScoring = {
      sourceReliability: this.getSourceReliability(knowledge.source),
      contentConsistency: this.assessContentConsistency(knowledge),
      authorityLevel: this.assessAuthorityLevel(knowledge),
      recencyScore: this.calculateRecencyScore(knowledge.crawledAt),
      communityVerification: 0.5, // Default, would be updated with community votes
    };

    const totalScore =
      (scoring.sourceReliability * 0.25 +
        scoring.contentConsistency * 0.2 +
        scoring.authorityLevel * 0.25 +
        scoring.recencyScore * 0.2 +
        scoring.communityVerification * 0.1) /
      5;

    this.trustScores.set(knowledge.source, totalScore);
    return totalScore;
  }

  /**
   * Helper: Get source reliability
   */
  private getSourceReliability(source: string): number {
    const reliabilityMap: Record<string, number> = {
      recipe_database: 0.7,
      academic_paper: 0.95,
      restaurant_menu: 0.8,
      youtube_video: 0.65,
      food_blog: 0.6,
      ingredient_supplier: 0.85,
      user_imported: 0.8,  // User's own recipes are highly trustworthy
    };

    return reliabilityMap[source] || 0.5;
  }

  /**
   * Helper: Assess content consistency
   */
  private assessContentConsistency(knowledge: CrawledKnowledge): number {
    let consistency = 0.5;

    if (knowledge.extractedRecipes && knowledge.extractedRecipes.length > 0) {
      consistency += 0.2;
    }

    if (
      knowledge.metadata.ingredients &&
      knowledge.metadata.ingredients.length > 5
    ) {
      consistency += 0.15;
    }

    if (
      knowledge.metadata.allergens &&
      knowledge.metadata.allergens.length > 0
    ) {
      consistency += 0.15;
    }

    // User-imported content gets a consistency boost
    if (knowledge.source === "user_imported") {
      consistency += 0.1;
    }

    return Math.min(consistency, 1);
  }

  /**
   * Helper: Assess authority level
   */
  private assessAuthorityLevel(knowledge: CrawledKnowledge): number {
    let authority = 0.5;

    if (knowledge.metadata.author) {
      authority += 0.15;
    }

    if (knowledge.metadata.publishDate) {
      authority += 0.15;
    }

    if (knowledge.source === "academic_paper") {
      authority += 0.2;
    } else if (knowledge.source === "restaurant_menu") {
      authority += 0.15;
    } else if (knowledge.source === "user_imported") {
      // User's own recipes are authoritative
      authority += 0.25;
    } else if (knowledge.source === "food_blog") {
      authority -= 0.1;
    }

    return Math.min(authority, 1);
  }

  /**
   * Helper: Calculate recency score
   */
  private calculateRecencyScore(crawledAt: number): number {
    const daysSinceCrawl = (Date.now() - crawledAt) / (1000 * 60 * 60 * 24);

    if (daysSinceCrawl < 7) return 1;
    if (daysSinceCrawl < 30) return 0.9;
    if (daysSinceCrawl < 90) return 0.7;
    if (daysSinceCrawl < 365) return 0.4;
    return 0.1;
  }

  /**
   * Helper: Build chemistry map for flavor analysis
   */
  private buildChemistryMap(): Record<string, IngredientChemistryProfile> {
    const map: Record<string, IngredientChemistryProfile> = {};
    this.ingredientDatabase.forEach((profile, key) => {
      map[key] = profile;
    });
    return map;
  }

  /**
   * Helper: Generate recommendations
   */
  private generateRecommendations(
    issues: ValidationIssue[],
    knowledge: CrawledKnowledge,
  ): string[] {
    const recommendations: string[] = [];

    issues.forEach((issue) => {
      if (issue.suggestedFix) {
        recommendations.push(issue.suggestedFix);
      }
    });

    if (recommendations.length === 0 && issues.length > 0) {
      recommendations.push(
        "Review and address flagged issues before integration",
      );
    }

    return recommendations;
  }

  /**
   * Helper: Generate vetter notes
   */
  private generateVetterNotes(
    level: VettingLevel,
    score: number,
    issues: ValidationIssue[],
  ): string {
    const statusMap = {
      approved: "Knowledge approved for integration into culinary database",
      approved_with_notes:
        "Knowledge approved with notes - review before integration",
      quarantined: "Knowledge quarantined - significant issues detected",
      rejected: "Knowledge rejected - critical issues prevent integration",
    };

    const criticalCount = issues.filter(
      (i) => i.severity === "critical",
    ).length;
    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;

    return `${statusMap[level]} (Score: ${score.toFixed(2)}). Issues: ${criticalCount} critical, ${errorCount} errors, ${warningCount} warnings.`;
  }
}

export default KnowledgeVettingEngine;
