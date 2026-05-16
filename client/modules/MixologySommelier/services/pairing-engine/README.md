# EchoAI³ Pairing Engine

**Microservice for intelligent wine–recipe pairings**

Connects EchoRecipePro recipes → Wine inventory → AI-generated pairing rationales. All results stored in `pairing_evidence` table for historical learning.

## Features

- **Score-based matching** — Acidity, body, tannin, and aroma alignment
- **AI-generated rationales** — Uses OpenAI GPT-4 to explain each pairing in Michelin-level language
- **Bulk operations** — Compute pairings for single recipe or all recipes
- **Database persistence** — Stores evidence for feedback loops and analytics

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL (via Supabase or local)
- OpenAI API key

### Installation

1. Create `.env` file:

   ```
   DATABASE_URL=postgresql://user:pass@localhost:5432/sommelier_db
   OPENAI_API_KEY=sk-...
   PAIRING_ENGINE_PORT=8090
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start microservice:
   ```bash
   npm run dev
   ```

Service will run on `http://localhost:8090`

## API Endpoints

### POST /pairings/compute/:recipeId

Compute pairings for a specific recipe.

**Example:**

```bash
curl -X POST http://localhost:8090/pairings/compute/550e8400-e29b-41d4-a716-446655440000
```

**Response:**

```json
{
  "status": "ok",
  "recipe_id": "550e8400-e29b-41d4-a716-446655440000",
  "count": 3,
  "results": [
    {
      "wine_id": "uuid",
      "recipe_id": "uuid",
      "pairing_score": 92.5,
      "rationale": "The wine's bright acidity cuts through the dish's richness while its mineral notes complement..."
    }
  ]
}
```

### POST /pairings/compute-all

Bulk compute pairings for all recipes in database. **Admin operation.**

```bash
curl -X POST http://localhost:8090/pairings/compute-all
```

### GET /pairings/health

Health check endpoint.

```bash
curl http://localhost:8090/pairings/health
```

## Scoring Algorithm

Pairings scored 0-100 based on:

1. **Acidity Balance** (35%) — Recipe acidity vs. wine acidity
2. **Body Alignment** (30%) — Recipe intensity vs. wine body
3. **Spice & Sweetness** (20%) — Spicy dishes paired with off-dry wines
4. **Umami & Tannin** (15%) — Umami-forward dishes with low-tannin wines

Only pairings scoring >60 are returned.

## Integration

### With Backend API

Call from your main backend to enrich wine catalog:

```typescript
const pairingResult = await fetch(
  `http://localhost:8090/pairings/compute/${recipeId}`,
  { method: "POST" },
);
```

### With Frontend

Display pairing rationales in UI panels alongside wine cards and menu items.

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `OPENAI_API_KEY` or `ECHO_OPENAI_API_KEY` — OpenAI API key
- `PAIRING_ENGINE_PORT` — Port to run on (default: 8090)

## Next Steps

- Section 3: Inventory Costing & Month-End Reports
- Section 4: Mobile/Tablet App (React Native)
- Section 5: Sales History & Menu Integration
