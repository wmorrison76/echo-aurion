# Flavor Analysis Auto-Trigger Examples

**Phase 5: Real-time Analysis on Recipe Changes**

---

## Quick Start

### Example 1: Basic Auto-Trigger

Automatically analyze whenever recipe changes:

```tsx
import { useRecipeFlavorAnalysis } from "@/hooks/useFlavorAnalysisAutoTrigger";
import { FlavorAnalysisRecipePanel } from "@/components/flavor-analysis";

export function RecipeEditor() {
  const [recipe, setRecipe] = useState(null);

  const { analysis, isLoading, isSaved, changeType } = useRecipeFlavorAnalysis(
    recipe,
    { autoAnalyze: true, debounceMs: 1000 }
  );

  return (
    <div className="space-y-4">
      {/* Recipe editing form */}
      <RecipeForm recipe={recipe} onChange={setRecipe} />

      {/* Status indicators */}
      {changeType === "modified" && (
        <div className="text-amber-600">Recipe modified, analyzing...</div>
      )}

      {isLoading && <div>Running flavor analysis...</div>}

      {/* Flavor analysis display */}
      {analysis && <FlavorAnalysisRecipePanel recipe={recipe} show={true} />}
    </div>
  );
}
```

### Example 2: Save/Modify/Duplicate Tracking

Track changes and trigger analysis:

```tsx
import { useRecipeChangeTracking } from "@/hooks/useFlavorAnalysisAutoTrigger";
import { Button } from "@/components/ui/button";

export function RecipeManager() {
  const [recipe, setRecipe] = useState(null);

  const { isSaved, changeType, onSave, onModify, onDuplicate } =
    useRecipeChangeTracking(recipe);

  const handleSave = async () => {
    // Save to database
    await saveRecipeToDatabase(recipe);
    // Trigger analysis
    onSave();
  };

  const handleDuplicate = async () => {
    const duplicated = { ...recipe, id: generateId() };
    setRecipe(duplicated);
    // Trigger analysis for duplicated recipe
    onDuplicate();
  };

  return (
    <div>
      <input
        value={recipe?.name}
        onChange={(e) => {
          setRecipe({ ...recipe, name: e.target.value });
          onModify();
        }}
      />

      <div className="flex gap-2">
        <Button 
          onClick={handleSave}
          disabled={isSaved}
        >
          Save Recipe
        </Button>

        <Button onClick={handleDuplicate}>
          Duplicate Recipe
        </Button>
      </div>

      {/* Change status */}
      {changeType === "modified" && <span>Modified - unsaved changes</span>}
      {changeType === "saved" && <span>✓ Saved successfully</span>}
      {changeType === "duplicated" && <span>✓ Recipe duplicated</span>}
    </div>
  );
}
```

### Example 3: Combined Usage

Full integration with change tracking + analysis:

```tsx
import { useRecipeFlavorAnalysis } from "@/hooks/useFlavorAnalysisAutoTrigger";
import { FlavorAnalysisRecipePanel } from "@/components/flavor-analysis";
import { Button } from "@/components/ui/button";

export function ComprehensiveRecipeEditor() {
  const [recipe, setRecipe] = useState(null);

  const {
    // Flavor analysis
    analysis,
    isLoading: isAnalyzing,
    error: analysisError,
    manualTrigger,

    // Change tracking
    isSaved,
    changeType,
    onSave,
    onModify,
    onDuplicate,
  } = useRecipeFlavorAnalysis(recipe, {
    autoAnalyze: true,
    debounceMs: 800,
  });

  const handleRecipeChange = (field, value) => {
    setRecipe({ ...recipe, [field]: value });
    onModify();
  };

  const handleSave = async () => {
    try {
      await fetch("/api/recipes", {
        method: "POST",
        body: JSON.stringify(recipe),
      });
      onSave();
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  const handleDuplicate = async () => {
    const copy = { ...recipe, id: null, name: recipe.name + " (Copy)" };
    setRecipe(copy);
    onDuplicate();
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Recipe Editor */}
      <div className="col-span-1 space-y-4">
        <h2 className="text-xl font-bold">Recipe Editor</h2>

        <input
          value={recipe?.name || ""}
          onChange={(e) => handleRecipeChange("name", e.target.value)}
          placeholder="Recipe name"
          className="w-full border rounded p-2"
        />

        {/* Ingredients */}
        <div className="space-y-2">
          <h3 className="font-semibold">Ingredients</h3>
          {recipe?.ingredients?.map((ing, i) => (
            <input
              key={i}
              value={ing.name}
              onChange={(e) => {
                const newIngredients = [...recipe.ingredients];
                newIngredients[i].name = e.target.value;
                handleRecipeChange("ingredients", newIngredients);
              }}
              placeholder="Ingredient name"
              className="w-full border rounded p-1 text-sm"
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleSave}
            disabled={isSaved}
            className="flex-1"
          >
            Save
          </Button>
          <Button 
            onClick={handleDuplicate}
            className="flex-1"
          >
            Duplicate
          </Button>
        </div>

        {/* Status */}
        <div className="text-sm">
          {changeType === "modified" && (
            <span className="text-amber-600">⚠️ Unsaved changes</span>
          )}
          {changeType === "saved" && (
            <span className="text-green-600">✓ Saved successfully</span>
          )}
        </div>
      </div>

      {/* Flavor Analysis */}
      <div className="col-span-2">
        {isAnalyzing && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin">⏳</div>
            <p>Analyzing flavor profile...</p>
          </div>
        )}

        {analysisError && (
          <div className="text-red-600">
            Analysis error: {analysisError.message}
          </div>
        )}

        {analysis && (
          <FlavorAnalysisRecipePanel
            recipe={recipe}
            show={true}
            onOptimize={(optimized) => {
              console.log("User wants to optimize:", optimized);
              // Phase 6: Show optimization UI
            }}
          />
        )}

        <Button onClick={manualTrigger} className="mt-4 w-full">
          🔄 Re-analyze
        </Button>
      </div>
    </div>
  );
}
```

### Example 4: Menu Composition with Flavor Balance

Use auto-trigger in menu design to check flavor balance across dishes:

```tsx
import { useRecipeFlavorAnalysis } from "@/hooks/useFlavorAnalysisAutoTrigger";

export function MenuDesignWithFlavorBalance() {
  const [menu, setMenu] = useState({
    appetizer: null,
    main: null,
    dessert: null,
  });

  // Analyze each course
  const appetizerAnalysis = useRecipeFlavorAnalysis(menu.appetizer);
  const mainAnalysis = useRecipeFlavorAnalysis(menu.main);
  const dessertAnalysis = useRecipeFlavorAnalysis(menu.dessert);

  // Check for flavor redundancy
  const checkFlavorRedundancy = () => {
    if (!appetizerAnalysis.analysis || !mainAnalysis.analysis) return null;

    const appFlavors = appetizerAnalysis.analysis.fingerprint.attributes;
    const mainFlavors = mainAnalysis.analysis.fingerprint.attributes;

    // Compare flavor profiles
    const redundancy = appFlavors
      .filter(attr => {
        const mainAttr = mainFlavors.find(m => m.id === attr.id);
        return mainAttr && attr.intensity > 0.6 && mainAttr.intensity > 0.6;
      })
      .map(attr => attr.label);

    return redundancy.length > 0 ? redundancy : null;
  };

  const redundantFlavors = checkFlavorRedundancy();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Menu Composition</h2>

      {redundantFlavors && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <p className="font-semibold">⚠️ Flavor Redundancy Detected</p>
          <p className="text-sm">
            Both appetizer and main course are too similar in: {redundantFlavors.join(", ")}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Consider adjusting one course to create better progression.
          </p>
        </div>
      )}

      {/* Course editors */}
      <div className="grid grid-cols-3 gap-4">
        {/* Appetizer */}
        <div>
          <h3 className="font-semibold mb-2">Appetizer</h3>
          <RecipeSelector
            recipe={menu.appetizer}
            onSelect={(r) => setMenu({ ...menu, appetizer: r })}
          />
          {appetizerAnalysis.analysis && (
            <div className="mt-2 text-xs text-gray-600">
              Profile: {appetizerAnalysis.analysis.fingerprint.descriptors.join(", ")}
            </div>
          )}
        </div>

        {/* Main */}
        <div>
          <h3 className="font-semibold mb-2">Main Course</h3>
          <RecipeSelector
            recipe={menu.main}
            onSelect={(r) => setMenu({ ...menu, main: r })}
          />
          {mainAnalysis.analysis && (
            <div className="mt-2 text-xs text-gray-600">
              Profile: {mainAnalysis.analysis.fingerprint.descriptors.join(", ")}
            </div>
          )}
        </div>

        {/* Dessert */}
        <div>
          <h3 className="font-semibold mb-2">Dessert</h3>
          <RecipeSelector
            recipe={menu.dessert}
            onSelect={(r) => setMenu({ ...menu, dessert: r })}
          />
          {dessertAnalysis.analysis && (
            <div className="mt-2 text-xs text-gray-600">
              Profile: {dessertAnalysis.analysis.fingerprint.descriptors.join(", ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Hook Reference

### `useFlavorAnalysisAutoTrigger(recipe, options)`

Auto-triggers flavor analysis with debouncing and caching.

**Options:**
- `enabled` (boolean, default: true) - Enable/disable auto-analysis
- `debounceMs` (number, default: 1000) - Debounce delay in milliseconds
- `cacheKey` (string) - Custom cache key (auto-generated from recipe if not provided)
- `apiUrl` (string, default: "/api") - API base URL
- `onAnalysisComplete` (function) - Callback when analysis completes
- `onError` (function) - Callback on error

**Returns:**
- `analysis` - Latest flavor analysis result
- `isLoading` - Analysis in progress
- `error` - Error if analysis failed
- `manualTrigger` - Function to manually trigger analysis
- `clearCache` - Function to clear the cache
- `cacheSize` - Number of cached analyses

### `useRecipeChangeTracking(recipe)`

Tracks recipe save, modify, and duplicate events.

**Returns:**
- `isSaved` - Whether recipe is saved
- `changeType` - Type of last change ("saved", "modified", "duplicated")
- `onSave()` - Call when recipe is saved
- `onModify()` - Call when recipe is modified
- `onDuplicate()` - Call when recipe is duplicated

### `useRecipeFlavorAnalysis(recipe, options)`

Combined hook with both auto-analysis and change tracking.

**Returns:** All properties from both hooks above

---

## Integration Checklist

- [ ] Use `useRecipeFlavorAnalysis` in recipe editor components
- [ ] Call `onSave()` after successful database save
- [ ] Call `onModify()` on input changes (with debouncing)
- [ ] Call `onDuplicate()` when duplicating recipes
- [ ] Display `isSaved` indicator in UI
- [ ] Show `changeType` feedback to user
- [ ] Render `FlavorAnalysisRecipePanel` when analysis is available
- [ ] Handle `error` state with user-friendly message

