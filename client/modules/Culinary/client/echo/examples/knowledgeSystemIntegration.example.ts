/**
 * EchoAi³ Knowledge System Integration Example
 * Shows practical usage of crawler, gap detection, and vetting systems
 *
 * This example demonstrates:
 * 1. Initializing the knowledge manager
 * 2. Running a user query crawl
 * 3. Analyzing knowledge gaps
 * 4. Expanding knowledge for allergens (critical)
 * 5. Integrating with R&D Labs
 */

import { KnowledgeManager } from "../cognition/knowledgeManager";
import { EchoChefBrainWithKnowledge } from "../brain/echoChefBrainKnowledge";
import type { RecipeCodexMetadata } from "../codex";

/**
 * EXAMPLE 1: Basic Knowledge Manager Setup and Query
 */
export async function example1_BasicSetup() {
  console.log("\n=== EXAMPLE 1: Basic Knowledge Manager Setup ===\n");

  // Initialize knowledge manager
  const manager = new KnowledgeManager({
    enableAutoCrawl: false,
    enableAutoVetting: true,
    enableGapDetection: true,
  });

  // Register your current knowledge base
  const mockRecipes: RecipeCodexMetadata[] = [
    {
      id: "recipe_001",
      title: "Classic Vinaigrette",
      category: "dressing",
      cuisineRegion: "French",
      ingredients: [
        { name: "olive oil", amount: 100, unit: "ml" },
        { name: "vinegar", amount: 25, unit: "ml" },
        { name: "salt", amount: 5, unit: "g" },
      ],
      instructions: ["Mix", "Whisk"],
      yield: 1,
      difficulty: 1,
      allergens: [], // MISSING allergen data - Gap will be detected
      dietaryTags: ["vegetarian"],
      prepTime: 10,
      cookTime: 0,
    },
  ];

  const mockIngredients = {
    olive_oil: {
      name: "olive oil",
      allergens: [],
      chemistry: { acidity: 0.1 },
    },
    vinegar: {
      name: "vinegar",
      allergens: [],
      chemistry: { acidity: 5 },
    },
  };

  manager.registerKnowledgeBase(mockRecipes, mockIngredients);

  console.log("✅ Knowledge manager initialized");
  console.log("✅ Registered recipes and ingredients");

  // User query: "How to make allergen-free vinaigrette?"
  console.log("\n📝 User Query: 'How to make allergen-free vinaigrette?'");

  const result = await manager.expandKnowledge(
    "allergen-free vinaigrette recipe",
    "user_query",
  );

  console.log(`\n📊 Crawl Results:`);
  console.log(`   Found: ${result.crawlResult.successCount} sources`);
  console.log(`   Duration: ${result.crawlResult.duration}ms`);

  console.log(`\n✅ Vetting Results:`);
  result.vetResult.slice(0, 3).forEach((vet) => {
    console.log(`   [${vet.level.toUpperCase()}] ${vet.source}`);
    console.log(`   Trust Score: ${(vet.score * 100).toFixed(0)}%`);
    if (vet.issues.length > 0) {
      console.log(`   Issues: ${vet.issues.length}`);
    }
  });

  console.log(
    `\n✅ New Approved Knowledge: ${result.newlyApprovedKnowledge.length} items`,
  );

  // Check metrics
  const metrics = manager.getMetrics();
  console.log(`\n📈 Knowledge Metrics:`);
  console.log(`   Total Items: ${metrics.totalKnowledgeItems}`);
  console.log(`   Approved: ${metrics.approvedItems}`);
  console.log(
    `   Avg Trust Score: ${(metrics.averageTrustScore * 100).toFixed(0)}%`,
  );
}

/**
 * EXAMPLE 2: Detect and Fill Knowledge Gaps
 */
export async function example2_GapDetection() {
  console.log("\n=== EXAMPLE 2: Knowledge Gap Detection ===\n");

  const manager = new KnowledgeManager({
    enableAutoCrawl: false,
    enableAutoVetting: true,
    enableGapDetection: true,
  });

  // Analyze knowledge gaps
  console.log("🔍 Analyzing knowledge gaps...\n");
  const gapAnalysis = await manager.analyzeGaps();

  console.log("🚨 CRITICAL GAPS:");
  const criticalGaps = gapAnalysis.gaps.filter(
    (g) => g.priority === "critical",
  );
  criticalGaps.slice(0, 3).forEach((gap) => {
    console.log(`\n   📍 ${gap.title}`);
    console.log(`      Description: ${gap.description}`);
    console.log(
      `      Affected: ${gap.affectedRecipes.length} recipes, ${gap.affectedIngredients.length} ingredients`,
    );
    console.log(`      Suggested Sources: ${gap.suggestedSources.join(", ")}`);
  });

  console.log("\n🟡 HIGH PRIORITY GAPS:");
  const highGaps = gapAnalysis.gaps.filter((g) => g.priority === "high");
  console.log(`   Found ${highGaps.length} high-priority gaps`);

  console.log("\n📋 RECOMMENDATIONS:");
  gapAnalysis.recommendations.slice(0, 3).forEach((rec) => {
    console.log(`   • ${rec}`);
  });

  console.log("\n📊 COVERAGE:");
  Object.entries(gapAnalysis.coveragePercentage)
    .filter(([_, coverage]) => coverage < 50)
    .slice(0, 5)
    .forEach(([category, coverage]) => {
      console.log(`   ${category}: ${coverage.toFixed(0)}%`);
    });
}

/**
 * EXAMPLE 3: Allergen-Focused Knowledge Expansion
 */
export async function example3_AllergenExpansion() {
  console.log("\n=== EXAMPLE 3: Allergen-Focused Knowledge Expansion ===\n");

  const manager = new KnowledgeManager({
    enableAutoCrawl: false,
    enableAutoVetting: true,
    enableGapDetection: true,
    vetCriteria: {
      minAuthorityScore: 0.7,
      minSourceTrust: 0.6,
      requiresCulinaryBrainApproval: true,
      allergenValidationRequired: true, // CRITICAL - Always strict
      flavorBalanceValidation: true,
      ingredientVerification: true,
      techniqueVerification: false,
    },
  });

  // Focus on allergen information
  console.log("🚨 ALLERGEN KNOWLEDGE EXPANSION\n");
  console.log(
    "Crawling for: Walnut allergy safety, cross contamination, substitutions\n",
  );

  const result = await manager.expandKnowledge(
    "walnut allergy dessert safety cross contamination prevention substitutes",
    "gap_detection", // Triggered by gap detection
  );

  console.log(`✅ Found ${result.crawlResult.successCount} sources\n`);

  // Focus on critical vetting results
  const criticalVets = result.vetResult.filter(
    (v) => v.level === "rejected" || v.level === "quarantined",
  );
  if (criticalVets.length > 0) {
    console.log(
      `⚠️  FILTERED OUT (Failed vetting): ${criticalVets.length} items`,
    );
    criticalVets.slice(0, 2).forEach((v) => {
      console.log(`   ${v.source}: ${v.vetterNotes}`);
    });
  }

  console.log(
    `\n✅ APPROVED KNOWLEDGE: ${result.newlyApprovedKnowledge.length} items`,
  );
  console.log("   These are safe for integration into your knowledge base");

  // Show what was learned
  result.newlyApprovedKnowledge.slice(0, 2).forEach((knowledge) => {
    console.log(`\n   📚 ${knowledge.title}`);
    console.log(`      Source: ${knowledge.source}`);
    console.log(
      `      Allergens: ${knowledge.metadata.allergens?.join(", ") || "None found"}`,
    );
  });
}

/**
 * EXAMPLE 4: Integration with R&D Labs
 */
export async function example4_RDLabsIntegration() {
  console.log("\n=== EXAMPLE 4: R&D Labs Knowledge Integration ===\n");

  // Initialize Echo with knowledge
  const echo = new EchoChefBrainWithKnowledge(null, {
    enableAutoCrawl: false,
    minApprovalScore: 0.65,
  });

  // Initialize knowledge base
  const mockRecipes: RecipeCodexMetadata[] = [
    {
      id: "mousse_001",
      title: "Chocolate Mousse",
      category: "dessert",
      cuisineRegion: "French",
      ingredients: [
        { name: "dark chocolate", amount: 100, unit: "g" },
        { name: "egg white", amount: 60, unit: "ml" },
        { name: "cream", amount: 100, unit: "ml" },
      ],
      instructions: ["Melt", "Whip", "Fold"],
      yield: 4,
      difficulty: 2,
      allergens: ["eggs", "dairy"], // Has allergen data
      dietaryTags: ["vegetarian"],
      prepTime: 20,
      cookTime: 0,
    },
  ];

  echo.initializeKnowledgeBase(mockRecipes, {
    dark_chocolate: { name: "dark chocolate" },
    egg_white: { name: "egg white", allergens: ["eggs"] },
    cream: { name: "cream", allergens: ["dairy"] },
  });

  console.log("🧪 R&D EXPERIMENT DESIGN WITH KNOWLEDGE\n");
  console.log("Base Recipe: Chocolate Mousse\n");

  // Get knowledge-enriched suggestions
  const suggestions = await echo.suggestWithKnowledge(
    "chocolate mousse variations dietary restrictions",
    [mockRecipes[0]],
  );

  console.log(`📚 Knowledge-Enhanced Suggestions: ${suggestions.length}\n`);
  suggestions.slice(0, 2).forEach((suggestion) => {
    console.log(`   �� ${suggestion.title}`);
    console.log(`      Source: ${suggestion.source}`);
    console.log(
      `      Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`,
    );
    console.log(`      From ${suggestion.knowledgeSources.length} sources`);
  });

  // Find ingredient substitutions
  console.log("\n🔄 INGREDIENT SUBSTITUTIONS:\n");
  const substitutions = await echo.suggestSubstitutions("egg white");
  console.log(`   For: egg white`);
  console.log(`   Alternatives: ${substitutions.substitutions.length} found`);
  substitutions.substitutions.slice(0, 2).forEach((sub) => {
    console.log(`   • ${sub.name} (ratio: 1:${sub.ratio.toFixed(1)})`);
  });

  // Analyze gaps
  console.log("\n🔍 KNOWLEDGE GAPS:\n");
  const gaps = await echo.analyzeKnowledgeGaps();
  console.log(
    `   Critical gaps: ${gaps.analysis.gaps.filter((g) => g.priority === "critical").length}`,
  );
  console.log(
    `   High gaps: ${gaps.analysis.gaps.filter((g) => g.priority === "high").length}`,
  );

  // Generate report
  console.log("\n📊 EXPERIMENT READINESS REPORT:\n");
  const report = echo.generateGapReport();
  console.log(report);
}

/**
 * EXAMPLE 5: Knowledge Metrics and Monitoring
 */
export async function example5_MetricsMonitoring() {
  console.log("\n=== EXAMPLE 5: Knowledge Metrics & Monitoring ===\n");

  const manager = new KnowledgeManager();

  // Register some mock data
  manager.registerKnowledgeBase([], {
    flour: { name: "flour" },
    sugar: { name: "sugar" },
    butter: { name: "butter" },
    eggs: { name: "eggs", allergens: ["eggs"] },
    milk: { name: "milk", allergens: ["dairy"] },
  });

  // Get metrics
  const metrics = manager.getMetrics();

  console.log("📈 KNOWLEDGE BASE METRICS:\n");
  console.log(`   Total Knowledge Items: ${metrics.totalKnowledgeItems}`);
  console.log(`   Approved: ${metrics.approvedItems}`);
  console.log(`   Rejected: ${metrics.rejectedItems}`);
  console.log(`   Quarantined: ${metrics.quarantinedItems}`);
  console.log(
    `   Average Trust Score: ${(metrics.averageTrustScore * 100).toFixed(0)}%`,
  );
  console.log(
    `   Covered Domains: ${metrics.coveredDomains.length > 0 ? metrics.coveredDomains.join(", ") : "None yet"}`,
  );

  console.log("\n⏱️  TIMING:\n");
  console.log(
    `   Last Crawl: ${metrics.lastCrawlTime > 0 ? new Date(metrics.lastCrawlTime).toLocaleString() : "Never"}`,
  );
  console.log(
    `   Last Integration: ${metrics.lastIntegrationTime > 0 ? new Date(metrics.lastIntegrationTime).toLocaleString() : "Never"}`,
  );

  console.log("\n🎯 QUALITY STATUS:\n");
  const approvalRate =
    metrics.totalKnowledgeItems > 0
      ? ((metrics.approvedItems / metrics.totalKnowledgeItems) * 100).toFixed(0)
      : "0";
  console.log(`   Approval Rate: ${approvalRate}%`);
  console.log(`   Quality Threshold: ✅ (Target > 60%)`);
}

/**
 * EXAMPLE 6: Manual Knowledge Import with Vetting
 */
export async function example6_ManualImport() {
  console.log("\n=== EXAMPLE 6: Manual Knowledge Import & Vetting ===\n");

  const manager = new KnowledgeManager({
    enableAutoVetting: true,
  });

  // Import manually prepared content
  const manualContent = {
    id: "manual_walnut_safety",
    title: "Walnut Allergen Safety Protocol",
    source: "academic_paper" as const,
    sourceUrl: "https://example.com/research",
    content: `
      Walnuts contain tree nut allergens that can trigger severe reactions.
      Cross-contamination protocols must be implemented...
    `,
    metadata: {
      author: "Food Safety Institute",
      publishDate: Date.now(),
      allergens: ["tree nuts", "walnuts"],
      technique: ["food safety", "allergen handling"],
      ingredients: ["walnuts"],
    },
    extractedRecipes: [],
    crawledAt: Date.now(),
    triggeredBy: "manual" as const,
  };

  console.log("📥 IMPORTING MANUAL CONTENT:\n");
  console.log(`   Title: ${manualContent.title}`);
  console.log(`   Source: ${manualContent.source}`);
  console.log(`   Author: ${manualContent.metadata.author}\n`);

  const vetResult = await manager.importAndVet(manualContent);

  console.log("🔍 VETTING RESULT:\n");
  console.log(`   Level: ${vetResult.level.toUpperCase()}`);
  console.log(`   Trust Score: ${(vetResult.score * 100).toFixed(0)}%`);
  console.log(`   Status: ${vetResult.vetterNotes}\n`);

  if (vetResult.issues.length > 0) {
    console.log("⚠️  ISSUES FOUND:");
    vetResult.issues.slice(0, 3).forEach((issue) => {
      console.log(`   [${issue.severity.toUpperCase()}] ${issue.message}`);
    });
  }

  if (vetResult.recommendations.length > 0) {
    console.log("\n💡 RECOMMENDATIONS:");
    vetResult.recommendations.slice(0, 3).forEach((rec) => {
      console.log(`   • ${rec}`);
    });
  }

  console.log(
    `\n✅ Integration: ${vetResult.level === "approved" || vetResult.level === "approved_with_notes" ? "Ready" : "Review Required"}`,
  );
}

/**
 * MAIN: Run all examples
 */
export async function runAllExamples() {
  try {
    await example1_BasicSetup();
    await example2_GapDetection();
    await example3_AllergenExpansion();
    await example4_RDLabsIntegration();
    await example5_MetricsMonitoring();
    await example6_ManualImport();

    console.log("\n✅ All examples completed successfully!\n");
    console.log("📚 For more information, see:");
    console.log("   • ECHOAI3_KNOWLEDGE_CRAWLER_GUIDE.md");
    console.log("   • RDLABS_KNOWLEDGE_INTEGRATION_GUIDE.md");
  } catch (error) {
    console.error("❌ Error running examples:", error);
  }
}

// Uncomment to run:
// runAllExamples();
