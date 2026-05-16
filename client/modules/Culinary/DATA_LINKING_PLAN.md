# Data Linking Architecture Plan
## Goal: Minimal movements (1-3 actions) to complete workflows

---

## PHASE 1: Recipe → Ingredient Linking (Foundation)

### Current State
- Recipes have ingredient rows (qty, unit, item, prep, yield, cost)
- Ingredients are just strings, not linked to inventory/suppliers
- No cost tracking across the system

### What We're Building
A unified ingredient management system where:
1. **Recipes reference real inventory items** (not just text strings)
2. **Inline ingredient selection** in recipe editor (1-click lookup)
3. **Instant cost calculation** from linked supplier data
4. **Cost per serving** visible in recipe card

### Data Model Changes
```typescript
// Current IngredientRow (in client/types/ingredients.ts)
type IngredientRow = {
  qty: string;
  unit: string;
  item: string;           // ← JUST A STRING
  prep: string;
  yield: string;
  cost: string;           // ← MANUAL ENTRY
  costPerUnit: number | null;
  supplierId: string | null;
  supplierName: string | null;
  supplierSku: string | null;
};

// Enhanced IngredientRow (NEW)
type IngredientRow = {
  qty: string;
  unit: string;
  item: string;
  prep: string;
  yield: string;
  cost: string;
  
  // NEW: Link to inventory
  ingredientId: string | null;      // ← Links to InventoryItem
  costPerUnit: number | null;       // ← Auto-calculated from supplier
  supplierId: string | null;        // ← From supplier catalog
  supplierName: string | null;
  supplierSku: string | null;
  
  // NEW: Cost tracking
  totalCost: number | null;         // qty * costPerUnit
  costVariance: number | null;      // price diff vs last order
  costPerServing: number | null;    // totalCost / servings
};
```

### New Data Files to Create
1. **inventoryItems.ts** - Master ingredient list
   - Maps supplier SKUs to canonical ingredient names
   - Tracks cost history and variance
   
2. **ingredientMappings.ts** - Recipe text → Inventory Item
   - Fuzzy match recipe ingredients to inventory
   - Handle common variations (e.g., "carrots" → "heirloom-carrot")

### UI Components (1-3 movement rule)
1. **IngredientSelector** (popup/dropdown)
   - Search by name/supplier
   - Show cost per unit
   - 1-click selection
   
2. **IngredientRow Component** (inline cost display)
   - Show linked supplier & SKU
   - Display calculated cost
   - Quick edit supplier link

3. **Recipe Cost Summary** (visible in recipe card)
   - Total recipe cost
   - Cost per serving
   - Cost variance vs baseline

---

## PHASE 2: Ingredient → Purchasing Linking

### Current State
- Purchasing has supplier catalog (SKU → ingredient → price)
- Ready-made items track receiving
- No link back to recipe ingredients

### What We're Building
One-click ordering directly from recipe context:
1. **Recipe ingredient → Order action** (Cmd to create PO)
2. **Inventory depletion tracking** (forecast when you'll run out)
3. **Auto-suggest reorder** based on recipe usage
4. **Order management** without leaving recipe view

### New Data
```typescript
type InventoryItem = {
  id: string;
  canonicalName: string;
  supplierCatalog: {
    supplierId: string;
    sku: string;
    packSize: number;
    packUnit: string;
    pricePerPack: number;
    unitPrice: number;
    leadTimeDays: number;
  }[];
  
  // Usage tracking
  recipes: Array<{
    recipeId: string;
    recipeTitle: string;
    usageQty: number;
    usageUnit: string;
  }>;
  
  // Inventory state
  currentStock: number;
  stockUnit: string;
  reorderPoint: number;
  lastOrderedAt: number;
  costHistory: Array<{
    date: number;
    supplierId: string;
    costPerUnit: number;
  }>;
};
```

### UI Components
1. **QuickOrderPanel** (inline with recipe)
   - See ingredient usage across recipes
   - Auto-calculated recommended order qty
   - One-click add to PO
   
2. **InventoryStatusBar** (per ingredient in recipe)
   - Stock level
   - Days until reorder needed
   - Supplier lead time warning
   
3. **Cost Variance Alert**
   - Show price changes since last order
   - Alert if cost variance > 10%

---

## PHASE 3: Full Integration (Connect Everything)

### Recipe → Ingredient → Purchasing → Cost Analysis

**The Power User Workflow (1-3 movements):**

1. **Open recipe** → See ingredient costs updated live
2. **Edit ingredient** → Search + select from inventory (1 click)
3. **Check purchasing** → See all recipe ingredients with reorder flags
4. **Create order** → One button to create PO for all flagged items

**Data Flows:**
```
Recipe.ingredients[] 
  → InventoryItem (linked)
    → SupplierCatalog (current price, SKU, leadTime)
      → Cost calculation (qty × costPerUnit = totalCost)
        → Cost per serving (totalCost ÷ servings)
          → Cost variance (current vs historical)
            → Margin analysis (recipe cost / selling price)
```

### Cost Analysis Component
Shows in recipe card, expandable in modal:
- **Recipe Total Cost**: Sum of all ingredient costs
- **Cost per Serving**: Total ÷ number of servings
- **Cost Variance**: % change vs last 5 orders
- **Supplier Concentration**: Which suppliers you rely on
- **Lead Time Risk**: Days until you run out at current usage
- **Margin**: (Menu price - recipe cost) / menu price

---

## Implementation Order

### Week 1: Foundation
1. Create `inventoryItems.ts` with master ingredient list
2. Create `ingredientMappings.ts` for fuzzy matching
3. Update `IngredientRow` type to support linking
4. Build `IngredientSelector` component

### Week 2: Display & Calculation
1. Update recipe editor UI to show ingredient costs
2. Build recipe cost summary component
3. Implement cost per serving calculation
4. Add cost display to recipe cards in search

### Week 3: Purchasing Integration
1. Create `QuickOrderPanel` component
2. Link recipe ingredients to orders
3. Add inventory status indicators
4. Build cost variance tracking

### Week 4: Polish & Testing
1. Implement full cost analysis
2. Add margin calculation
3. Build investor-ready dashboard showing cost breakdown
4. Performance optimization & UI refinement

---

## Success Metrics (for investors)

- ✅ Recipe cost transparency (ingredient-level costing)
- ✅ Supplier consolidation visibility (costs by supplier)
- ✅ Inventory efficiency (reorder automation)
- ✅ Margin analysis (profitability per dish)
- ✅ <3 clicks to create purchase order from recipe

---

## Key Files to Create/Modify

### New Files
- `client/data/inventoryItems.ts` - Master ingredient catalog
- `client/data/ingredientMappings.ts` - Recipe text → inventory fuzzy matching
- `client/components/IngredientSelector.tsx` - Ingredient lookup UI
- `client/components/RecipeCostSummary.tsx` - Cost breakdown display
- `client/components/QuickOrderPanel.tsx` - Quick order from recipe
- `client/hooks/use-recipe-costing.ts` - Cost calculation logic
- `client/hooks/use-ingredient-search.ts` - Fuzzy matching & search

### Modified Files
- `client/types/ingredients.ts` - Add linking fields
- `client/pages/sections/RecipeEditor.tsx` - Integrate ingredient selector
- `client/pages/sections/RecipeInput.tsx` - Show costs inline
- `client/pages/sections/purchasing-receiving/PurchasingReceivingWorkspace.tsx` - Link to recipes
- `shared/recipes.ts` - Update recipe export types

---

## MVP (Minimal Viable Product for testing)

For investor demo, we need:
1. ✅ Recipes with linked ingredients
2. ✅ Cost per ingredient visible
3. ✅ Total recipe cost calculated
4. ✅ Cost per serving shown
5. ✅ Quick purchase order creation
6. ✅ Cost variance tracking

Do NOT need for MVP:
- ⛔ Real supplier API integration (mock data is fine)
- ⛔ Automated reordering
- ⛔ Advanced margin analysis (can be simple)
- ⛔ Sensor integration
