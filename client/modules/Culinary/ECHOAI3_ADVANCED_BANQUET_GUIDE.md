# EchoAi³ Advanced – Banquet Intelligence & Recipe Generation

## Complete Integration Guide for Enterprise Catering & BEO Management

### 📊 Overview

EchoAi³ Advanced is a production-ready culinary intelligence system that:

- **Learns from your textbooks** (PDF imports) and retains knowledge forever
- **Understands banquet service** (BEO-aware, holding times, service contexts)
- **Suggests dishes** based on constraints (dietary, complexity, guest count, service type)
- **Generates full recipes** with LLM integration (OpenAI or Gemini)
- **Persists knowledge** even when source cookbooks are deleted

### 🏗️ Architecture Overview

```
PDF/Cookbook Import
     ↓
(Multi-page recipe detection)
     ↓
User Reviews & Selects
     ↓
EchoAi³ Training API
     ↓
(Map to Codex + Generate Embedding)
     ↓
Pinecone / Supabase pgvector
(Permanent Knowledge Base)
     ↓
USER QUERY (Banquet Event Order)
     ↓
embedTextToVector (OpenAI/Gemini)
     ↓
EchoChefBrain.suggestRecipes (Suggestions)
     ↓
EchoRecipeGenerator.generateFullRecipeDraft (Optional LLM Recipe)
     ↓
Response: Suggestions + Optional Full Recipe Draft
```

### 📦 New & Enhanced Files

```
client/echo/services/
  ├─ embeddingProvider.ts        (NEW) Supports OpenAI + Gemini
  ├─ llmProvider.ts              (NEW) Recipe generation with OpenAI + Gemini
  ├─ [existing files]

client/echo/brain/
  ├─ echoChefBrain.ts            (UPDATED) Banquet/BEO-aware logic
  ├─ echoRecipeGenerator.ts      (NEW) Full recipe generation
  └─ [existing files]

client/api/
  └─ echo-chef.ts                (UPDATED) Support "suggest" vs "generate" modes

client/echo/ui/
  └─ EchoChefPanel.tsx           (UPDATED) Service context + holding methods + draft toggle
```

### 🎯 Key Features

#### **1. Embedding Provider (OpenAI + Gemini)**

```typescript
import { embedTextToVector } from "@/echo/services";

const embedding = await embedTextToVector("Main course for 200 guests");
// Auto-uses configured provider (EMBEDDING_PROVIDER env)
```

**Environment:**

```bash
EMBEDDING_PROVIDER=openai  # or "gemini"
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
GEMINI_EMBEDDING_MODEL=text-embedding-004
```

#### **2. LLM Provider (OpenAI + Gemini)**

```typescript
import { generateRecipeDraftWithLlm } from "@/echo/services";

const recipe = await generateRecipeDraftWithLlm({
  userPrompt: "French main course for 150 pax",
  serviceContext: "banquet_plated",
  guestCount: 150,
  neighbors: [
    /* top recipes from Pinecone */
  ],
});
```

**Environment:**

```bash
LLM_PROVIDER=openai  # or "gemini"
OPENAI_MODEL=gpt-4-turbo-preview
GEMINI_MODEL=gemini-1.5-pro
```

#### **3. Banquet/BEO-Aware Chef Brain**

```typescript
import { EchoChefBrain, type ServiceContext } from "@/echo/brain";

const suggestions = await EchoChefBrain.suggestRecipes({
  userPrompt: "Buffet main course, 300 pax, holds 1 hour",
  queryEmbedding: embedding,
  serviceContext: "banquet_buffet", // NEW
  guestCount: 300, // NEW
  holdingMethod: "hotel_pan", // NEW
  maxHoldMinutes: 60, // NEW
  courseName: "Main Course", // NEW
  dietaryTags: ["gluten_free"],
});
```

**Service Contexts:**

- `"a_la_carte"` – individual plating, quick service
- `"banquet_plated"` – batch plating, mirror-image for large groups
- `"banquet_buffet"` – buffet stations, hotel pans, chafers
- `"reception"` – passed hors d'oeuvres, standing service
- `"room_service"` – individual rooms, holding in insulated containers

#### **4. Recipe Generator (LLM-based)**

```typescript
import { EchoRecipeGenerator } from "@/echo/brain";

const { recipeDraft, neighborsUsed } =
  await EchoRecipeGenerator.generateFullRecipeDraft({
    userPrompt: "Gluten-free Asian-inspired appetizer",
    queryEmbedding: embedding,
    serviceContext: "reception",
    guestCount: 200,
    dietaryTags: ["gluten_free", "vegan"],
  });

// recipeDraft includes:
// - title, description
// - yield (scaling to guest count)
// - ingredients with sections
// - step-by-step instructions with timings
// - equipment needed
// - allergens & dietary tags
// - HOLDING GUIDELINES (banquet-specific)
// - plating notes
```

#### **5. Extended API Endpoint**

```
POST /api/echo-chef

Request:
{
  "userPrompt": "Main course for 250 pax, buffet service, holds 45 min",
  "mode": "suggest",        // "suggest" or "generate"
  "serviceContext": "banquet_buffet",
  "guestCount": 250,
  "holdingMethod": "hotel_pan",
  "courseName": "Main Course",
  "dietaryTags": ["gluten_free"],
}

Response (mode="suggest"):
{
  "mode": "suggest",
  "suggestions": [
    {
      "type": "existing_recipe",
      "title": "...",
      "beoNotes": {
        "course": "Main Course",
        "stationName": "Buffet Station",
        "platingStyle": "buffet_self_service",
        "passOrder": 1
      },
      "serviceNotes": "Design components to hold well in hotel pans..."
    }
  ]
}

Response (mode="generate"):
{
  "mode": "generate",
  "suggestions": [...],
  "recipeDraft": {
    "title": "...",
    "yield": { "amount": 250, "unit": "portions" },
    "holdingGuidelines": [
      "Hold at 140°F for up to 45 minutes",
      "Transfer to chafers 10 minutes before service"
    ],
    "platingNotes": "..."
  },
  "neighbors": [...]
}
```

### 🎤 Using EchoChefPanel

```tsx
import { EchoChefPanel } from "@/echo/ui";

export default function BanquetPlanner() {
  return (
    <EchoChefPanel
      apiEndpoint="/api/echo-chef"
      defaultMode="suggest" // or "generate"
    />
  );
}
```

**Features:**

- Service context dropdown (banquet plated, buffet, reception, etc.)
- Guest count input
- Holding method selector (pass plate, hotel pan, hot box, etc.)
- Course name field (for BEO tracking)
- Dietary filter toggles
- Toggle between "Suggestions Only" and "Suggestions + Recipe Draft"
- Real-time error handling

### 🔐 Environment Setup (Complete)

```bash
# Embedding Provider (for vector search)
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-large

# Or Gemini
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=AIza...
GEMINI_EMBEDDING_MODEL=text-embedding-004

# LLM Provider (for recipe generation)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...  # (reuse)
OPENAI_MODEL=gpt-4-turbo-preview

# Or Gemini
LLM_PROVIDER=gemini
GEMINI_API_KEY=AIza...  # (reuse)
GEMINI_MODEL=gemini-1.5-pro

# Vector Storage (already configured)
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=luccca-recipes

# Or Supabase pgvector
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 📚 Example Workflow: Banquet Planning

**Scenario:** Event planner needs a gluten-free main course for 300 guests in buffet format (45-minute hold).

```
1. Open EchoChefPanel
   Service Context: "Banquet – Buffet"
   Guest Count: 300
   Holding Method: "Hotel Pan"
   Dietary: [gluten_free]
   Mode: "Suggest + Draft"

2. User prompt: "French-inspired vegetable-centric main, holds well, impressive plating"

3. Ask Echo!

4. Results:
   - 3 existing recipes (tested, proven)
   - 3 variations with dietary adjustments
   - 1 new concept seeded from top matches
   - OPTIONAL: Full recipe draft (ingredients scaled to 300 pax, holding guidelines)

5. Chef selects recipe → creates BEO → stations & prep schedule
```

### 🧠 How "Knowledge Persistence" Works

**Important:** Even if you delete a cookbook PDF import, Echo retains the learned recipes.

**Why?**

- Recipes are stored as vectors + metadata in Pinecone/pgvector
- Deletion of PDF only removes the "source reference" (file, import record)
- The actual recipe embeddings remain permanent
- Echo continues to suggest those recipes as if they came from a "general knowledge" source

**Example:**

```
Day 1: Import "French Cuisine Master" PDF → 50 recipes stored
Day 2: Delete the PDF import
Day 3: Ask "French main course" → Still gets those 50 recipes!
       (Echo just doesn't know they came from "French Cuisine Master" anymore)
```

This is intentional: **once Echo learns from a textbook, that knowledge becomes part of the organization's culinary DNA.**

### 🚀 API Integration Examples

#### **Suggest Only (Fast)**

```javascript
const response = await fetch("/api/echo-chef", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userPrompt: "Appetizer course, reception service, 150 pax",
    serviceContext: "reception",
    guestCount: 150,
    mode: "suggest",
  }),
});

const data = await response.json();
console.log(data.suggestions);
// [
//   { type: "existing_recipe", title: "...", beoNotes: {...} },
//   { type: "variation", title: "...", recommendedChanges: [...] },
//   { type: "new_concept", title: "...", flavorBalanceHint: {...} }
// ]
```

#### **Suggest + Generate (Full Recipe)**

```javascript
const response = await fetch("/api/echo-chef", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userPrompt: "Vegan dessert, elegant, makes 100 portions",
    serviceContext: "banquet_plated",
    guestCount: 100,
    dietaryTags: ["vegan"],
    mode: "generate", // ← Request full recipe draft
  }),
});

const data = await response.json();
// {
//   mode: "generate",
//   suggestions: [...],
//   recipeDraft: {
//     title: "...",
//     ingredients: [{name, quantity, unit, section, notes}, ...],
//     steps: [{order, instruction, timingMinutes, techniqueTags}, ...],
//     holdingGuidelines: ["..."],
//     platingNotes: "..."
//   }
// }
```

### 🧪 Testing Checklist

- [ ] Embedding provider works (test with simple text)
- [ ] LLM provider responds (test recipe generation)
- [ ] EchoChefBrain filters by service context
- [ ] EchoChefPanel renders with all fields
- [ ] Service context selector works
- [ ] Guest count scales recipe portions
- [ ] BEO notes appear in suggestions
- [ ] Holding guidelines appear in generated recipes
- [ ] Can switch between "suggest" and "generate" modes
- [ ] Error handling for API failures
- [ ] Knowledge persists after cookbook deletion

### 📊 Generated Recipe Structure

```typescript
interface GeneratedRecipe {
  title: string; // "Pan-Seared Branzino"
  description: string; // "Light, elegant, pairs well with..."
  yield: {
    amount: number; // 300
    unit: string; // "portions"
    perGuest?: boolean;
  };
  serviceContext?: ServiceContext; // "banquet_plated"
  miseEnPlace: string[]; // ["mise cups", "plating plates", ...]
  ingredients: {
    section?: string; // "Protein", "Sauce"
    name: string;
    quantity: number | string;
    unit?: string;
    notes?: string;
  }[];
  steps: {
    order: number;
    instruction: string;
    timingMinutes?: number;
    techniqueTags?: string[]; // ["sear", "rest"]
  }[];
  equipment: string[]; // ["non-stick sauté pan", "plating spoon", ...]
  allergens: string[]; // ["fish", "shellfish"]
  dietaryTags: string[]; // ["gluten_free"]
  holdingGuidelines?: string[]; // ["Hold at 140°F max 30 min", ...]
  platingNotes?: string; // "Plate clockwise, garnish last minute"
}
```

### 🔗 Data Flow

```
User fills EchoChefPanel
   ↓
POST /api/echo-chef with mode & context
   ↓
embedTextToVector(userPrompt)
   ↓
RecipeCodexService.searchByQueryEmbedding(embedding)
   ↓
[TOP 10 RECIPES from Pinecone/pgvector]
   ↓
EchoChefBrain.suggestRecipes(filters: serviceContext, guestCount, etc.)
   ↓
RETURN SUGGESTIONS
   ↓
IF mode="generate":
   EchoRecipeGenerator.generateFullRecipeDraft(neighbors)
     ↓
   generateRecipeDraftWithLlm(systemPrompt + userPrompt + neighbor summaries)
     ↓
   LLM returns structured JSON recipe
     ↓
   RETURN suggestions + recipeDraft
```

### 🎓 Advanced Customization

#### **Custom Service Contexts**

Edit `client/echo/brain/echoChefBrain.ts` to add new contexts:

```typescript
export type ServiceContext =
  | "a_la_carte"
  | "banquet_plated"
  | "banquet_buffet"
  | "reception"
  | "room_service"
  | "drop_off" // NEW: catering pickup
  | "food_truck"; // NEW: mobile service
```

#### **Custom Holding Methods**

```typescript
export type HoldingMethod =
  | "pass_plate"
  | "hotel_pan"
  | "hot_box"
  | "room_temp_pass"
  | "action_station"
  | "sous_vide_bath" // NEW
  | "heat_lamp"; // NEW
```

#### **Custom Embedding/LLM Models**

```bash
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Cheaper
OPENAI_MODEL=gpt-4  # More expensive but smarter
```

### 🚨 Common Issues & Solutions

**Q: "Embedding failed" error**

- Check OPENAI_API_KEY or GEMINI_API_KEY is set
- Verify EMBEDDING_PROVIDER env var
- Test with simple text: `embedTextToVector("hello")`

**Q: "LLM returned invalid JSON"**

- Check LLM_PROVIDER is set correctly
- Verify OPENAI_MODEL or GEMINI_MODEL is valid
- Check model has JSON mode enabled (GPT-4 Turbo does)
- Review system prompt formatting

**Q: "No recipes found in Pinecone"**

- Verify recipes were imported (check `/api/vector/health`)
- Ensure import used correct organizationId ("global-knowledge")
- Try broader search query (less specific)

**Q: Knowledge lost after deleting cookbook**

- This is expected behavior! Recipes are stored permanently
- To truly remove: run Pinecone/pgvector DELETE query directly
- Or implement a "soft delete" flag in metadata

### ��� Support

For issues with:

- **Embedding**: Check OpenAI/Gemini API credentials + model names
- **LLM**: Check OpenAI/Gemini API credentials + model names + JSON output
- **Pinecone/pgvector**: Use `/api/vector/health` endpoint
- **EchoChefBrain**: Review filters & Codex metadata mapping
- **UI/UX**: Check browser console for React/fetch errors

---

**EchoAi³ Advanced – Production Ready**  
Built for Enterprise Catering, Banquet Services, and Culinary R&D

**Key Principles:**

- ✅ Knowledge is permanent (never lost)
- ✅ Service-context aware (banquet-specific)
- ✅ Flexible providers (OpenAI + Gemini)
- ✅ Scalable (Pinecone for large orgs, pgvector for SMB)
- ✅ Builder-ready (drag-drop panels)
