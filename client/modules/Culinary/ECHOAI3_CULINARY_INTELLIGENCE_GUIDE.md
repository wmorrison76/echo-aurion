# EchoAi³ Culinary Intelligence Module

## Master Integration Guide for LUCCCA

### 📋 Overview

EchoAi³ is a complete culinary intelligence system that:

- **Learns from textbooks/PDFs** you import (via existing Recipe PDF Import system)
- **Understands recipes** through structured codex metadata (ingredients, techniques, flavors, complexity)
- **Suggests variations** based on dietary constraints and service context
- **Generates new concepts** by reasoning over your recipe knowledge base

### 🏗️ Architecture

```
PDF/Textbook Import
        ↓
(Recipe detection & multi-page merging)
        ↓
User Reviews & Selects Recipes
        ↓
EchoAi³ Training API
        ↓
(Generates embedding + Codex metadata mapping)
        ↓
Pinecone / pgvector Vector Store
        ↓
EchoChefBrain (Suggestion Engine)
        ↓
User Queries → /api/echo-chef → Suggestions (recipes, variations, concepts)
```

### 📦 Module Structure

```
client/echo/
  ├─ codex/                          # Golden Culinary Knowledge Schemas
  │  ├─ ingredientSchema.ts
  │  ├─ techniqueSchema.ts
  │  ├─ recipeSchema.ts
  │  ├─ flavorSchema.ts
  │  ├─ nutritionSchema.ts
  │  ├─ safetySchema.ts
  │  └─ index.ts
  │
  ├─ services/                        # Pinecone Integration & Vector Store
  │  ├─ pineconeClient.ts
  │  ├─ recipeVectorStore.ts
  │  ├─ recipeCodexService.ts
  │  └─ index.ts
  │
  ├─ brain/                           # Chef Brain Logic
  │  ├─ echoChefBrain.ts
  │  └─ index.ts
  │
  └─ ui/                              # Builder-Ready Components
     ├─ EchoChefPanel.tsx
     └─ index.ts

client/api/
  └─ echo-chef.ts                    # API Endpoint for Chef Brain

client/lib/
  ├─ recipe-codex-mapper.ts          # Maps recipes → Codex metadata
  ├─ pinecone-recipe-knowledge.ts    # Existing: KB storage & retrieval
  ├─ echo-knowledge-retrieval.ts     # Existing: Hybrid search logic
  └─ [other utilities]

client/hooks/
  └─ use-echo-training.ts            # Hook to train Echo with recipes

server/lib/
  ├─ vector-engine.ts                # Existing: Pinecone/pgvector abstraction
  ├─ pinecone-service.ts             # Existing: Pinecone implementation
  ├─ pgvector-service.ts             # Existing: Supabase pgvector implementation
  └─ echo-chef-embedding.ts          # Uses existing vector engine

server/routes/
  ├─ echo-training.ts                # NEW: Training storage endpoints
  ├─ vector-recipes.ts               # Existing: Vector search API
  └─ [other routes]

server/index.ts                       # Wired to include echo-training router
```

### 🔌 Integration Points

#### 1. **PDF Import → EchoAi³ Training**

When recipes are imported from a PDF:

```typescript
// In RecipeImportSelectionModal or similar component
import { useEchoTraining } from "@/hooks/use-echo-training";

const { trainWithRecipes } = useEchoTraining();

// After user selects recipes from PDF...
const results = await trainWithRecipes(
  selectedRecipes,
  "The Art of French Cooking",
);
// → Recipes stored in Pinecone with full codex metadata
// → Available for EchoChefBrain suggestions
```

#### 2. **Recipe → Codex Metadata Mapping**

```typescript
import { mapImportedRecipeToCodex } from "@/lib/recipe-codex-mapper";

const recipe = {
  id: "recipe-42",
  title: "Coq au Vin",
  ingredients: ["chicken", "wine", "mushrooms", ...],
  instructions: [...],
  cuisine: "French",
  course: "Entree",
  difficulty: "Advanced",
  // ...
};

const codexMetadata = mapImportedRecipeToCodex(recipe);
// → Automatically detects:
//   - complexity: 4/5 (from "Advanced" + cooking time)
//   - techniques: ["braise", "sear"]
//   - allergens: ["alcohol", "dairy"]
//   - flavorProfile: ["rich", "earthy", "herbaceous"]
//   - etc.
```

#### 3. **Vector Storage with Codex Metadata**

```
POST /api/echo-training/store-recipe
{
  "recipe": { /* imported recipe */ },
  "codexMetadata": { /* detected/enriched metadata */ },
  "bookName": "The Art of French Cooking"
}
```

Response:

```json
{
  "success": true,
  "recipeId": "recipe-42",
  "message": "Recipe stored and indexed for EchoChefBrain suggestions"
}
```

#### 4. **User Query → Chef Brain Suggestions**

```typescript
import { EchoChefPanel } from "@/echo/ui";

// In any Builder panel or module
<EchoChefPanel apiEndpoint="/api/echo-chef" />
```

User enters:

```
"I need a gluten-free brunch entrée for 150 people, holds well in a hot box"
```

Flow:

1. Panel sends to `/api/echo-chef`
2. API generates embedding of user prompt
3. EchoChefBrain searches Pinecone using RecipeCodexService
4. Returns:
   - **Top 3 existing recipes** that match
   - **3 variations** with dietary/service adjustments
   - **1 new concept** seeded from best match

```json
[
  {
    "type": "existing_recipe",
    "title": "Vegetable Terrine",
    "description": "Aligns with gluten-free requirement and holds well...",
    "baseRecipe": {
      /* full metadata */
    }
  },
  {
    "type": "variation",
    "title": "Coq au Vin – Chef Echo Variation",
    "recommendedChanges": [
      "Verify wine-based sauce is gluten-free",
      "Consider batch poaching instead of braising for easier holding"
    ]
  },
  {
    "type": "new_concept",
    "title": "Concept: French-Inspired Vegetable Galantine",
    "description": "Using patterns from similar recipes...",
    "flavorBalanceHint": {
      /* flavor targets */
    },
    "serviceNotes": "Works for banquet plating..."
  }
]
```

### 🎯 Key Features

#### **1. Hybrid Knowledge Retrieval** (Existing)

- First checks imported recipes (Pinecone KB)
- If confidence < 0.65, falls back to OpenAI
- Saves 40-60% on API costs

#### **2. Intelligent Recipe Detection** (Existing)

- Multi-page recipe merging
- Continuation marker detection
- Ingredient/instruction separation
- Source tracking (book name, page number)

#### **3. Codex Metadata Enrichment** (NEW)

- Auto-detects recipe complexity
- Identifies cooking techniques
- Extracts allergen information
- Infers flavor profile
- Determines service context

#### **4. Chef Brain Reasoning** (NEW)

- Semantic search via Pinecone
- Dietary constraint filtering
- Allergen avoidance
- Service-context matching
- Variation generation with specific adjustments

### 📚 Example Workflow: Training Echo with "The Art of French Cooking"

**Step 1: Import PDF**

```
Recipe Search → Library (Book PDF) Import → Select "The Art of French Cooking.pdf"
→ System scans pages → Finds 47 recipes
```

**Step 2: Review Recipes**

```
Click yellow "Train Echo" button
→ Modal shows all 47 recipes
→ User selects favorites or clicks "Select All"
```

**Step 3: Echo Gets Trained**

```
Click "Import" button
→ Hook calls trainWithRecipes(recipes, "The Art of French Cooking")
→ Each recipe:
   • Gets codex metadata (complexity, techniques, allergens, flavors)
   • Generates embedding via server-side vector engine
   • Stores in Pinecone with full metadata
```

**Step 4: Echo Can Now Suggest**

```
User asks: "French soup for vegetarian customers"
→ EchoChefBrain queries Pinecone
→ Finds: "Vichyssoise", "French Onion Soup", "Consommé Double"
→ Returns top match + variations
```

### 🚀 Using EchoChefPanel in Builder

**1. Register as Custom Component**

```typescript
// In your Builder.io custom components setup
import { EchoChefPanel } from "@/echo/ui";

// Register
<EchoChefPanel apiEndpoint="/api/echo-chef" />
```

**2. Drop into Any Module**

```
RECIPES → EchoChefPanel
R&D LABS → EchoChefPanel
MENU DESIGN STUDIO → EchoChefPanel
PASTRY MODULE → EchoChefPanel
```

**3. Props**

```typescript
interface EchoChefPanelProps {
  apiEndpoint?: string; // Defaults to "/api/echo-chef"
}
```

### 🔐 Environment Setup

Ensure these are set:

```bash
PINECONE_API_KEY=pcsk_...
OPENAI_API_KEY=sk-proj-...
PINECONE_INDEX_NAME=luccca-recipes  # or your chosen index
```

The system auto-detects which vector engine to use:

- Pinecone (if PINECONE_API_KEY is set)
- pgvector/Supabase (if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set)

### 📊 Data Flow Summary

```
IMPORT PDF
   ↓
RecipeImportSelectionModal (existing)
   ↓ (user selects recipes)
   ↓
useEchoTraining hook (new)
   ↓
POST /api/echo-training/store-recipe (new)
   ↓
mapImportedRecipeToCodex (new)
   ↓
generateEmbedding (existing vector engine)
   ↓
storeRecipeVector (existing vector engine)
   ↓
Pinecone Index (luccca-recipes)
   ↓
USER QUERY
   ↓
POST /api/echo-chef (new)
   ↓
generateEmbedding (query text)
   ↓
EchoChefBrain.suggestRecipes
   ↓
RecipeVectorStore.semanticSearch (Pinecone)
   ↓
Return suggestions (existing_recipe, variation, new_concept)
```

### 🧪 Testing Checklist

- [ ] Can import PDF and see recipes detected
- [ ] "Train Echo" button appears (yellow)
- [ ] Modal opens with all recipes
- [ ] Can select/deselect recipes
- [ ] Import button stores recipes (check toast)
- [ ] Can query EchoChefPanel
- [ ] Returns existing recipes
- [ ] Returns variations with recommended changes
- [ ] Returns new concepts with flavor hints
- [ ] Works across all modules (RECIPES, R&D, PASTRY, etc.)
- [ ] Handles gluten-free, vegan, etc. constraints
- [ ] Handles allergen avoidance

### 🔗 File Dependencies

**New Files:**

- `client/echo/codex/*` → Schemas
- `client/echo/services/*` → Pinecone wrappers
- `client/echo/brain/echoChefBrain.ts` → Core logic
- `client/echo/ui/EchoChefPanel.tsx` → UI component
- `client/api/echo-chef.ts` → API endpoint
- `client/lib/recipe-codex-mapper.ts` → Mapping utility
- `client/hooks/use-echo-training.ts` → Training hook
- `server/lib/echo-chef-embedding.ts` → Embedding helper
- `server/routes/echo-training.ts` → Training endpoints

**Integrated With (Existing):**

- `client/lib/pinecone-recipe-knowledge.ts`
- `client/lib/echo-knowledge-retrieval.ts`
- `server/lib/vector-engine.ts` (Pinecone/pgvector abstraction)
- `server/lib/pinecone-service.ts`
- `server/lib/pgvector-service.ts`
- `client/components/RecipeImportSelectionModal.tsx`
- `server/index.ts` (wired routes)

### 🎓 Future Enhancements

1. **Fine-tuned embeddings** for culinary domain
2. **Multi-book training** with cross-book insights
3. **Nutritional analysis** integration
4. **Cost-per-serving** calculations in suggestions
5. **Equipment requirements** detection
6. **Batch cooking** optimization
7. **Menu balance** suggestions (nutritional, flavor)
8. **Seasonal ingredient** mapping
9. **Staff training** curriculum generation
10. **Quality scoring** based on popularity/feedback

### 📞 Support & Troubleshooting

**EchoChefPanel not showing suggestions:**

- Verify PINECONE_API_KEY and OPENAI_API_KEY are set
- Check if recipes are actually imported (check Pinecone index)
- Review `/api/echo-chef` response in network tab

**Recipes not storing:**

- Check `/api/echo-training/store-recipe` response
- Verify vector engine health: `/api/vector/health`
- Look at server logs for embedding generation errors

**Suggestions are generic:**

- Ensure recipes were imported with full metadata
- Check if dietary tags and allergens are being detected
- Review `recipe-codex-mapper.ts` detection logic

---

**EchoAi³ Culinary Intelligence Module v1.0**  
Built for LUCCCA by Builder.io
