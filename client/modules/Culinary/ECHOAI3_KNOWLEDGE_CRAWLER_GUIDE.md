# EchoAi³ Knowledge Crawler, Gap Detection & Vetting System

## Complete Implementation Guide

---

## 🎯 Overview

EchoAi³ now includes an advanced **Knowledge Crawler Engine** that automatically searches multiple sources, detects knowledge gaps, and implements quality checks to ensure Echo becomes the leading culinary authority.

### Three Core Components

1. **Knowledge Crawler** - Searches 6+ knowledge sources
2. **Gap Detector** - Identifies missing information across 12 categories
3. **Vetting Engine** - Multi-layer validation with culinary science checks

---

## 📊 Knowledge Sources

### 1. **Recipe Databases**

- AllRecipes, Food Network, Serious Eats, Bon Appétit
- Extracts: recipes, techniques, cooking times
- Trust Score: 0.70

### 2. **Academic Papers**

- PubMed Central, Google Scholar, ResearchGate, ACS Journals
- Extracts: flavor chemistry, food science, techniques
- Trust Score: 0.95 ⭐ (highest authority)

### 3. **Restaurant Menus**

- Michelin Guide, Yelp, Menu Engineering platforms
- Extracts: culinary trends, professional plating, advanced techniques
- Trust Score: 0.80

### 4. **YouTube Videos**

- Professional chefs: Gordon Ramsay, Julia Child, Alton Brown
- Extracts: techniques, timing, visual demonstrations
- Trust Score: 0.65

### 5. **Food Blogs**

- Serious Eats, Kenji's Kitchen, The Spruce Eats
- Extracts: ingredient insights, techniques, flavor pairing
- Trust Score: 0.60

### 6. **Ingredient Suppliers**

- SAG, Chef Rubber, The Spice House, Kalustyan's
- Extracts: specs, sourcing, costs, allergens
- Trust Score: 0.85

---

## 🔍 Knowledge Gap Categories

Echo automatically detects gaps across 12 critical areas:

| Category                      | Priority    | Detection Trigger                    |
| ----------------------------- | ----------- | ------------------------------------ |
| **Allergen Information**      | 🔴 CRITICAL | Missing allergen data in recipes     |
| **Nutrition Data**            | 🔴 HIGH     | No caloric/macro information         |
| **Flavor Chemistry**          | 🔴 HIGH     | Missing ingredient volatiles/acidity |
| **Technique Documentation**   | 🔴 HIGH     | Unexplained cooking methods          |
| **Substitution Rules**        | 🟡 MEDIUM   | No alternatives for ingredients      |
| **Cost Data**                 | 🟡 MEDIUM   | Missing ingredient pricing           |
| **Ingredient Specifications** | 🟡 MEDIUM   | No quality/grade information         |
| **Workflow Optimization**     | 🟡 MEDIUM   | Missing prep/cook times              |
| **Dietary Restrictions**      | 🔴 HIGH     | No dietary tags on recipes           |
| **Sourcing Information**      | 🟡 MEDIUM   | No supplier data                     |
| **Regional Variations**       | 🟢 LOW      | Limited cuisine diversity            |
| **Equipment Specifications**  | 🟢 LOW      | Missing tool requirements            |

---

## 🚀 Implementation Patterns

### Pattern 1: User Query Triggered Crawl

```typescript
import { KnowledgeManager } from "@/echo/cognition/knowledgeManager";

const manager = new KnowledgeManager({
  enableAutoCrawl: false,
  enableAutoVetting: true,
  enableGapDetection: true,
});

// User asks: "How do I handle walnut allergies in desserts?"
const result = await manager.expandKnowledge(
  "walnut allergy desserts safe substitutions",
  "user_query",
);

console.log(`✓ Found ${result.crawlResult.successCount} sources`);
console.log(`✓ Approved ${result.newlyApprovedKnowledge.length} items`);
console.log(
  `✗ Rejected ${result.vetResult.filter((r) => r.level === "rejected").length} items`,
);
```

### Pattern 2: Automatic Gap Detection & Filling

```typescript
import { KnowledgeGapDetector } from "@/echo/cognition/gapDetector";

const gapDetector = new KnowledgeGapDetector();
gapDetector.registerRecipes(allRecipes);
gapDetector.registerIngredients(allIngredients);

const analysis = gapDetector.detectAllGaps();

analysis.gaps.forEach((gap) => {
  if (gap.priority === "critical") {
    console.log(`🚨 CRITICAL: ${gap.title}`);
    console.log(`   Affects: ${gap.affectedRecipes.length} recipes`);
    console.log(`   Sources to check: ${gap.suggestedSources.join(", ")}`);
  }
});
```

### Pattern 3: Manual Knowledge Import with Vetting

```typescript
import { KnowledgeVettingEngine } from "@/echo/cognition/knowledgeVetting";
import type { CrawledKnowledge } from "@/echo/cognition/knowledgeCrawler";

const vettingEngine = new KnowledgeVettingEngine(echoChefBrain);
vettingEngine.registerIngredientDatabase(ingredientChemistry);

const knowledge: CrawledKnowledge = {
  id: "manual_import_001",
  title: "Advanced Emulsion Techniques",
  source: "academic_paper",
  sourceUrl: "https://example.com/emulsion-science",
  content: "...",
  metadata: {
    author: "Food Science Journal",
    publishDate: Date.now(),
    technique: ["emulsification", "lecithin"],
    ingredients: ["egg yolk", "oil", "vinegar"],
    allergens: ["eggs"],
  },
  extractedRecipes: [...],
  crawledAt: Date.now(),
  triggeredBy: "manual",
};

const vetResult = await vettingEngine.vetKnowledge(knowledge, {
  minAuthorityScore: 0.65,
  allergenValidationRequired: true,
  flavorBalanceValidation: true,
});

console.log(`Vetting Result: ${vetResult.level}`);
console.log(`Trust Score: ${(vetResult.score * 100).toFixed(1)}%`);
console.log(`Issues: ${vetResult.issues.length}`);
```

### Pattern 4: Scheduled Knowledge Expansion

```typescript
const manager = new KnowledgeManager({
  enableAutoCrawl: true,
  crawlSchedule: {
    interval: 7 * 24 * 60 * 60 * 1000, // Weekly
    topics: [
      "seasonal ingredients",
      "trending techniques",
      "allergen updates",
      "regional cuisine",
    ],
  },
});

// Automatically runs every week
```

### Pattern 5: Allergen-Focused Knowledge Enhancement

```typescript
import { EchoChefBrainWithKnowledge } from "@/echo/brain/echoChefBrainKnowledge";

const echo = new EchoChefBrainWithKnowledge(culinaryBrain, {
  enableAutoCrawl: false,
  minApprovalScore: 0.7,
});

echo.initializeKnowledgeBase(recipes, ingredients);

// Expand knowledge for allergens specifically
const expansion = await echo.expandKnowledgeArea("allergens", [
  "FDA major allergens",
  "cross contamination",
  "allergen labeling requirements",
  "ingredient allergen profiles",
  "facility allergen protocols",
]);

console.log(`📚 New knowledge: ${expansion.newKnowledge} approved items`);
console.log(
  `Confidence scores: ${expansion.vetResults.map((v) => v.score).join(", ")}`,
);
```

---

## 🛡️ Vetting Multi-Layer Validation

The vetting engine performs **7 validation phases**:

### Phase 1: Source Validation

- ✅ Check source credibility (approved/banned list)
- ✅ Verify trust score (min 0.5)
- ✅ Validate author credentials
- ✅ Check recency (prefer < 30 days)

### Phase 2: Content Quality

- ✅ Check content length (min 100 chars)
- ✅ Verify extracted recipes/techniques
- ✅ Validate metadata richness (min 3 fields)

### Phase 3: Ingredient Verification

- ✅ Cross-reference with ingredient database
- ✅ Validate amounts and units
- ✅ Check ingredient aliases

### Phase 4: Allergen Validation ⭐ CRITICAL

- ✅ Ensure complete allergen documentation
- ✅ Validate against FDA major allergens
- ✅ Cross-check with ingredient profiles
- ✅ Detect undisclosed allergens

### Phase 5: Flavor Chemistry Analysis

- ✅ Calculate flavor balance (sweet, sour, salty, umami)
- ✅ Assess emulsion capacity
- ✅ Validate fat-to-acid ratios
- ✅ Check for aromatic complexity

### Phase 6: Technique Verification

- ✅ Validate against standard culinary techniques
- ✅ Check difficulty levels
- ✅ Verify time requirements

### Phase 7: Culinary Brain Analysis

- ✅ Run comprehensive culinary science check
- ✅ Validate against Echo's knowledge base
- ✅ Generate recommendations

**Vetting Levels**:

- 🔴 **Rejected** (score < 0.3): Critical issues, cannot integrate
- 🟡 **Quarantined** (score 0.3-0.5): Significant issues, needs review
- 🟢 **Approved w/ Notes** (score 0.5-0.6): Minor issues, can integrate
- 🟢 **Approved** (score > 0.6): Ready for full integration

---

## 📈 Knowledge Metrics & Reporting

```typescript
const metrics = manager.getMetrics();

console.log(`
Knowledge Base Status:
- Total Items: ${metrics.totalKnowledgeItems}
- Approved: ${metrics.approvedItems} (${((metrics.approvedItems / metrics.totalKnowledgeItems) * 100).toFixed(1)}%)
- Rejected: ${metrics.rejectedItems}
- Quarantined: ${metrics.quarantinedItems}
- Avg Trust Score: ${metrics.averageTrustScore.toFixed(2)}/1.0
- Covered Domains: ${metrics.coveredDomains.join(", ")}
- Last Crawl: ${new Date(metrics.lastCrawlTime).toLocaleString()}
`);
```

---

## 🎛️ Configuration Examples

### Conservative Configuration (High Quality)

```typescript
const manager = new KnowledgeManager({
  enableAutoCrawl: false,
  enableAutoVetting: true,
  enableGapDetection: true,
  vetCriteria: {
    minAuthorityScore: 0.75,
    minSourceTrust: 0.7,
    requiresCulinaryBrainApproval: true,
    allergenValidationRequired: true,
    flavorBalanceValidation: true,
    ingredientVerification: true,
    techniqueVerification: true,
  },
});
```

### Expansive Configuration (Broader Coverage)

```typescript
const manager = new KnowledgeManager({
  enableAutoCrawl: true,
  enableAutoVetting: true,
  enableGapDetection: true,
  crawlSchedule: {
    interval: 3 * 24 * 60 * 60 * 1000, // Every 3 days
    topics: ["seasonal ingredients", "techniques", "regional cuisine"],
  },
  vetCriteria: {
    minAuthorityScore: 0.5,
    minSourceTrust: 0.4,
    requiresCulinaryBrainApproval: false,
    allergenValidationRequired: true, // Always strict on allergens
  },
});
```

### Production Configuration

```typescript
const manager = new KnowledgeManager({
  enableAutoCrawl: true,
  enableAutoVetting: true,
  enableGapDetection: true,
  crawlSchedule: {
    interval: 7 * 24 * 60 * 60 * 1000, // Weekly
    topics: [
      "FDA allergen updates",
      "new culinary techniques",
      "ingredient developments",
      "nutrition research",
    ],
  },
  vetCriteria: {
    minAuthorityScore: 0.7,
    minSourceTrust: 0.6,
    requiresCulinaryBrainApproval: true,
    allergenValidationRequired: true,
    flavorBalanceValidation: true,
  },
});
```

---

## 🔌 Integration with R&D Labs

```typescript
import { EchoChefBrainWithKnowledge } from "@/echo/brain/echoChefBrainKnowledge";

class RDLabsWithKnowledgeIntegration {
  private echo: EchoChefBrainWithKnowledge;

  constructor(culinaryBrain: any) {
    this.echo = new EchoChefBrainWithKnowledge(culinaryBrain, {
      enableAutoCrawl: false,
      minApprovalScore: 0.65,
    });
  }

  async suggestExperimentVariations(baseRecipe: RecipeCodexMetadata) {
    // Get knowledge-enriched suggestions
    const suggestions = await this.echo.suggestWithKnowledge(baseRecipe.title, [
      baseRecipe,
    ]);

    // Find ingredient substitutions
    const substitutions = await Promise.all(
      baseRecipe.ingredients.map((ing) =>
        this.echo.suggestSubstitutions(ing.name),
      ),
    );

    // Check for gaps
    const gaps = await this.echo.analyzeKnowledgeGaps();

    return {
      suggestions,
      substitutions,
      gaps: gaps.analysis.gaps.filter((g) =>
        baseRecipe.ingredients.some((ing) =>
          g.affectedIngredients.includes(ing.name),
        ),
      ),
    };
  }

  async enrichExperimentWithAllergenData(experiment: any) {
    // Auto-fill allergen information
    const enrichedRecipes = await Promise.all(
      experiment.recipes.map((r) => this.echo.enrichWithAllergenData(r)),
    );

    return { ...experiment, recipes: enrichedRecipes };
  }
}
```

---

## 📋 Knowledge Quality Standards

### Allergen Information Standard

- ✅ Must reference FDA major allergens
- ✅ Must list all allergens present
- ✅ Must note potential cross-contamination
- ✅ Must include ingredient-by-ingredient allergen status
- ✅ Must be from reputable source (supplier, academic, or approved recipe DB)

### Flavor Chemistry Standard

- ✅ Must include acidity level
- ✅ Must include fat content
- ✅ Must list volatile compounds
- ✅ Must assess emulsification capability
- ✅ Must be from academic or food science blog

### Technique Standard

- ✅ Must include step-by-step instructions
- ✅ Must specify temperatures/timing
- ✅ Must indicate difficulty level
- ✅ Must be from professional source (YouTube chef, restaurant, academic)

### Cost Data Standard

- ✅ Must be current (< 90 days old)
- ✅ Must include unit price
- ✅ Must list typical suppliers
- ✅ Must note seasonal variations
- ✅ Must be from supplier or professional sourcing guide

---

## 🎯 Use Cases

### Use Case 1: Allergen Compliance Audit

```typescript
const analysis = gapDetector.detectAllGaps();
const allergenGaps = analysis.gaps.filter(
  (g) => g.category === "allergen_information",
);

if (allergenGaps.length > 0) {
  console.log("🚨 COMPLIANCE ALERT: Missing allergen information");
  allergenGaps.forEach((gap) => {
    crawler.crawlGap(gap.id, "allergen_information");
  });
}
```

### Use Case 2: Regional Cuisine Expansion

```typescript
const recommendations = manager.getRecommendedSources(
  "Thai cuisine techniques",
);
// Returns: ["restaurant_menu", "youtube_video", "food_blog"]

const expansion = await crawler.crawlByQuery(
  "authentic Thai cooking techniques",
  {
    sources: recommendations,
    maxResultsPerSource: 20,
  },
);
```

### Use Case 3: Ingredient Substitution Generator

```typescript
const substitutions = await echo.suggestSubstitutions("butter");
// Returns: gluten-free options, vegan options, regional alternatives
// With ratios and sourced from 3+ knowledge sources
```

### Use Case 4: Knowledge Authority Report

```typescript
const report = echo.generateGapReport();
console.log(report);
// Shows coverage %, top gaps, recommendations
```

---

## 🚨 Error Handling

```typescript
try {
  const result = await manager.expandKnowledge("complex query");

  // Check vetting results
  result.vetResult.forEach((vet) => {
    if (vet.level === "rejected") {
      console.warn(
        `Rejected: ${vet.source} - ${vet.issues.map((i) => i.message).join(", ")}`,
      );
    }
  });
} catch (error) {
  console.error("Knowledge expansion failed:", error);
  // Fallback to existing knowledge
}
```

---

## 📚 Knowledge Library Access

```typescript
// Get all approved knowledge
const approved = manager.getApprovedKnowledge();

// Filter by source
const academic = approved.filter((k) => k.source === "academic_paper");
const recipes = approved.filter((k) => k.source === "recipe_database");

// Filter by topic
const allergenKnowledge = approved.filter(
  (k) => k.metadata.allergens && k.metadata.allergens.length > 0,
);

// Get vetting results
const vetResults = manager.getVettingResults();
vetResults.forEach((vet) => {
  console.log(`${vet.id}: ${vet.level} (${(vet.score * 100).toFixed(0)}%)`);
});
```

---

## 🔐 Security & Compliance

- ✅ No API keys stored in code (use environment variables)
- ✅ Rate limiting enforced (configurable delays between requests)
- ✅ Source validation prevents malicious content
- ✅ Allergen information triple-checked
- ✅ Audit trail of all vetting decisions
- ✅ Approved sources list maintained
- ✅ Banned sources automatically rejected

---

## 🎓 How Echo Becomes the Leading Authority

1. **Comprehensive Coverage**: Crawls 6 knowledge sources continuously
2. **Quality Gate**: Multi-layer vetting with culinary science checks
3. **Gap Analysis**: Proactively identifies and fills knowledge gaps
4. **Allergen Expertise**: Triple-validated allergen information
5. **Science-Based**: All recommendations backed by chemistry & data
6. **Community Ready**: Approved knowledge can be shared globally
7. **Authority Scoring**: Each piece of knowledge has trust score

The system ensures Echo doesn't just aggregate data—it **validates, enriches, and synthesizes** knowledge to become truly authoritative.

---

## 📖 Next Steps

1. Initialize knowledge base with current recipes/ingredients
2. Configure vetting criteria for your use case
3. Schedule crawls for critical topics (allergens, trends)
4. Monitor metrics dashboard
5. Generate gap reports monthly
6. Integrate with R&D labs for experiment enhancement
