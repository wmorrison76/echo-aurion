# EchoVinum Grand Archive

**Purpose:** Preserve and augment 75+ years of global wine vintage data, producer lineage, and climate history. AI-powered analysis for education, forecasting, and investment insights.

## Features

- **Vintage Database** — Historical records for every major region/year
- **AI-Powered Summaries** — Climate, quality, and style evolution analysis
- **Producer Lineage** — Complete ownership and innovation history
- **Decade Analysis** — Stylistic trends and quality trajectories
- **Regional Intelligence** — Grouped producer data by wine region
- **Educational Content** — Auto-generated sommelier-grade summaries

## Tech Stack

- **Express.js** — REST API
- **OpenAI GPT-4** — Vintage and producer analysis
- **PostgreSQL** — Time-series wine data
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
   ARCHIVE_PORT=8160
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create database tables:

   ```sql
   CREATE TABLE IF NOT EXISTS vintages (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     region TEXT NOT NULL,
     year INT NOT NULL,
     rating INT,
     rainfall_mm NUMERIC,
     avg_temp NUMERIC,
     summary TEXT,
     created_at TIMESTAMP DEFAULT NOW(),
     UNIQUE(region, year)
   );

   CREATE TABLE IF NOT EXISTS producers (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     name TEXT UNIQUE NOT NULL,
     history TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_vintages_region_year ON vintages(region, year);
   CREATE INDEX idx_producers_name ON producers(name);
   ```

4. Start service:
   ```bash
   npm run dev
   ```

Service will run on `http://localhost:8160`

## API Endpoints

### GET /archive/vintage/:region/:year

Get or generate vintage record for a specific region and year.

**Example:**

```
GET /archive/vintage/Burgundy/2015
```

**Response:**

```json
{
  "status": "ok",
  "data": {
    "id": "uuid",
    "region": "Burgundy",
    "year": 2015,
    "rating": 8,
    "summary": "Exceptional vintage with perfect ripening conditions...",
    "created_at": "2024-01-31T14:22:00Z"
  }
}
```

### GET /archive/vintage/decade/:region/:start

Get AI-powered decade analysis (e.g., 1990-1999).

**Example:**

```
GET /archive/vintage/decade/Bordeaux/2000
```

**Response:**

```json
{
  "status": "ok",
  "region": "Bordeaux",
  "decade": "2000-2009",
  "summary": "The 2000s represented a period of consistent excellence in Bordeaux..."
}
```

### GET /archive/vintage/history/:region

Get all vintages for a region.

**Query Parameters:**

- `limit` — Results limit (default: 50)

**Response:**

```json
{
  "status": "ok",
  "region": "Burgundy",
  "count": 45,
  "data": [
    {
      "year": 2023,
      "rating": 9,
      "summary": "..."
    }
  ]
}
```

### GET /archive/vintage/best/:region

Get top-rated vintages for a region.

**Query Parameters:**

- `limit` — Results limit (default: 10)

**Response:**

```json
{
  "status": "ok",
  "region": "Burgundy",
  "count": 10,
  "data": [...]
}
```

### PATCH /archive/vintage/:region/:year

Update vintage with actual climate or rating data.

**Body:**

```json
{
  "rating": 9,
  "rainfall_mm": 450.5,
  "avg_temp": 18.2,
  "summary": "Exceptional vintage with perfect ripening conditions..."
}
```

### GET /archive/producer/:name

Get or generate producer history.

**Example:**

```
GET /archive/producer/Domaine%20Romanée-Conti
```

**Response:**

```json
{
  "status": "ok",
  "data": {
    "id": "uuid",
    "name": "Domaine Romanée-Conti",
    "history": "Founded in 1760 as a religious institution...",
    "created_at": "2024-01-31T14:22:00Z"
  }
}
```

### GET /archive/producers/search

Search producers by name or history.

**Query Parameters:**

- `q` — Search query (min 2 characters, required)
- `limit` — Results limit (default: 20)

**Example:**

```
GET /archive/producers/search?q=Domaine&limit=20
```

### GET /archive/producers

List all producers with pagination.

**Query Parameters:**

- `limit` — Results limit (default: 100)
- `offset` — Pagination offset (default: 0)

### GET /archive/producers/region/:region

Get producers from a specific region.

**Query Parameters:**

- `limit` — Results limit (default: 20)

### PATCH /archive/producer/:name

Update producer history or information.

**Body:**

```json
{
  "history": "Updated producer history text..."
}
```

## Database Schema

### vintages

Stores vintage records with climate data and AI-generated summaries.

```sql
CREATE TABLE vintages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region TEXT NOT NULL,
  year INT NOT NULL,
  rating INT,  -- 1-10 scale
  rainfall_mm NUMERIC,
  avg_temp NUMERIC,
  summary TEXT,  -- AI-generated analysis
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(region, year)
);
```

### producers

Stores winery/producer history and lineage.

```sql
CREATE TABLE producers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  history TEXT,  -- AI-generated lineage
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Data Sources

The archive integrates data from:

- Historical vintage records (public databases)
- Winery websites and official histories
- Academic wine research publications
- Professional tasting notes and criticism
- Climate/meteorological archives

Initial seed data should populate major wine regions from the past 75 years.

## AI-Powered Analysis

### Vintage Summaries

When a vintage is requested but not in the database, GPT-4o-mini generates:

- Climate conditions (temperature, rainfall, sunshine)
- Yield assessment and quality rating
- Stylistic characteristics
- Aging potential and recommended drinking windows

### Producer Histories

When a producer is requested but not in the database, GPT-4o-mini generates:

- Founding date and founder information
- Ownership history and lineage
- Regional focus and flagship wines
- Notable achievements and innovations
- Current philosophy and direction

### Decade Overviews

Multi-vintage summaries showing:

- Stylistic evolution across 10 years
- Climate patterns and their impact
- Quality trajectory and best buys
- Comparison to historical context

## Integration

### With Education Module

```typescript
// Get training content about vintage Burgundy
const vintage = await fetch(
  `http://localhost:8160/archive/vintage/Burgundy/2015`,
);
```

### With Mobile App

Display vintage information in the Archive/Timeline screen.

### With Pairing Engine

Fetch vintage summaries when recommending wines:

```typescript
const vintage = await fetch(
  `http://localhost:8160/archive/vintage/${wine.region}/${wine.vintage}`,
);
```

## Performance Notes

- **Caching:** Vintage and producer data should be cached locally after first generation
- **Batch Requests:** Use `/archive/vintage/history/:region` to fetch 50 years in one request
- **Search Optimization:** Producer search filters on name and history text

## Next Steps

- **Sentiment Analysis** — Analyze critic reviews by vintage
- **Investment Tracking** — Correlate price appreciation with vintage quality
- **Climate Modeling** — Predict future vintage quality based on climate patterns
- **AR Integration** — Visualize 75-year timeline in augmented reality
- **Mobile Offline** — Cache archive data for offline sommelier training

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `OPENAI_API_KEY` or `ECHO_OPENAI_API_KEY` — OpenAI API key
- `ARCHIVE_PORT` — Service port (default: 8160)

## Support

For questions or feature requests, contact: support@luccca.io

---

**EchoVinum v1.0.0** — 75-Year Global Wine Intelligence, Powered by LUCCCA
