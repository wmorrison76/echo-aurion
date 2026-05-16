# LUCCCA Sommelier Suite — Deployment & Integration Guide

**Enterprise-ready SaaS platform for hospitality beverage management.**

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- PostgreSQL 15+ (or use Supabase)
- OpenAI API key
- MQTT broker (included in compose, or use external)

### Local Development (5 minutes)

```bash
# 1. Clone and navigate
git clone <repo-url>
cd luccca-sommelier-suite

# 2. Create .env file
cp .env.example .env
# Edit .env with your API keys:
# OPENAI_API_KEY=sk-...
# DATABASE_URL=postgresql://luccca:luccca123@localhost:5432/sommelier_db

# 3. Start all services
docker-compose up

# 4. Initialize database (in another terminal)
docker exec -it luccca_backend npm run db:init
docker exec -it luccca_backend npm run db:seed

# 5. Access services
Backend: http://localhost:8080
Pairing: http://localhost:8090
Costing: http://localhost:8100
Analytics: http://localhost:8120
IoT: http://localhost:8140
Training: http://localhost:8150
Archive: http://localhost:8160
MQTT: localhost:1883
```

---

## Production Deployment

### Architecture

```
┌─────────────────────────────────────┐
│   Netlify/Vercel (Frontend)         │
│   Builder.io + Figma Design System  │
└──────────────┬──────────────────────┘
               │
        ┌──────┴────────────────────────┐
        │                               │
┌───────▼────────┐         ┌────────────▼────────┐
│ Render/Fly.io  │         │   Supabase Cloud    │
│  Core Backend  │         │   PostgreSQL + Auth │
│  (8080)        │         │                     │
├────────────────┤         └─────────────────────┘
│ Pairing (8090) │
│ Costing (8100) │         ┌─────────────────────┐
│ Analytics...   │         │   HiveMQ / CloudMQ  │
│ Training...    │         │   MQTT Broker       │
│ Archive (8160) │         │                     │
└────────────────┘         └─────────────────────┘
```

### Step 1: Prepare Infrastructure

#### Supabase Cloud Setup

1. Create Supabase project at https://supabase.com
2. Run migrations in Supabase SQL editor (from `db/schema.sql`)
3. Seed initial data (from `db/seed_*.sql`)
4. Get connection string: Settings → Database → Connection Pooling
5. Set `DATABASE_URL` environment variable

#### MQTT Broker Setup

Option A: Self-hosted

```bash
docker run -d -p 1883:1883 eclipse-mosquitto:latest
```

Option B: Cloud provider

- HiveMQ Cloud (free tier)
- AWS IoT Core
- Azure IoT Hub

Set `MQTT_BROKER_URL` environment variable.

---

### Step 2: Deploy Backend Services

#### Option A: Render (Recommended)

1. Fork repository on GitHub
2. Create new Web Service on Render
3. Connect GitHub repo
4. Set environment variables:
   - `DATABASE_URL`: Supabase connection string
   - `OPENAI_API_KEY`: Your API key
   - `NODE_ENV`: production
5. Deploy!

Build command:

```bash
npm install
```

Start command:

```bash
npm run db:init && node backend/app.ts
```

#### Option B: Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Create app
fly apps create luccca-backend

# Deploy
fly deploy

# Set secrets
fly secrets set DATABASE_URL=postgresql://...
fly secrets set OPENAI_API_KEY=sk-...
```

#### Option C: AWS/GCP/Azure

- Use managed Kubernetes (EKS, GKE, AKS)
- Deploy via Docker images to container registry
- Use CI/CD pipeline (GitHub Actions, GitLab CI)

---

### Step 3: Deploy Frontend

#### Netlify

1. Connect GitHub repo
2. Build command:
   ```bash
   npm run build
   ```
3. Publish directory: `dist`
4. Set environment variables:
   - `VITE_API_BASE_URL`: https://api.luccca.io
   - `VITE_PAIRING_URL`: https://pairing.luccca.io
   - (etc. for each microservice)
5. Deploy!

#### Vercel

```bash
vercel
# Follow prompts to connect GitHub repo
```

---

### Step 4: Configure Builder.io

1. **Connect Data:**
   - Navigate to Builder.io Dashboard
   - Go to Data tab
   - Click "Add data source"
   - Select "REST API"
   - Add each service endpoint (from `deployment/builder-config/api-endpoints.json`)

2. **Import Components:**
   - Download `deployment/builder-config/component-map.json`
   - Import into Builder.io

3. **Connect Supabase:**
   - Data tab → Add Supabase data source
   - Paste Supabase URL and API key
   - Select tables to expose

4. **Publish:**
   - Hit "Publish" to make site live

---

### Step 5: Configure DNS & SSL

1. **Point Domain to Netlify/Vercel:**
   - Add DNS records (CNAME or NS)
   - Netlify/Vercel auto-provisions SSL certificate

2. **API Subdomain:**
   - Point `api.luccca.io` to backend service (Render, Fly.io)
   - Each microservice gets its own subdomain (optional) or all behind API gateway

---

## Environment Variables

### Core Backend

```env
DATABASE_URL=postgresql://user:pass@host/db
OPENAI_API_KEY=sk-...
NODE_ENV=production
PORT=8080
```

### Each Microservice

```env
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-... (for pairing, training, archive)
MQTT_BROKER_URL=mqtt://broker:1883 (for iot-monitor)
PORT=809X
```

### Frontend (Builder.io / Netlify)

```env
VITE_API_BASE_URL=https://api.luccca.io
VITE_PAIRING_URL=https://pairing.luccca.io
VITE_COSTING_URL=https://costing.luccca.io
(etc.)
```

---

## Database Initialization

### First Time Setup

```bash
# Via CLI (local)
psql $DATABASE_URL < db/schema.sql
psql $DATABASE_URL < db/seed_wines.sql
psql $DATABASE_URL < db/seed_recipes.sql

# Via Supabase UI
1. Open SQL editor
2. Copy schema.sql content, run
3. Copy seed files, run each
```

### Backups

```bash
# Supabase auto-backups daily
# Manual backup:
pg_dump $DATABASE_URL > backup.sql

# Restore:
psql $DATABASE_URL < backup.sql
```

---

## Monitoring & Logging

### Error Tracking (Sentry)

```bash
# 1. Create Sentry project
# 2. Set env variable in each service:
SENTRY_DSN=https://key@sentry.io/project

# 3. Dashboard automatically receives errors
```

### Performance Monitoring (DataDog)

```bash
# Set DD_TRACE_ENABLED=true in services
# View traces at datadoghq.com
```

### Logs

- **Netlify:** View in Dashboard → Functions
- **Render:** View in Service Logs
- **Fly.io:** `fly logs`
- **Docker:** `docker logs <container>`

---

## Troubleshooting

### Services Can't Connect to Database

```bash
# Check connection string
psql postgresql://user:pass@host/db

# Verify security groups/firewall allow port 5432
```

### OpenAI API Errors

```
Check API key validity
Verify organization has credits
Review rate limits (free tier is limited)
```

### MQTT Broker Not Responding

```bash
# Test connection
mosquitto_sub -h localhost -t "test"

# Check firewall allows port 1883
```

### Frontend Can't Reach Backend

- Verify `VITE_API_BASE_URL` is correct
- Check CORS headers in backend
- Verify backend is running and accessible

---

## Scaling to Production

### Key Optimizations

1. **Database:**
   - Enable read replicas for analytics queries
   - Add indexes (already done in schema.sql)
   - Configure connection pooling

2. **Cache Layer:**
   - Add Redis in front of API
   - Cache wines, vintages (long TTL)
   - Cache user sessions

3. **CDN:**
   - Netlify/Vercel auto-CDN frontend
   - Add CloudFlare for API caching

4. **Load Balancing:**
   - Use Nginx/HAProxy in front of services
   - Or use cloud LB (ALB, Cloud Load Balancer)

---

## Multi-Venue Setup

### Organization Structure

```
Organization
  ├─ Venue 1 (Restaurant)
  │   └─ Multiple users (sommeliers, managers)
  ├─ Venue 2 (Resort)
  │   └─ Multiple users
  └─ Venue 3 (Casino)
      └─ Multiple users
```

### Database

- One Supabase project (shared)
- `venue_id` foreign key on inventory_lots, sales, alerts
- Row-level security (RLS) ensures users see only their venue

### IoT

- Each venue gets separate MQTT sensors
- Topic pattern: `luccca/cooler/{venueId}/{sensorId}/temp`

---

## Security Best Practices

- [ ] All traffic HTTPS/TLS
- [ ] Database connection pooling enabled
- [ ] RLS policies enforced
- [ ] API keys rotated every 90 days
- [ ] Error logs do not expose secrets
- [ ] CORS restricted to known origins
- [ ] Rate limiting enabled (100 req/min)
- [ ] SQL injection prevented (use parameterized queries)
- [ ] CSRF protection active
- [ ] Backups tested monthly

---

## Support & Documentation

- **Docs:** https://docs.luccca.io
- **API Reference:** See `deployment/builder-config/api-endpoints.json`
- **Module Details:** See `deployment/manifest/modules-readme.md`
- **Support Email:** support@luccca.io

---

**Ready to launch? Let's go!** 🍷

For questions, reach out to the LUCCCA team.
