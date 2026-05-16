# Builder.io Culinary Knowledge Pipeline

Complete end-to-end pipeline to extract culinary definitions, glossaries, and recipes from PDFs and make them queryable by Echo AI.

## Overview

This pipeline has 3 stages:

1. **PDF Scanning** (`echo_culinary_scanner.py`) - Extract terms, definitions, and recipes from cookbooks
2. **Builder.io Modeling** - Create data models in Builder.io for culinary knowledge
3. **Bulk Upload** (`import_terms_and_recipes.js`) - Push extracted data into Builder.io
4. **Echo Integration** - Echo queries Builder.io for knowledge during conversations

---

## Stage 1: Setup Python Environment

### Install Dependencies

```bash
cd builder-import
python3 -m venv venv
source venv/bin/activate  # on Windows: venv\Scripts\activate
pip install PyPDF2
```

### Run Scanner on a PDF

```bash
python3 echo_culinary_scanner.py path/to/cookbook.pdf
```

This generates: `echo_culinary_knowledge.json`

Example output:

```
Done. Extracted:
  Terms:   1240
  Recipes: 87
Saved to: echo_culinary_knowledge.json
```

---

## Stage 2: Create Builder.io Data Models

### Login to Builder.io

Go to [builder.io](https://builder.io) and sign in.

### Create Model 1: `EchoCulinaryTerm`

1. Click **+ New → Data Model**
2. Set **Name**: `echoculinaryterm`
3. Add these fields:

| Field              | Type        | Notes                           |
| ------------------ | ----------- | ------------------------------- |
| `term`             | Text        | Required                        |
| `slug`             | Text        | Unique ID                       |
| `letter`           | Text        | First letter for browsing       |
| `definition`       | Long Text   | Full definition                 |
| `categories`       | List → Text | e.g., "ingredient", "technique" |
| `aliases`          | List → Text | Alternative names               |
| `source_work`      | Text        | e.g., "Food Lover's Companion"  |
| `source_page`      | Number      | Optional                        |
| `confidence_score` | Number      | 0-100                           |
| `updated_at`       | Date        | Auto-populate                   |
| `status`           | Text        | "verified" or "auto-imported"   |

4. Enable **API**:
   - ✅ Read API
   - ✅ Write API
   - ✅ Publish on Create

5. Click **Save**

### Create Model 2: `EchoRecipe`

1. Click **+ New → Data Model**
2. Set **Name**: `echorecipe`
3. Add these fields:

| Field         | Type        | Notes                         |
| ------------- | ----------- | ----------------------------- |
| `title`       | Text        | Required                      |
| `slug`        | Text        | Required                      |
| `ingredients` | List → Text | Raw ingredient lines          |
| `steps`       | List → Text | Numbered instructions         |
| `source_work` | Text        | Optional                      |
| `source_page` | Number      | Optional                      |
| `updated_at`  | Date        | Auto-populate                 |
| `status`      | Text        | "verified" or "auto-imported" |

4. Enable **API**:
   - ✅ Read API
   - ✅ Write API

5. Click **Save**

---

## Stage 3: Generate Builder.io Write API Key

1. Go to your **Organization Settings** (gear icon, top right)
2. Click **API Keys**
3. Create a new **Write Key** for this app
4. Copy the key

---

## Stage 4: Run the Uploader

```bash
# Set your Builder.io API key
export BUILDER_API_KEY="your_write_api_key_here"

# Run the uploader
node import_terms_and_recipes.js
```

This will:

- Read `echo_culinary_knowledge.json`
- Upload every term to `echoculinaryterm` model
- Upload every recipe to `echorecipe` model
- Auto-publish all content
- Log results

Example output:

```
============================================
    Builder.io Culinary Knowledge Import
============================================

📚 Uploading 1240 culinary terms...

✔ Term: "Abalone"
✔ Term: "Bain Marie"
✔ Term: "Caramelize"
...

📊 Terms complete: 1240 uploaded, 0 skipped

🍳 Uploading 87 recipes...

✔ Recipe: "Lemon Tart"
✔ Recipe: "Chocolate Sponge"
...

📊 Recipes complete: 87 uploaded, 0 skipped

============================================
Total Terms:   1240 ✔ 0 ⊘
Total Recipes: 87 ✔ 0 ⊘
============================================

✅ Import complete!
```

---

## Stage 5: Integrate with Echo

### 1. Set Up Environment Variable

Add to `.env.local`:

```
VITE_BUILDER_PUBLIC_API_KEY=your_public_api_key
```

Get your **Public API Key** from Builder.io settings (different from Write Key).

### 2. Use in Echo Services

Echo can now fetch culinary knowledge on-demand:

```typescript
import {
  fetchCulinaryTerm,
  fetchRecipe,
  explainCulinaryTerm,
  findIngredientSubstitutes,
} from "@/lib/builder-culinary-knowledge";

// In Echo's knowledge enrichment:
const term = await fetchCulinaryTerm("Hollandaise");
// Returns: { term: "Hollandaise", definition: "A warm emulsion...", categories: ["sauce"] }

// Explain to users
const explanation = await explainCulinaryTerm("bain marie");
// Returns: "bain marie (technique): A water bath used to gently heat..."

// Find substitutes
const substitutes = await findIngredientSubstitutes("butter");
// Returns: [CulinaryTerm objects for butter alternatives]

// Fetch full recipe
const recipe = await fetchRecipe("lemon-tart");
// Returns: { title: "Lemon Tart", ingredients: [...], steps: [...] }
```

### 3. Example: Echo explains a term

When user asks: _"What's a bain marie?"_

```typescript
const term = await fetchCulinaryTerm("bain marie");
if (term) {
  response = `A **${term.term}** is ${term.definition}. 
             It's commonly used in ${term.categories.join(", ")} work.`;
}
```

---

## File Structure

```
builder-import/
├── echo_culinary_scanner.py          # PDF → JSON scanner
├── import_terms_and_recipes.js        # JSON → Builder.io uploader
├── utils/
│   ├── slugify.js                    # URL-safe ID generation
│   ├── validate_term.js              # Validate culinary terms
│   └── validate_recipe.js            # Validate recipes
├── echo_culinary_knowledge.json       # Generated output (Git-ignored)
└── README.md                          # This file
```

---

## Troubleshooting

### Python Scanner Issues

**"ModuleNotFoundError: No module named 'PyPDF2'"**

```bash
pip install PyPDF2
```

**"No text extracted from PDF"**

- The PDF might be scanned images only
- We can add OCR support later using `pytesseract`

### Builder.io Upload Issues

**"BUILDER_API_KEY not set"**

```bash
export BUILDER_API_KEY="your_key_here"
echo $BUILDER_API_KEY  # verify
node import_terms_and_recipes.js
```

**"HTTP 401: Unauthorized"**

- Your API key is invalid or expired
- Get a new Write Key from Builder.io settings

**"HTTP 400: Model not found"**

- Make sure you created `echoculinaryterm` and `echorecipe` models
- Check spelling (case-sensitive)

### Echo Knowledge Not Loading

**"VITE_BUILDER_PUBLIC_API_KEY not set"**

- Add to `.env.local` and restart dev server
- Make sure it's a **Public** API key, not Write key

---

## Advanced: Batch Processing Multiple PDFs

```bash
#!/bin/bash
for pdf in cookbooks/*.pdf; do
  echo "Scanning $pdf..."
  python3 echo_culinary_scanner.py "$pdf"
done

# Merge all JSON outputs
node merge_knowledge.js

# Upload combined data
node import_terms_and_recipes.js
```

---

## Next Steps

1. ✅ Scan your first cookbook
2. ✅ Upload to Builder.io
3. ✅ Test Echo knowledge fetching
4. 🚀 Train Echo with real culinary intelligence
5. 📊 Build custom glossaries, tooltips, auto-complete

---

## Support

- **Builder.io Docs**: https://builder.io/docs
- **PyPDF2 Docs**: https://github.com/py-pdf/PyPDF2
- **Echo Integration**: See `/client/lib/builder-culinary-knowledge.ts`
