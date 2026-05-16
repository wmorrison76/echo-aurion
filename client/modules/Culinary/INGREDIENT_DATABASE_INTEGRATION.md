# National Ingredient Database Integration

This guide explains how to connect your application to standardized ingredient databases like USDA FoodData Central or Open Food Facts.

## Overview

Your app now supports integration with multiple national/standardized ingredient databases:

1. **USDA FoodData Central** - Official US government nutrition database
2. **Open Food Facts** - Community-driven open database with global coverage
3. **Local Inventory** - Your custom purchasing inventory system

## Database Options

### Option 1: USDA FoodData Central (Recommended)

**Pros:**
- Highest quality, official nutrition data
- Comprehensive coverage of ingredients
- Allergen information included
- Free to use (optional API key for higher limits)

**Cons:**
- US-focused (though global coverage is improving)
- Requires API calls for real-time data

**Setup:**
```typescript
// In your environment configuration
const manager = getIngredientDatabaseManager();
// or with API key for higher rate limits:
const manager = getIngredientDatabaseManager(process.env.REACT_APP_USDA_API_KEY);
```

**Getting a USDA API Key:**
1. Go to https://fdc.nal.usda.gov/api-guide.html
2. Sign up for free
3. Add the key to your `.env` file:
   ```
   REACT_APP_USDA_API_KEY=your_key_here
   ```

### Option 2: Open Food Facts

**Pros:**
- Global coverage
- Community-maintained
- Includes barcode scanning capability
- No API key required

**Cons:**
- Variable data quality (community-driven)
- Less comprehensive nutrition data
- May have fewer professional ingredients

**Setup:**
No configuration needed - it's enabled by default

### Option 3: Local Purchasing Inventory

Your custom inventory system continues to work as before. The fuzzy matching improvements ensure better ingredient matching.

## Integration Points

### In Ingredient Selector

The ingredient selector now supports enriching local inventory items with national database data:

```typescript
// In IngredientSelector.tsx or similar component
import { useIngredientDatabase } from "@/hooks/use-ingredient-database";

function MyComponent() {
  const { search, results, isLoading } = useIngredientDatabase({
    usdaApiKey: process.env.REACT_APP_USDA_API_KEY,
  });

  // Search across both local and national databases
  const handleSearch = async (query: string) => {
    await search(query);
    // Results now include both local and national matches
  };

  return (
    // ... component JSX
  );
}
```

### For Nutrition Label Generation

When generating nutrition labels, you can pull data from standardized sources:

```typescript
import { useIngredientEnrichment } from "@/hooks/use-ingredient-database";

function NutritionLabelComponent({ ingredientName }: { ingredientName: string }) {
  const { enrichedData, isEnriching } = useIngredientEnrichment(ingredientName, {
    enableUSDA: true,
    enableOpenFoodFacts: true,
  });

  if (enrichedData?.nutrition) {
    return <NutritionDisplay data={enrichedData.nutrition} />;
  }

  return <div>Enriching nutrition data...</div>;
}
```

## Data Structure

When you get results from a national database, they follow this structure:

```typescript
interface StandardizedIngredient {
  externalId: string;           // Unique ID in the database
  dataSource: "usda" | "open-food-facts" | "custom";
  commonName: string;           // Primary ingredient name
  scientificName?: string;
  alternateNames?: string[];
  description?: string;
  category?: string;
  nutrition?: {                 // Per 100g (standard)
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
    fiber: number;
    sugar: number;
    sodium: number;
    calcium: number;
    iron: number;
    potassium: number;
  };
  allergens?: string[];         // Array of allergen names
  lastUpdated?: number;         // Timestamp
  dataQuality?: number;         // 0-1 confidence score
}
```

## Linking Local Inventory to National Data

You can create mappings between your local inventory and national database entries:

```typescript
// Create a rich ingredient with both local cost and national nutrition data
const enrichedIngredient = {
  // From your local inventory
  id: "ing-heirloom-carrot",
  canonicalName: "Heirloom carrots, peeled",
  costPerUnit: 1.8,
  supplier: "Sysco",

  // From national database
  nutrition: enrichedData.nutrition,
  allergens: enrichedData.allergens,
  category: enrichedData.foodGroup,
  dataSource: enrichedData.dataSource,
};
```

## Cost Considerations

- **USDA**: Free without API key, recommended 1000 requests/hour. With API key: 3600 requests/hour
- **Open Food Facts**: Free, no limits (community-powered)
- **Both services cache data locally** to minimize API calls

## Caching Strategy

The system automatically caches database results to minimize API calls:

```typescript
const manager = getIngredientDatabaseManager();

// First search - makes API call
const results = await manager.search("heirloom carrot");

// Subsequent searches - uses cache
const cached = manager.getFromCache("heirloom carrot");

// Clear cache if needed
manager.clearCache();
```

## Fallback Behavior

If the national database is unavailable or slow:
1. Local fuzzy matching will still work
2. Your purchasing inventory will still function
3. Nutrition audit will flag missing nutrition data
4. No user-facing errors

## Example: Complete Integration

```typescript
import { useIngredientDatabase } from "@/hooks/use-ingredient-database";

export function RecipeIngredientRow({ ingredient }: Props) {
  // Local fuzzy matching for cost
  const { calculateCost } = useIngredientCostCalculator();

  // National database for nutrition
  const { search: searchNational, results: nationalMatches } = useIngredientDatabase({
    usdaApiKey: process.env.REACT_APP_USDA_API_KEY,
  });

  return (
    <div>
      {/* Local ingredient selector with cost calculation */}
      <IngredientSelector value={ingredient.id} onSelect={handleSelect} />

      {/* Cost from local purchasing inventory */}
      <span>${ingredient.cost}</span>

      {/* Auto-enrich with national nutrition data */}
      {ingredient.nutrition === null && (
        <button onClick={() => searchNational(ingredient.name)}>
          Load nutrition from USDA
        </button>
      )}

      {/* Display enriched nutrition */}
      {nationalMatches.length > 0 && (
        <NutritionBadge data={nationalMatches[0].nutrition} />
      )}
    </div>
  );
}
```

## Environment Variables

Add these to your `.env` file to enable national database integration:

```bash
# USDA FoodData Central (optional API key for higher rate limits)
REACT_APP_USDA_API_KEY=your_api_key_here

# Feature flags
REACT_APP_ENABLE_USDA_DATABASE=true
REACT_APP_ENABLE_OPEN_FOOD_FACTS=true
```

## Troubleshooting

### "No ingredients found" in national database
- Try different search terms (use common names)
- Check if the ingredient is available in your selected database
- Fall back to local inventory matching

### Slow searches
- Results are cached locally after first search
- Clear old cache with `manager.clearCache()`
- USDA has rate limits - consider pre-loading common ingredients

### Missing nutrition data
- Some ingredients may not have complete nutrition data
- Open Food Facts has less comprehensive data than USDA
- Your audit system flags incomplete nutrition information

## Next Steps

1. **Set up USDA API key** (optional but recommended):
   - Visit https://fdc.nal.usda.gov/api-guide.html
   - Sign up for free
   - Add key to `.env` file

2. **Test the integration**:
   - Try searching for an ingredient
   - Verify nutrition data is loading
   - Check performance with typical search terms

3. **Customize mappings**:
   - Create local-to-national mappings for your common ingredients
   - Build a lookup table for faster matching
   - Update as your recipes evolve

4. **Monitor and optimize**:
   - Track which ingredients are frequently searched
   - Pre-cache popular ingredients
   - Adjust fallback behavior as needed
