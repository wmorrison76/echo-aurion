# pgvector Setup for Small Venues - Quick Start

**TL;DR:** Run one command, no Pinecone needed, $0/month vector storage.

---

## What is pgvector?

It's a PostgreSQL extension that lets you store and search recipe vectors **inside your Supabase database**. Since you already pay for Supabase, recipe search costs **$0 extra**.

---

## Setup (5 minutes)

### Step 1: Verify Supabase is Configured

Check `.env.local` or environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Both must be present.

### Step 2: Run the Migration

```bash
supabase migration up
```

This:

- Enables pgvector extension
- Creates `recipe_vectors` table
- Adds similarity search functions
- Sets up row-level security (organization isolation)

### Step 3: Verify It Works

```bash
curl http://localhost:5173/api/vector/health

# Should return:
{
  "success": true,
  "data": {
    "engine": "pgvector",
    "available": true,
    "info": {
      "engine": "pgvector",
      "description": "Supabase pgvector (Cost Optimized)",
      "costLevel": "free"
    }
  }
}
```

✅ Done! System is using pgvector automatically.

---

## What You Get for $0

✅ Store unlimited recipe vectors  
✅ Semantic similarity search  
✅ Cross-track learning (manufacturing learns from fine dining)  
✅ Chef collaboration tracking  
✅ Organization-based access control  
✅ Same API as Pinecone (transparent switching)

---

## Usage: It's Automatic

The system now:

- Stores recipes in pgvector automatically
- Searches recipes using pgvector
- Works with R&D Labs AI Design tab
- Supports fine dining & manufacturing tracks

**Zero code changes needed.** Just use the app as normal.

---

## How It Works Under the Hood

### Recipe Storage

```javascript
// From R&D Labs or API
POST /api/vector/recipes/store {
  recipe: { title, ingredients, cuisine, ... },
  track: "fine-dining",
  chefId: "...",
  organizationId: "..."
}
```

System:

1. Converts recipe description to 1536-dim vector (using OpenAI)
2. Stores in Supabase `recipe_vectors` table
3. Indexes by organization + track for fast lookup

### Recipe Search

```javascript
POST /api/vector/recipes/search {
  recipeText: "Asian-inspired sauce with sweet/savory balance",
  userTrack: "fine-dining",
  organizationId: "..."
}
```

System:

1. Converts search text to vector
2. Runs pgvector similarity search
3. Returns top 10 matching recipes
4. Filters by organization (privacy)

### Cross-Track Learning

For manufacturing chefs, also returns fine dining recipes tagged with:

- "precision" (apply fine dining exactness to manufacturing)
- "consistency" (maintain quality at scale)
- "technique" (replicable methods)

---

## Performance Expectations

| Recipes | Search Time | Storage |
| ------- | ----------- | ------- |
| 100     | 10ms        | 1MB     |
| 1,000   | 30ms        | 10MB    |
| 5,000   | 50ms        | 50MB    |
| 10,000+ | 100-200ms   | 100MB+  |

**Note:** For 5000+ recipes, consider Pinecone for guaranteed fast performance.

---

## Troubleshooting

### Issue: "pgvector extension not found"

```
Error: pgvector extension not enabled
```

**Solution:** Run `supabase migration up` again, or manually enable in Supabase console:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Issue: "Search returns no results"

**Cause:** No recipes stored yet  
**Solution:** Store a recipe first via `/api/vector/recipes/store`

### Issue: "Slow search on first run"

**Cause:** Index needs initialization  
**Solution:** Wait 10 seconds, index builds automatically

### Issue: Want to switch to Pinecone later

```bash
PINECONE_API_KEY=your-key
```

**Then:** Restart server. System auto-detects and switches. No migration needed.

---

## What's Included

**File:** `supabase/migrations/004_pgvector_recipes.sql`

Creates:

- `recipe_vectors` table (recipes + vectors)
- `recipe_vector_collaborators` table (team tracking)
- `search_similar_recipes()` function (semantic search)
- `get_cross_track_learning()` function (manufacturing suggestions)
- Row-level security policies (organization isolation)

**Services:**

- `server/lib/pgvector-service.ts` - All pgvector operations
- `server/lib/vector-engine.ts` - Auto-detection + abstraction

**API Endpoints:**

- `POST /api/vector/recipes/store` - Store recipe
- `POST /api/vector/recipes/search` - Find similar recipes
- `GET /api/vector/recipes/by-track` - Get recipes by track
- `POST /api/vector/recipes/delete` - Remove recipe
- `POST /api/vector/cross-track-learning` - Manufacturing suggestions
- `GET /api/vector/health` - Check system status

---

## Costs Comparison

### With pgvector (what you're using now)

| Item                      | Cost                             |
| ------------------------- | -------------------------------- |
| Supabase                  | $25/month (you already pay this) |
| Vector storage            | **$0** (included)                |
| Recipe search             | **$0** (included)                |
| **Total additional cost** | **$0**                           |

### With Pinecone (if you upgrade later)

| Item                      | Cost          |
| ------------------------- | ------------- |
| Supabase                  | $25/month     |
| Pinecone starter          | $30-100/month |
| Recipe search             | $30-100/month |
| **Total additional cost** | **$30-100**   |

**Annual savings with pgvector: $360-1,200/year per venue**

---

## When to Keep Using pgvector

✅ Small restaurants (< 5 locations)  
✅ < 5000 recipes  
✅ < 100 concurrent chefs  
✅ 100-200ms search latency acceptable  
✅ Budget-conscious venues

---

## When to Consider Pinecone

❌ Large resort chains (10+ locations)  
❌ 10,000+ recipes  
❌ Need < 50ms search guaranteed  
❌ Multiple simultaneous searches  
❌ Performance is critical

---

## Next Steps

### Immediate (Done! ✅)

1. Run migration: `supabase migration up`
2. Verify: Check `/api/vector/health`
3. Use: R&D Labs works automatically

### Soon (Optional)

1. Start storing recipes via AI Designer
2. Monitor search performance
3. If slow, switch to Pinecone (just set env var)

### Future (If Needed)

- Pinecone upgrade: Set API key + restart
- Scaling: Add database indexes
- Analytics: Track which recipes used most

---

## Questions?

**Q: Can I switch to Pinecone later?**  
A: Yes, just set `PINECONE_API_KEY` and restart. No migration needed.

**Q: Will recipes get duplicated?**  
A: No, system stores in one place only. Switching engines = new storage location.

**Q: What if my Supabase is slow?**  
A: That's a general DB issue, not pgvector-specific. Pinecone won't help.

**Q: Do I need OpenAI key?**  
A: Yes (for embeddings). Both pgvector and Pinecone use the same embeddings.

**Q: Can I delete pgvector and use just Pinecone?**  
A: Yes, disable migration or remove pgvector tables. pgvector won't interfere.

---

## Summary

🎉 **You now have $0/month vector storage for recipes.**

The system automatically:

- Stores recipe vectors
- Searches for similar recipes
- Enables cross-track learning
- Maintains chef collaboration

No Pinecone required. No additional costs. Scale to 5000+ recipes for free.
