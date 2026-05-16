# EchoAI³ Education & Training Module

**Purpose:** Master Sommelier-level training using AI-generated flashcards, blind-tasting simulations, and performance tracking. Integrates with EchoVinum archive and EchoSommelier AI³.

## Features

- **AI Flashcards** — GPT-4 generated training cards for any wine region
- **Blind-Tasting Simulations** — Realistic exam scenarios at 3 difficulty levels
- **Performance Tracking** — Score history, progress analytics, leaderboards
- **Personalized Learning** — Track by exam type, region focus, difficulty
- **Progress Analytics** — Average scores, best attempts, improvement trends

## Tech Stack

- **Express.js** — REST API
- **OpenAI GPT-4** — Content generation
- **PostgreSQL** — Exam history and scores
- **Luxon** — Date/time handling

## Setup

### Prerequisites

- Node.js 18+
- OpenAI API key
- PostgreSQL

### Installation

1. Create `.env` file:

   ```
   DATABASE_URL=postgresql://user:pass@localhost:5432/sommelier_db
   OPENAI_API_KEY=sk-...
   TRAINING_PORT=8150
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create database table:

   ```sql
   CREATE TABLE IF NOT EXISTS training_exams (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID NOT NULL,
     exam_type TEXT,
     score NUMERIC(5,2),
     answers JSONB,
     taken_at TIMESTAMP DEFAULT NOW()
   );
   ```

4. Start service:
   ```bash
   npm run dev
   ```

Service will run on `http://localhost:8150`

## API Endpoints

### GET /training/flashcards

Generate AI-powered flashcards for wine training.

**Query Parameters:**

- `topic` — Wine region or varietal (e.g., "Burgundy", "Cabernet Sauvignon"; default: "Global")
- `count` — Number of cards to generate (default: 5)

**Response:**

```json
{
  "status": "ok",
  "topic": "Burgundy",
  "count": 5,
  "data": [
    {
      "wine_id": "uuid",
      "topic": "Burgundy",
      "question": "What are the primary characteristics of red Burgundy?",
      "answer": "Red Burgundy is based on Pinot Noir and is known for its elegance, silky tannins, and complex red fruit aromatics. Wines from the Côte d'Or region offer structure and aging potential, while lighter styles come from the Côte Chalonnaise..."
    }
  ]
}
```

### GET /training/progress/:userId

Get user's training progress and statistics.

**Response:**

```json
{
  "status": "ok",
  "data": {
    "userId": "user-uuid",
    "totalAttempts": 24,
    "avgScore": 78.5,
    "exams": [
      {
        "examType": "flashcards",
        "avgScore": 82.3,
        "bestScore": 95.0,
        "worstScore": 65.0,
        "attemptCount": 12
      }
    ]
  }
}
```

### GET /training/exam/blind

Generate a blind-tasting scenario for practice or assessment.

**Query Parameters:**

- `region` — Wine region to focus on (e.g., "Bordeaux", "California", "Rhone"; default: "Bordeaux")
- `difficulty` — 1 (Beginner), 2 (Advanced), 3 (Master); default: 2

**Response:**

```json
{
  "status": "ok",
  "data": {
    "region": "Bordeaux",
    "difficulty": "Level 2 (Advanced)",
    "scenario": "APPEARANCE:\nMedium ruby color with slight brick edges suggesting age...\n\nAROM A:\nInitial bouquet reveals dark cherry, leather, cedar...\n\nPALATE:\nMedium-full body, integrated tannins...\n\nREVEAL:\nPauillac, 2010"
  }
}
```

### POST /training/exam/submit

Submit an exam attempt and record the score.

**Body:**

```json
{
  "userId": "user-uuid",
  "examType": "blind-tasting",
  "score": 88.5,
  "answers": {
    "appearance": "Medium ruby",
    "aroma": "Dark cherry, leather, cedar",
    "guessedRegion": "Bordeaux",
    "guessedVarietal": "Cabernet Sauvignon"
  }
}
```

**Response:**

```json
{
  "status": "recorded",
  "exam_id": "exam-uuid",
  "taken_at": "2024-01-31T14:22:00Z"
}
```

### GET /training/exam/:examId

Get details of a specific exam attempt.

**Response:**

```json
{
  "status": "ok",
  "data": {
    "id": "exam-uuid",
    "userId": "user-uuid",
    "examType": "blind-tasting",
    "score": 88.5,
    "answers": {...},
    "takenAt": "2024-01-31T14:22:00Z"
  }
}
```

### GET /training/leaderboard

Get top performers across all exams or by type.

**Query Parameters:**

- `limit` — Number of top users (default: 10)
- `examType` — Filter by exam type (optional; e.g., "blind-tasting", "flashcards")

**Response:**

```json
{
  "status": "ok",
  "count": 10,
  "data": [
    {
      "rank": 1,
      "userId": "user-uuid-1",
      "bestScore": 98.5,
      "avgScore": 92.3,
      "attempts": 18
    }
  ]
}
```

## Training Modes

### 1. Flashcards

Quick drill-and-practice cards for wine identification and pairing.

- Generated per region/varietal
- Q&A format with detailed answers
- Can be integrated into mobile app

### 2. Blind-Tasting Simulations

Realistic exam scenarios mimicking WSET or Master Sommelier exams.

**Levels:**

- **Level 1 (Beginner)** — Simple appearance/aroma/basic guessing
- **Level 2 (Advanced)** — Full analysis with structure, age estimation
- **Level 3 (Master)** — Detailed sensory evaluation, multiple possibilities, justification required

### 3. Exam Tracking

- Score history per user
- Progress analytics
- Leaderboards for motivation

## Database Schema

### training_exams

```sql
CREATE TABLE training_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  exam_type TEXT,  -- 'flashcards', 'blind-tasting', 'pairing', etc.
  score NUMERIC(5,2),  -- 0-100
  answers JSONB,  -- User's answers in JSON format
  taken_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_training_user ON training_exams(user_id);
CREATE INDEX idx_training_exam_type ON training_exams(exam_type);
```

## Integration

### With Mobile App

Display flashcards in Training screen:

```typescript
const cards = await fetch(
  `http://localhost:8150/training/flashcards?topic=Burgundy&count=10`,
);
```

### With Backend

Track user progress in user profile:

```typescript
const progress = await fetch(
  `http://localhost:8150/training/progress/${userId}`,
);
```

### With EchoVinum Archive

Future: Link flashcards to historical vintage data for added context.

## Prompt Engineering

The service uses carefully crafted prompts to GPT-4 to ensure:

- **Accuracy** — Factually correct wine information
- **Realism** — Exam scenarios match actual WSET/MS standards
- **Pedagogy** — Educational value, not just trivia
- **Depth** — Covers aroma, structure, aging potential, pairing logic

Example flashcard topics (auto-generated):

- Regional characteristics (Burgundy, Bordeaux, Rhone, etc.)
- Varietal identification (Pinot Noir, Cabernet Sauvignon, Riesling, etc.)
- Vintage assessment (Great, good, average vintages by region)
- Pairing theory (Acidity-fat balance, tannin-umami, etc.)
- Service etiquette (Proper temperature, aeration, decanting)

## Performance Optimization

- **Cache flashcards** locally in mobile app after first generation
- **Batch exam submissions** to reduce API calls
- **Async score processing** to avoid blocking UI

## Next Steps

- **Certification Tracking** — Issue digital certificates for completed exams
- **Gamification** — Badges, streaks, achievement unlocks
- **Mobile Integration** — Full offline training with local SQLite sync
- **Pronunciation Guide** — Audio for wine names and regions
- **AR Visualization** — 3D wine structure visualization
- **Collaborative Learning** — Study groups, peer quizzes

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `OPENAI_API_KEY` or `ECHO_OPENAI_API_KEY` — OpenAI API key
- `TRAINING_PORT` — Service port (default: 8150)

## Troubleshooting

### GPT-4 API Errors

- Check OpenAI API key validity
- Verify API quota and rate limits
- Use `gpt-4o-mini` as fallback for cost savings

### No Exam Records

- Ensure training_exams table exists
- Verify user_id is a valid UUID
- Check database connection

## Support

For questions or feature requests, contact: support@luccca.io

---

**EchoAI³ v1.0.0** — Master Sommelier Training Powered by LUCCCA
