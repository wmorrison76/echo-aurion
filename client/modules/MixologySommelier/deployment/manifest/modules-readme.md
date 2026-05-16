# LUCCCA Sommelier Suite — Modules Overview

## Module Architecture

The LUCCCA Sommelier Suite is built as a modular microservices system where each module independently handles a specific business domain.

### 1. Core Backend (Port 8080)

**Purpose:** Central API hub for all resources (wines, inventory, purchases, users)

**Responsibilities:**

- User authentication & authorization
- Wine database management
- Inventory lot tracking
- Purchase order recording
- Pairing evidence storage

**Key Tables:**

- `wines` — Wine catalog with flavor profiles
- `inventory_lots` — Bottle-level tracking
- `recipes` — Dish definitions for pairing
- `users` — User accounts and roles

**Integration Pattern:**

```
Frontend → Backend → Supabase (PostgreSQL)
         → Pairing Engine
         → Inventory Costing
         → Sales Analytics
```

---

### 2. EchoAI³ Pairing Engine (Port 8090)

**Purpose:** Intelligent wine-food pairing recommendations

**Responsibilities:**

- Compute pairing scores (0-100)
- Generate AI-powered rationales
- Store pairing evidence
- Support bulk pairing computation

**API:**

```
POST /pairings/compute/:recipeId → {wine_id, score, rationale}
POST /pairings/compute-all → Batch operation for all recipes
```

**Dependencies:**

- OpenAI API (gpt-4o-mini)
- Core Backend (wine/recipe data)

**Integration:**
Called from PairingPanel component when user requests suggestions.

---

### 3. EchoCellar Ops (Port 8100)

**Purpose:** Month-end costing, COGS reconciliation, variance analysis

**Responsibilities:**

- Calculate COGS (Opening + Purchases - Closing)
- Compute beverage cost percentage
- Track inventory variance
- Support FIFO/LIFO/WAC valuation methods

**API:**

```
GET /reports/month-end/:venueId/:month → {opening, cogs, costPct}
GET /reports/variance/:venueId/:month → Variance analysis
GET /reports/fifo/:venueId/:month → FIFO valuation
```

**Integration:**
MonthEndReport dashboard subscribes to this service for metrics.

---

### 4. Sales & Menu Analytics (Port 8120)

**Purpose:** Sales mix analysis, POS integration, pairing performance tracking

**Responsibilities:**

- Analyze wine vs food revenue split
- Identify top-performing pairings
- Track missed pairing opportunities
- Sync menu items from POS systems

**API:**

```
GET /analytics/mix/:venueId → {wineRevenue, foodRevenue, winePercent}
GET /analytics/top/:venueId → Top pairings by sales
POST /analytics/menu/sync → Ingest POS menu
```

**Integration:**
SalesAnalyticsDashboard pulls data for revenue charts.

---

### 5. IoT Cooler Monitor (Port 8140)

**Purpose:** Real-time temperature monitoring and cellar health alerts

**Responsibilities:**

- Subscribe to MQTT sensor topics
- Log temperature readings
- Evaluate against venue thresholds
- Generate alerts for out-of-range temps

**API:**

```
GET /alerts/:venueId → Active alerts
GET /alerts/:venueId/avg → Temperature averages
POST /alerts/sensor/attach → Register new sensor
```

**Integration:**
AlertsPanel auto-refreshes (5 min) to show critical alerts.

**MQTT Topics:**

```
luccca/cooler/{sensorId}/temp → Publishes temperature (°C)
```

---

### 6. EchoAI³ Education & Training (Port 8150)

**Purpose:** Master Sommelier-level training and certification

**Responsibilities:**

- Generate AI flashcards for wine regions
- Simulate blind-tasting exams (3 difficulty levels)
- Track user progress and scores
- Maintain leaderboards

**API:**

```
GET /training/flashcards/:topic → AI-generated flashcard deck
GET /training/exam/blind?region=Burgundy&difficulty=2 → Exam scenario
POST /training/exam/submit → Record exam attempt
GET /training/leaderboard → Top performers
```

**Integration:**
TrainingDeck and BlindTastingExam components consume these APIs.

---

### 7. EchoVinum Grand Archive (Port 8160)

**Purpose:** 75-year global wine intelligence database

**Responsibilities:**

- Preserve vintage records (1950+)
- Store producer lineage and history
- Generate decade summaries
- Provide historical reference for education

**API:**

```
GET /archive/vintage/:region/:year → Vintage record + AI summary
GET /archive/vintage/decade/:region/:start → 10-year overview
GET /archive/producer/:name → Producer history
```

**Integration:**
VintageTimeline and ProducerCard components fetch data.
Used in education module for training context.

---

### 8. EchoServe Mobile (React Native + Expo)

**Purpose:** Offline-first field toolkit for sommeliers

**Platforms:**

- iOS (App Store)
- Android (Google Play)
- Web (Responsive)

**Key Screens:**

1. Dashboard — KPIs, active wines, cost %
2. Cellar — Search & manage inventory
3. Pairing — Get wine suggestions for dishes
4. Training — Flashcards & blind tastings
5. Settings — Sync control, preferences

**Offline Architecture:**

- Local SQLite for wines, inventory, pairings
- AsyncStorage for settings
- Background sync (15 min) when online
- Push notifications via Firebase

**Integration:**
Mobile app is a peer client; it calls the same REST APIs as web.

---

## Module Communication Patterns

### Direct Dependencies

```
Frontend (Builder.io)
  ├→ Backend (8080)
  ├→ Pairing (8090)
  ├→ Costing (8100)
  ├→ Analytics (8120)
  ├→ IoT (8140)
  ├→ Training (8150)
  └→ Archive (8160)

Mobile App (React Native)
  └→ Same REST API endpoints as Frontend

Pairing Engine (8090)
  └→ Backend (for wine/recipe data)
  └→ OpenAI (external)

IoT Monitor (8140)
  └→ MQTT Broker (for sensor data)
  └→ Backend (to log alerts)
```

### Async Patterns

- MQTT sensors → IoT Monitor → Database → AlertsPanel (5 min poll)
- Exam submissions → Training service → Database → Leaderboard (eventual consistency)
- Menu sync → Analytics service → Recipes table → Pairing recalculation

---

## Deployment Strategy

### Local Development

```bash
docker-compose up
# Spins up all services + PostgreSQL + MQTT broker
# Services auto-wire via docker network
```

### Staging/Production

```
Backend → Render / Fly.io / Railway
Each Service → Same (containerized microservice)
Database → Supabase Cloud (managed PostgreSQL)
MQTT → Self-hosted or cloud provider (HiveMQ, etc.)
Frontend → Netlify / Vercel (Builder.io)
```

---

## Data Flow Examples

### Example 1: Pairing Request

```
1. User selects dish on Pairing screen
2. Frontend → POST /pairings/compute/:recipeId
3. Pairing engine fetches wines from Backend
4. AI analyzes each wine against recipe
5. Returns top 5 pairings with scores
6. Frontend renders results with rationales
```

### Example 2: IoT Alert

```
1. Sensor publishes temp to MQTT: luccca/cooler/sensor-001/temp → 25.3
2. IoT Monitor subscribes, receives message
3. Checks venue thresholds (min 8°C, max 18°C)
4. Temperature out of range → INSERT alert
5. AlertsPanel polls /alerts/:venueId every 5 min
6. Displays critical alert to sommelier
```

### Example 3: Month-End Reporting

```
1. Manager navigates to /reports/month-end/:venueId/:month
2. Frontend → GET /reports/month-end/:venueId/:month
3. Costing service queries inventory_lots and sales tables
4. Calculates: Opening + Purchases - Closing = COGS
5. Returns { cogs: $9,300, costPct: 28.5 }
6. Frontend renders MonthEndReport dashboard
```

---

## Scaling & Performance

### Caching Strategy

| Data      | TTL | Invalidation             |
| --------- | --- | ------------------------ |
| Wines     | 1h  | Wine created/updated     |
| Inventory | 15m | Quantity changed         |
| Pairings  | 24h | Wine/recipe updated      |
| Archive   | 7d  | Vintage/producer updated |
| Reports   | 1h  | Sales recorded           |

### Rate Limits

- General API: 100 req/min
- Pairing: 50 req/hour (AI-expensive)
- Archive: 10 req/sec (read-heavy)

### Load Balancing

In production, use:

- Nginx or AWS ALB in front of services
- PostgreSQL read replicas for reporting
- Redis for session caching

---

## Integration Checklist

- [ ] All services can reach PostgreSQL
- [ ] MQTT broker is accessible from IoT Monitor
- [ ] OpenAI API key configured in env
- [ ] Frontend Builder.io has API endpoints configured
- [ ] Auth tokens properly validated in Backend
- [ ] CORS configured for cross-origin requests
- [ ] SSL/TLS enabled in production
- [ ] Database backups enabled
- [ ] Error monitoring (Sentry) active
- [ ] APM dashboards (DataDog/New Relic) configured
