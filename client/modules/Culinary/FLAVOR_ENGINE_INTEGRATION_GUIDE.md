# EchoAi³ Flavor Engine - Integration Guide

**Status:** ✅ Ready for Integration (Phase 4)

---

## Quick Start

The Flavor Engine is now fully implemented and ready to be integrated into your existing UI panels.

### What's Available

**Service Layer (Zero UI Dependencies):**
- `/shared/echo/flavor-engine.ts` - Pure computation module
- `POST /api/echo/flavor/analyze` - Recipe analysis endpoint
- `POST /api/echo/flavor/beverage` - Beverage analysis endpoint
- `POST /api/echo/flavor/pair` - Food + beverage pairing endpoint

**UI Components (React):**
- `FlavorAnalysisRecipePanel` - All-in-one tabbed interface (recommended for integration)
- `RadarChartFlavorFingerprint` - Individual radar chart
- `FlavorPleasureCurveChart` - Individual pleasure curve chart
- `IngredientNetworkGraph` - Individual ingredient network graph
- `EchoFlavorSuggestionsPanel` - Individual suggestions panel

---

## Integration Patterns

### Pattern 1: Quick Integration (Recommended for Phase 4)

Add the all-in-one component to your panel:

```tsx
import { FlavorAnalysisRecipePanel } from "@/components/flavor-analysis";

export function YourRecipePanel() {
  const [recipe, setRecipe] = useState(null);

  return (
    <div>
      {/* Your existing recipe form/display */}
      
      {/* Add Flavor Analysis */}
      <FlavorAnalysisRecipePanel
        recipe={recipe}
        show={true}
        onOptimize={(recipe) => {
          // Handle optimization request (Phase 6)
          console.log("User wants to optimize:", recipe);
        }}
      />
    </div>
  );
}
```

### Pattern 2: Individual Components (Advanced)

Use specific components in different sections:

```tsx
import {
  RadarChartFlavorFingerprint,
  FlavorPleasureCurveChart,
  IngredientNetworkGraph,
  EchoFlavorSuggestionsPanel,
} from "@/components/flavor-analysis";

export function AdvancedRecipePanel() {
  const recipeJson = JSON.stringify(recipe);

  return (
    <div className="grid grid-cols-2 gap-4">
      <RadarChartFlavorFingerprint recipeJson={recipeJson} />
      <FlavorPleasureCurveChart recipeJson={recipeJson} />
      <IngredientNetworkGraph recipeJson={recipeJson} />
      <EchoFlavorSuggestionsPanel recipeJson={recipeJson} />
    </div>
  );
}
```

---

## Integration Points

### 1. EchoChefPanel Integration

**Location:** `client/echo/ui/EchoChefPanel.tsx`

**When to Show:**
- When a recipe is generated or selected
- After user clicks "View Details" or "Preview"

**Implementation:**

```tsx
import { FlavorAnalysisRecipePanel } from "@/components/flavor-analysis";

export const EchoChefPanel = ({ recipeDraft, ...props }) => {
  return (
    <div>
      {/* Existing chef panel content */}
      
      {recipeDraft && (
        <FlavorAnalysisRecipePanel 
          recipe={recipeDraft}
          show={true}
        />
      )}
    </div>
  );
};
```

### 2. AddRecipeToolsPanel Integration

**Location:** `client/components/AddRecipeToolsPanel.tsx`

**When to Show:**
- After recipe is loaded/created
- In a "Recipe Intelligence" tab
- After user saves recipe

**Implementation:**

```tsx
import { FlavorAnalysisRecipePanel } from "@/components/flavor-analysis";

export function AddRecipeToolsPanel({ recipe, ...props }) {
  const [showFlavorAnalysis, setShowFlavorAnalysis] = useState(false);

  return (
    <div>
      {/* Existing tools */}
      
      <Button onClick={() => setShowFlavorAnalysis(!showFlavorAnalysis)}>
        🔮 Show Flavor Intelligence
      </Button>

      {showFlavorAnalysis && (
        <FlavorAnalysisRecipePanel recipe={recipe} show={true} />
      )}
    </div>
  );
}
```

### 3. MenuDesignStudio Integration

**Location:** `client/components/MenuDesignStudio/MenuDesignStudio.tsx`

**When to Show:**
- When menu is being composed
- For each dish on the menu
- In a "Menu Balance" analysis view

**Implementation:**

```tsx
import { FlavorAnalysisRecipePanel } from "@/components/flavor-analysis";

export function MenuDesignStudio({ menu, selectedDish, ...props }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Menu editor */}
      <div className="col-span-2">
        {/* Your menu editor UI */}
      </div>

      {/* Flavor Analysis for selected dish */}
      <div className="col-span-1">
        {selectedDish && (
          <FlavorAnalysisRecipePanel
            recipe={selectedDish}
            show={true}
            onOptimize={(dish) => {
              // Update menu with optimized version
            }}
          />
        )}
      </div>
    </div>
  );
}
```

---

## API Usage

All components use these endpoints automatically. You can also call them directly:

### Recipe Analysis

```typescript
const response = await fetch("/api/echo/flavor/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    id: "recipe-123",
    name: "Lemon Butter Pasta",
    servings: 4,
    ingredients: [
      { name: "lemon", amount: 100, tags: ["acid", "fresh"] },
      { name: "butter", amount: 50, fatPercent: 80 }
    ],
    techniqueSteps: [
      { technique: "seared", temperatureC: 180, durationSeconds: 300 }
    ]
  })
});

const result = await response.json();
// result.analysis contains: fingerprint, pleasureCurve, ingredientNetwork, suggestions
```

### Beverage Analysis

```typescript
const response = await fetch("/api/echo/flavor/beverage", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Margarita",
    servingSize: 200,
    components: [
      { name: "tequila", percentageByVolume: 40, tags: ["spirit", "spicy"] },
      { name: "lime_juice", percentageByVolume: 20, tags: ["acid", "fresh"] },
      { name: "triple_sec", percentageByVolume: 20, tags: ["sweet", "aromatic"] }
    ],
    temperature: "chilled"
  })
});

const result = await response.json();
// result contains: analysis, beverageMetadata
```

### Pairing Analysis

```typescript
const response = await fetch("/api/echo/flavor/pair", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    pairing: {
      type: "wine-food",
      recipe: { /* recipe data */ },
      beverage: { /* beverage data */ }
    }
  })
});

const result = await response.json();
// result.compatibility scores: overall, acidCut, tanninProtein, sweetSpice, flavorProfile
```

---

## Features By Phase

### Phase 4 (Current): Integration Ready ✅
- ✅ Service module (`flavor-engine.ts`)
- ✅ API endpoints (analyze, beverage, pair)
- ✅ 4 visualization components
- ✅ All-in-one integration panel
- ✅ Ready to add to existing UIs

### Phase 5: Auto-Triggers (Next)
- Automatic analysis when recipe is saved
- Real-time updates as recipe changes
- Cached results for performance

### Phase 6: Optimization UI (Planned)
- "Ask Echo to Optimize This Dish" button
- Side-by-side before/after comparison
- AI-generated improvement suggestions

---

## Component Props Reference

### FlavorAnalysisRecipePanel

```typescript
interface FlavorAnalysisRecipePanelProps {
  recipe: any;                    // Recipe object (required)
  show?: boolean;                 // Default: true
  onOptimize?: (recipe: any) => void;  // Callback for optimization
  apiUrl?: string;                // Default: "/api"
}
```

### Individual Components

All individual components accept:

```typescript
interface ComponentProps {
  recipeJson?: string;            // JSON string of recipe data
  apiUrl?: string;                // Default: "/api"
}
```

---

## Example: Complete Integration

Here's a complete example showing integration into a recipe editor:

```tsx
import * as React from "react";
const { useState } = React;

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlavorAnalysisRecipePanel } from "@/components/flavor-analysis";

export function RecipeEditor() {
  const [recipe, setRecipe] = useState({
    id: "new-recipe",
    name: "New Dish",
    servings: 4,
    ingredients: [
      { name: "butter", amount: 50, fatPercent: 80 },
      { name: "lemon", amount: 100, tags: ["acid", "fresh"] },
      { name: "parmesan", amount: 30, tags: ["umami"] }
    ],
    techniqueSteps: [
      { technique: "seared", temperatureC: 180 }
    ]
  });

  const handleOptimize = async (optimizedRecipe) => {
    console.log("Optimizing recipe:", optimizedRecipe);
    // Call AI optimization endpoint (Phase 6)
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="edit" className="w-full">
        <TabsList>
          <TabsTrigger value="edit">Edit Recipe</TabsTrigger>
          <TabsTrigger value="analysis">Flavor Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <Card className="p-6">
            {/* Your recipe editing UI here */}
            <input 
              value={recipe.name}
              onChange={(e) => setRecipe({...recipe, name: e.target.value})}
              placeholder="Dish name"
            />
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <FlavorAnalysisRecipePanel
            recipe={recipe}
            show={true}
            onOptimize={handleOptimize}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Troubleshooting

**Q: Components not loading?**
- Ensure `/api/echo/flavor/analyze` endpoint is running
- Check browser console for CORS errors
- Verify recipe JSON format matches `RecipeAnalysisInput`

**Q: Charts not rendering?**
- Ensure `chart.js` is available (`pnpm install chart.js`)
- Check browser DevTools for console errors
- Verify canvas element is in the DOM

**Q: Slow performance?**
- API calls are cached automatically
- Results are memoized in component state
- Disable real-time updates if analyzing large recipes

---

## Next Steps

### Phase 5: Auto-Triggers
- Add auto-analysis on recipe save
- Real-time updates as user edits

### Phase 6: Optimization
- "Ask Echo to Optimize" button
- Before/after comparison UI
- AI-driven suggestions

---

## Support

- **Service Layer:** `/shared/echo/flavor-engine.ts`
- **API Routes:** `/server/routes/flavor-analysis.ts`
- **Components:** `/client/components/flavor-analysis/`
- **Integration Examples:** This document

For issues or questions, refer to the code comments in each file.

