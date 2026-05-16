# Echo Knowledge Universe Integration Guide

## Overview

The Echo Knowledge Universe is a comprehensive multi-domain AI learning system that powers Echo AI with knowledge across 12 domains:

1. **Culinary Science** - Ingredients, techniques, flavor chemistry
2. **Pastry & Baking** - Formulas, rheology, texture science
3. **Mixology** - Cocktail chemistry, bar techniques
4. **Wine & Sommelier** - Varietals, regions, food pairing
5. **Hospitality Ops** - Service standards, FOH/BOH workflows
6. **Banquets & Events** - Event planning, BEO structure
7. **Finance & GL** - Cost analysis, P&L, forecasting
8. **Inventory & Supply** - PAR levels, reordering
9. **Labor & HR** - Scheduling, compliance
10. **CRM & Guest Experience** - Guest profiles, personalization
11. **Business Intelligence** - Forecasting, dashboards
12. **Beverage Science** - Drink formulas, cost management

## Architecture

```
┌─────────────────────────────────────────────────────┐
│         Echo Knowledge Universe Dashboard            │
│  (client/components/panels/KnowledgeUniverseDashboard.tsx)
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│      useEchoUnifiedBrain Hook (React)               │
│  (client/hooks/use-echo-unified-brain.ts)           │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│   Echo Unified Brain API Endpoint                   │
│   POST /api/echo-unified/query                      │
│   (server/routes/echo-unified-brain.ts)             │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│       EchoUnifiedBrain Orchestrator                 │
│  (client/echo/engines/EchoUnifiedBrain.ts)          │
└────────────────┬────────────────────────────────────┘
                 │
    ┌────────────┴─────────────────────────────────┐
    │                                              │
    ▼                                              ▼
Culinary Engine               Finance Engine
Pastry Engine                 Inventory Engine
Beverage Engine               Labor Engine
Mixology Engine               CRM Engine
Sommelier Engine              Forecast Engine
Hospitality Engine
Banquet Engine
```

## File Structure

```
client/
  echo/
    engines/                      ← 13 domain engines
      CulinaryScienceEngine.ts
      PastryScienceEngine.ts
      BeverageFlavorEngine.ts
      MixologyEngine.ts
      SommelierEngine.ts
      HospitalityOpsEngine.ts
      BanquetOpsEngine.ts
      FinanceEngine.ts
      InventoryEngine.ts
      LaborEngine.ts
      CRMEngine.ts
      ForecastEngine.ts
      EchoUnifiedBrain.ts         ← Orchestrator
    codex/
      KnowledgeCodex.ts           ← Master schema definitions
  components/panels/
    KnowledgeUniverseDashboard.tsx ← Visual dashboard
  hooks/
    use-echo-unified-brain.ts     ← React hook

server/
  routes/
    echo-unified-brain.ts         ← API endpoints
```

## Step 1: Add Knowledge Universe Dashboard to Recipe Page

In your Recipe page component (likely `client/pages/sections/AddRecipe.tsx` or similar):

```tsx
import { KnowledgeUniverseDashboard } from "@/components/panels/KnowledgeUniverseDashboard";
import { EchoKnowledgeBaseProgress } from "@/components/panels/EchoKnowledgeBaseProgress";

export function RecipePage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left column: Existing progress tracker */}
      <EchoKnowledgeBaseProgress />

      {/* Right column: Knowledge Universe Dashboard */}
      <KnowledgeUniverseDashboard />
    </div>
  );
}
```

## Step 2: Query the Unified Brain

Use the `useEchoUnifiedBrain` hook in any component:

```tsx
import { useEchoUnifiedBrain } from "@/hooks/use-echo-unified-brain";

export function RecipeAnalyzer() {
  const { query, isLoading, response, error } = useEchoUnifiedBrain();

  const analyzeFlavorBalance = async () => {
    const result = await query({
      type: "flavor_balance",
      payload: {
        ingredients: [
          { ingredientId: "lemon", grams: 50 },
          { ingredientId: "butter", grams: 100 },
          { ingredientId: "salt", grams: 2 },
        ],
        profiles: {
          lemon: {
            ingredientId: "lemon",
            acidPercentage: 5.4,
            volatiles: [{ name: "limonene", intensity: 0.8 }],
          },
          butter: {
            ingredientId: "butter",
            fatPercentage: 82,
            volatiles: [],
          },
          salt: {
            ingredientId: "salt",
            saltinessFactor: 1,
            volatiles: [],
          },
        },
      },
    });

    if (result) {
      console.log("Flavor balance:", result.result);
    }
  };

  return (
    <button onClick={analyzeFlavorBalance} disabled={isLoading}>
      {isLoading ? "Analyzing..." : "Analyze Flavor"}
    </button>
  );
}
```

## Step 3: Available Query Types

### Culinary Domain

#### flavor_balance

```typescript
{
  type: "flavor_balance",
  payload: {
    ingredients: IngredientAmount[],
    profiles: Record<string, IngredientChemistryProfile>
  }
}
```

#### thermal_profile

```typescript
{
  type: "thermal_profile",
  payload: {
    phases: ThermalPhase[]
  }
}
```

### Pastry Domain

#### pastry_texture

```typescript
{
  type: "pastry_texture",
  payload: {
    formula: BakersPercentageFormula
  }
}
```

#### pastry_defects

```typescript
{
  type: "pastry_defects",
  payload: {
    observations: string[],
    formula: BakersPercentageFormula
  }
}
```

### Beverage Domain

#### cocktail_analysis

```typescript
{
  type: "cocktail_analysis",
  payload: {
    components: BeverageComponent[],
    iceMeltMl?: number
  }
}
```

### Wine Domain

#### wine_pairing

```typescript
{
  type: "wine_pairing",
  payload: {
    wine: WineProfile,
    dish: DishProfile
  }
}
```

### Finance Domain

#### recipe_cost

```typescript
{
  type: "recipe_cost",
  payload: {
    lines: RecipeCostLine[],
    portions: number
  }
}
```

#### pnl_analysis

```typescript
{
  type: "pnl_analysis",
  payload: {
    pnl: PnLSnapshot
  }
}
```

### Operations Domain

#### hospitality_load

```typescript
{
  type: "hospitality_load",
  payload: {
    pattern: SeatingPattern
  }
}
```

#### banquet_timing

```typescript
{
  type: "banquet_timing",
  payload: {
    plan: BanquetCoursePlan,
    targetMinutes: number
  }
}
```

### Inventory Domain

#### inventory_reorder

```typescript
{
  type: "inventory_reorder",
  payload: {
    items: InventoryItemSnapshot[]
  }
}
```

### Labor Domain

#### labor_plan

```typescript
{
  type: "labor_plan",
  payload: {
    plan: LaborPlanInput
  }
}
```

### Forecasting Domain

#### forecast

```typescript
{
  type: "forecast",
  payload: {
    history: HistoricalDataPoint[],
    horizonDays: number
  }
}
```

### CRM Domain

#### guest_profile

```typescript
{
  type: "guest_profile",
  payload: {
    visits: GuestVisit[]
  }
}
```

## Step 4: Batch Queries

Process multiple queries at once:

```typescript
const { batchQuery } = useEchoUnifiedBrain();

const results = await batchQuery([
  {
    type: "flavor_balance",
    payload: {
      /* ... */
    },
  },
  {
    type: "recipe_cost",
    payload: {
      /* ... */
    },
  },
  {
    type: "wine_pairing",
    payload: {
      /* ... */
    },
  },
]);

// Results is an array of UnifiedResponse[]
```

## Step 5: Integration with Recipe Import

When importing recipes from PDFs or user uploads, automatically populate the knowledge codex:

```typescript
import type { KnowledgeItem } from "@/echo/codex/KnowledgeCodex";

async function importRecipeAndTrain(recipe: Recipe) {
  // 1. Store recipe
  await storeRecipe(recipe);

  // 2. Extract knowledge from recipe
  const knowledgeItems: KnowledgeItem[] = [];

  // Extract ingredients as IngredientKnowledge items
  for (const ingredient of recipe.ingredients) {
    knowledgeItems.push({
      id: `ingredient-${ingredient.id}`,
      domain: "culinary",
      type: "ingredient",
      title: ingredient.name,
      description: `${ingredient.name} - ${ingredient.amount}`,
      content: ingredient.description || "",
      tags: [ingredient.category, "imported"],
      confidenceScore: 0.9,
      sources: [recipe.source],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relatedItems: [],
      properties: {
        // Populate from recipe metadata
      },
    });
  }

  // Extract techniques
  const techniques = extractTechniquesFromRecipe(recipe);
  for (const technique of techniques) {
    knowledgeItems.push({
      // ... technique knowledge item
    });
  }

  // 3. Store knowledge in Pinecone or graph DB
  await storeKnowledgeItems(knowledgeItems);

  // 4. Update Knowledge Universe Dashboard
  // This happens automatically as the dashboard syncs with the knowledge store
}
```

## Step 6: Real-Time Knowledge Sync

The Knowledge Universe Dashboard automatically updates as new knowledge is added:

```typescript
// In KnowledgeUniverseDashboard component
useEffect(() => {
  const interval = setInterval(() => {
    // Fetch updated knowledge stats
    fetchKnowledgeStats().then(setStats);
  }, 5000); // Poll every 5 seconds

  return () => clearInterval(interval);
}, []);
```

## Next Steps

1. **Codex Population**: As recipes are imported, automatically extract and store knowledge
2. **Training Sessions**: Use Echo-OpenAI dialogue to continuously learn
3. **Knowledge Graph**: Build connections between ingredients, techniques, flavors
4. **Advanced Reasoning**: Use engines to make intelligent suggestions across domains
5. **Forecasting**: Use historical data to predict demand, costs, labor needs

## Troubleshooting

### Engine not returning results

- Check that your payload matches the required fields
- Verify data types match interface definitions
- Check `/api/echo-unified/capabilities` for exact requirements

### Knowledge not persisting

- Ensure knowledge items are stored in Pinecone or graph DB
- Verify knowledge codex schema is correct
- Check knowledge ingestion pipeline

### Dashboard not updating

- Verify knowledge stats endpoint is returning data
- Check that knowledge items have `createdAt` and `updatedAt` timestamps
- Ensure dashboard polling interval is appropriate

## Performance Optimization

- **Batch queries** for multiple analyses
- **Cache** frequently accessed knowledge items
- **Index** Pinecone vectors by domain for faster search
- **Lazy load** domain-specific knowledge

## Security

- All knowledge items should be validated before storage
- Implement access controls for sensitive financial data
- Audit trail for knowledge modifications
- Version control for codex schemas

---

The Echo Knowledge Universe is now ready to power intelligent decision-making across your entire hospitality operation!
