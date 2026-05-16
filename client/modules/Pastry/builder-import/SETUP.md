# Quick Start: Builder.io Culinary Knowledge Pipeline

Get culinary terms, definitions, and recipes from PDFs into Echo in **5 minutes**.

## Step 1: Python Setup (1 min)

```bash
cd builder-import
python3 -m venv venv
source venv/bin/activate
pip install PyPDF2
```

## Step 2: Scan Your PDF (1 min)

```bash
python3 echo_culinary_scanner.py ~/Downloads/cookbook.pdf
```

Output: `echo_culinary_knowledge.json` with all extracted terms and recipes.

## Step 3: Create Builder.io Models (2 min)

In [builder.io](https://builder.io):

1. **Model 1:** `echoculinaryterm` with fields:
   - term (Text)
   - definition (Long Text)
   - categories (List)
   - slug, letter, source_work, source_page

2. **Model 2:** `echorecipe` with fields:
   - title (Text)
   - ingredients (List)
   - steps (List)
   - slug, source_work

Enable **API** and **Publish on Create** for both.

## Step 4: Get API Key (1 min)

- Go to **Organization Settings** → **API Keys**
- Create a new **Write Key**
- Copy it

## Step 5: Upload Data (instant)

```bash
export BUILDER_API_KEY="your_write_key_here"
npm install
node import_terms_and_recipes.js
```

Done! ✅ All your terms and recipes are now in Builder.io.

---

## Step 6: Enable Echo Knowledge

In your app's `.env.local`:

```
VITE_BUILDER_PUBLIC_API_KEY=your_public_api_key
```

Now Echo can fetch and explain culinary terms on-demand.

---

## Example: Echo uses the knowledge

```typescript
import {
  fetchCulinaryTerm,
  explainCulinaryTerm,
} from "@/lib/builder-culinary-knowledge";

// Echo explains a term
const explanation = await explainCulinaryTerm("bain marie");
// "bain marie (technique): A water bath used to gently heat food..."

// Get full recipe
const recipe = await fetchRecipe("lemon-tart");
// { title: "Lemon Tart", ingredients: [...], steps: [...] }
```

---

For full documentation, see **README.md**
