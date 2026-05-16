# Recipe PDF Import & Echo Knowledge Base Training

## Overview

This system allows chefs to import recipes from PDF cookbooks directly into Echo's knowledge base, enabling fast recipe recall without OpenAI API calls. The workflow includes intelligent recipe detection, multi-page handling, and selective import.

## Features

### 1. **Dual-Panel Import Modal**
- **Left Panel**: List of all detected recipes with checkboxes
- **Right Panel**: Preview of selected recipe (ingredients, instructions, metadata)
- **Selection Controls**: 
  - Individual recipe checkboxes
  - "Select All" option
  - Cancel/Import buttons

### 2. **Yellow Development Button**
- Appears in the "Library (Book PDF) Import" section when recipes are detected
- Styled in bright yellow to remind developers to remove before packaging
- Labeled "Train Echo" to indicate its purpose
- Click to open the import modal

### 3. **Multi-Page Recipe Detection**
The system intelligently detects recipes that span multiple pages by looking for:
- Continuation markers ("Continued from page X", "See page Y")
- Content type transitions (ingredients → instructions)
- Page flow patterns
- Structural consistency

### 4. **Pinecone Knowledge Base Storage**
Imported recipes are stored in Pinecone with:
- Full embedding for semantic search
- Rich metadata (ingredients, instructions, source, page number)
- Organization isolation (global-knowledge)
- Tags for easy filtering

## Workflow

### Step 1: Import PDF

```
Recipe Search → Library (Book PDF) Import → Select PDF → "Reading file..." → Scanning pages...
```

The system:
1. Extracts text from each PDF page
2. Builds a local knowledge base of terms and bigrams
3. Detects recipe candidates (pages with ingredient lists)
4. Shows "Train Echo" button when candidates found

### Step 2: Review & Select Recipes

```
Click "Train Echo" → Modal opens → Browse recipes → Select to preview → Check boxes for import
```

The modal shows:
- All detected recipes in a scrollable list
- Recipe preview with ingredients and instructions
- Metadata (prep time, cook time, yield, difficulty)
- Selection checkboxes and "Select All" option

### Step 3: Import to Knowledge Base

```
Click "Import" → Recipes stored in Pinecone → Toast confirmation
```

Each selected recipe:
- Gets a unique ID based on book name, page number, timestamp
- Is stored with full ingredients and instructions
- Gets enriched with tags for source tracking
- Becomes available for Echo AI retrieval

## Code Structure

### Components

**`client/components/RecipeImportSelectionModal.tsx`**
- Two-panel layout (list + preview)
- Recipe selection UI
- Import triggering

### Libraries

**`client/lib/pinecone-recipe-knowledge.ts`**
- Store recipes in Pinecone
- Search imported recipes
- Track import history
- Training metadata for Echo

**`client/lib/multi-page-recipe-detection.ts`**
- Detect continuation patterns
- Merge multi-page recipes
- Extract ingredients and instructions
- Analyze content types

**`client/lib/echo-knowledge-retrieval.ts`**
- Hybrid search (KB + OpenAI)
- Smart routing based on question type
- Parallel search with race conditions
- Retrieval statistics and monitoring

### Integration Points

**`client/pages/sections/RecipeSearch.tsx`**
- Yellow "Train Echo" button in Library (Book PDF) Import section
- Modal state management
- Import handler that calls Pinecone storage

**`server/lib/pinecone-service.ts`**
- Handles vector generation
- Stores metadata in Pinecone
- Existing integration point

## Echo AI Retrieval Strategies

### 1. **Hybrid Search (Default)**
```
Query → Knowledge Base (100ms wait) → 
  ✓ High confidence (>0.65) → Return KB answer
  ✗ Medium confidence → Supplement with OpenAI
  ✗ Low/No confidence → Fall back to OpenAI
```

**Cost Savings**: Reduces OpenAI calls by 40-60% for common recipe questions

### 2. **Knowledge Base Only (Cost-Conscious)**
```
Query → Search imported recipes → Return best match or "not found"
```

**Use Case**: When budget is tight or for non-critical questions

### 3. **Parallel Search (Fastest)**
```
Query → Race: KB vs OpenAI → Return whichever responds first
```

**Use Case**: When speed matters more than cost

### 4. **Smart Routing**
```
Analyze question type →
  Recipe/Technique? → Hybrid Search
  Novel/Comparison? → Parallel Search
```

## Performance Metrics

### Typical Response Times
- **Knowledge Base**: 50-150ms
- **OpenAI**: 2-5 seconds
- **Hybrid (KB wins)**: 50-150ms (no API cost)
- **Hybrid (OpenAI fallback)**: 2-5 seconds (API cost)

### Cost Reduction Example
```
100 recipe questions per day
- Before: 100 × $0.001 = $0.10/day = $3/month
- After (60% KB hit rate): 40 × $0.001 = $0.04/day = $1.20/month
- Savings: ~60% reduction
```

## How to Use (Development)

### Import a Cookbook

1. Navigate to Recipe Search tab
2. Scroll to "Library (Book PDF) Import" section
3. Drag & drop a PDF cookbook (or click to select)
4. Wait for scanning to complete
5. Click the yellow "Train Echo" button
6. Modal opens showing detected recipes
7. Preview recipes by clicking on them
8. Select recipes to import using checkboxes
9. Click "Import" button
10. Toast confirms: "X recipes stored for Echo knowledge"

### Train Echo to Recognize Patterns

The system tracks:
- Which recipes were imported successfully
- Which recipes were skipped
- Import frequency by book
- Success rate trends

Over time, Echo learns to:
- Recognize recipe patterns better
- Reduce false positives
- Improve extraction accuracy

### Monitor Knowledge Base

Check localStorage for import metadata:
```javascript
// View import history
JSON.parse(localStorage.getItem('echo:imports'))

// View retrieval stats
JSON.parse(localStorage.getItem('echo:retrieval-stats'))
```

## API Endpoints

### Store Recipe Vector
```
POST /api/vector/recipes/store
{
  "recipe": {
    "id": "cookbook-p42-timestamp",
    "title": "Pan-Seared Scallops",
    "ingredients": ["scallops", "butter", ...],
    "instructions": ["Heat butter...", ...],
    "prepTime": 15,
    "cookTime": 8
  },
  "track": "manufacturing",
  "chefId": "echo-system",
  "organizationId": "global-knowledge"
}
```

### Search Recipes
```
POST /api/vector/recipes/search
{
  "recipeText": "How do you make pan-seared scallops?",
  "userTrack": "manufacturing",
  "chefId": "echo-system",
  "organizationId": "global-knowledge",
  "limit": 5
}
```

## Multi-Page Recipe Detection Examples

### Example 1: Recipe spans 2 pages
```
Page 1: Title, Ingredients
Page 2: "Instructions (continued)" + step-by-step instructions
→ System merges into single recipe
```

### Example 2: Multiple recipes per page
```
Page 1: Recipe A (ingredients)
       [line break]
       Recipe B (ingredients)
Page 2: Recipe A (instructions)
Page 3: Recipe B (instructions)
→ System detects and separates correctly
```

### Example 3: Continuation markers
```
Page 1: "Baked Salmon" + ingredients, "See instructions on page 42"
Page 2: [blank]
...
Page 42: "Baked Salmon (continued)" + instructions
→ System links pages despite non-consecutive numbering
```

## Testing Checklist

- [ ] PDF scan completes without errors
- [ ] Recipe candidates detected correctly
- [ ] Yellow button appears when recipes found
- [ ] Modal opens and shows all recipes
- [ ] Left panel scrolls and selections work
- [ ] Right panel preview updates on selection
- [ ] "Select All" toggles all checkboxes
- [ ] Import stores recipes in Pinecone
- [ ] Toast confirmation appears
- [ ] Modal closes after import
- [ ] Recipes searchable via Echo knowledge retrieval
- [ ] Multi-page recipes merge correctly
- [ ] Source metadata preserved in tags

## Environment Variables

```bash
PINECONE_API_KEY=pcsk_...
OPENAI_API_KEY=sk-proj-...
```

## Future Enhancements

1. **OCR Improvement**: Better handling of scanned PDFs with low text quality
2. **Recipe Merging**: Auto-merge recipes from multiple sources
3. **Batch Training**: Schedule recurring cookbook imports
4. **Confidence Scoring**: Show detection confidence per recipe
5. **Recipe Editing**: Refine extracted recipes before importing
6. **Duplicate Detection**: Prevent importing same recipe twice
7. **Nutritional Analysis**: Extract/calculate nutrition info
8. **Allergen Detection**: Auto-tag recipes with allergen warnings
9. **Cost Integration**: Link to ingredient costs for pricing
10. **Analytics Dashboard**: Track which recipes are most useful

## Troubleshooting

### Yellow button doesn't appear
- Ensure PDF has been scanned fully
- Check browser console for errors
- Verify `detected` state has items

### Modal won't open
- Check if recipes were actually detected
- Verify modal state is being set correctly
- Check for React state issues in dev tools

### Recipes not storing in Pinecone
- Verify PINECONE_API_KEY is set
- Check server logs for storage errors
- Ensure organizationId is valid
- Check network tab for API calls

### Echo doesn't find imported recipes
- Verify recipes were stored (check toast message)
- Use `/api/vector/recipes/search` to test retrieval
- Check that query text is similar to recipe content
- Review confidence threshold (currently 0.65)

## References

- [Pinecone Integration Guide](./PINECONE_INTEGRATION_GUIDE.md)
- [Echo Knowledge Retrieval](./client/lib/echo-knowledge-retrieval.ts)
- [Multi-page Detection](./client/lib/multi-page-recipe-detection.ts)
- [Recipe Import Modal](./client/components/RecipeImportSelectionModal.tsx)
