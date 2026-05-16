# EchoWaste — Development Addendum

**For:** Emergent build team
**From:** William / EchoAurum
**Version:** 1.0
**Supplements:** `EchoWaste-Emergent-Handoff-v1.0`
**Status:** Items 1–5 are **this-sprint blockers**. Items 6–10 are **this-month**. Items 11–16 are **post-MVP roadmap — spec now, build later.**

---

## Purpose

The original handoff package (v1.0) specified *what* to build. This addendum specifies *how* to build it robustly. These are the operational, governance, and quality items that separate a working prototype from a production-ready module.

**Drop these into your tracker. No back-and-forth needed on the principles — implementation details are yours to decide, as long as each item has an owner and a ship date.**

---

## Table of Contents

### 🔴 This Sprint (Blockers)
1. [Environment & Secrets Contract](#1-environment--secrets-contract)
2. [Feature-Flag Strategy From Day 1](#2-feature-flag-strategy-from-day-1)
3. [Observability From Hour One](#3-observability-from-hour-one)
4. [Prompt Versioning & Cost Guardrails](#4-prompt-versioning--cost-guardrails)
5. [Idempotency Contract](#5-idempotency-contract)

### 🟡 This Month
6. [Data Retention & Privacy Policy (In Code)](#6-data-retention--privacy-policy-in-code)
7. [Multi-Tenancy Isolation Test](#7-multi-tenancy-isolation-test)
8. [Model Version Pinning Per Property](#8-model-version-pinning-per-property)
9. [Ground Truth Evaluation Dataset](#9-ground-truth-evaluation-dataset)
10. [Manual Batch Entry (Paper-Sheet Bridge)](#10-manual-batch-entry-paper-sheet-bridge)

### 🟢 Post-MVP Roadmap (Spec Now, Build Later)
11. [Training Data Governance](#11-training-data-governance)
12. [Chef Attribution: Coaching Not Accusation](#12-chef-attribution-coaching-not-accusation)
13. [Offline Model Distribution](#13-offline-model-distribution)
14. [Accidental Training Leak Guard](#14-accidental-training-leak-guard)
15. [Repurpose & Donation Closed Loop](#15-repurpose--donation-closed-loop)
16. [Health Department Export](#16-health-department-export)

### Required Testing Mandates
### Questions We Expect Answered Now

---

# 🔴 This Sprint (Blockers)

## 1. Environment & Secrets Contract

**Why:** You're probably already improvising config. Get ahead of it.

**What to build:** A single `.env.example` at repo root. Everything below is required. Missing values fail app boot with a clear error, not a silent default.

```bash
# ─── Database ────────────────────────────────────────
DATABASE_URL=postgres://user:pass@host:5432/luccca
WASTE_SCHEMA=waste

# ─── Auth ────────────────────────────────────────────
LUCCCA_SSO_ISSUER=https://auth.luccca.example
LUCCCA_SSO_AUDIENCE=echowaste
LUCCCA_SSO_JWKS_URL=https://auth.luccca.example/.well-known/jwks.json
LUCCCA_SSO_CACHE_TTL_SECONDS=900

# ─── AI Proxy (existing Echo AI³ Railway service) ────
ECHO_PROXY_URL=https://echo-ai3.up.railway.app
ECHO_PROXY_KEY=<scoped dev key>
ECHO_VISION_MODEL=gpt-5.4v
ECHO_VISION_FALLBACK=claude-opus-4-7
ECHO_VOICE_MODEL=claude-opus-4-7
ECHO_VOICE_FALLBACK=claude-sonnet-4-6
ECHO_WHISPER_MODEL=whisper-large-v3
ECHO_PROXY_TIMEOUT_MS=10000

# ─── Blob Storage ────────────────────────────────────
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=echowaste-blobs
S3_REGION=us-east-1
S3_ACCESS_KEY=<dev key>
S3_SECRET_KEY=<dev secret>
S3_PRESIGNED_URL_TTL_SECONDS=900

# ─── LUCCCA Module Integrations ──────────────────────
ECHOLAYOUT_API_URL=https://api.luccca.example/echolayout
RECIPES_API_URL=https://api.luccca.example/recipes
PROPHET_API_URL=https://api.luccca.example/prophet
SCHEDULING_API_URL=https://api.luccca.example/scheduling
PURCHASING_API_URL=https://api.luccca.example/purchasing
GUARDIAN_API_URL=https://api.luccca.example/guardian

# ─── Mobile (Expo) ───────────────────────────────────
EXPO_PUBLIC_API_URL=https://api.dev.echoaurum.example/api/waste
EXPO_PUBLIC_SENTRY_DSN=<dsn>
EXPO_PUBLIC_POSTHOG_KEY=<key>
EXPO_PUBLIC_ENV=development

# ─── Feature Flags (defaults; overridden per property) ─
FEATURE_VOICE_CAPTURE=false
FEATURE_BUFFET_MODE=false
FEATURE_BLE_SCALE=false
FEATURE_PAR_SHEET=false
FEATURE_NETWORK_INTELLIGENCE=false

# ─── Cost Guardrails ─────────────────────────────────
AI_DAILY_SPEND_CAP_USD_PER_PROPERTY=50
AI_VISION_MAX_TOKENS_PER_CALL=20000
AI_VOICE_MAX_TOKENS_PER_CALL=4000
AI_CIRCUIT_BREAKER_ERROR_THRESHOLD=10  # consecutive errors before fallback
```

**Deliverable:**
- `.env.example` committed
- `docs/environment-variables.md` explaining each variable's source and impact
- App startup validation: fail fast with readable error if a required variable is missing
- Local dev can run against mocks if `ECHO_PROXY_URL=mock://`

---

## 2. Feature-Flag Strategy From Day 1

**Why:** Don't ship everything behind one kill switch. Phased rollout and A/B testing require named flags.

**What to build:**

Add a migration:

```sql
CREATE TABLE waste.feature_flags (
  property_id  uuid NOT NULL,
  flag_name    text NOT NULL,
  enabled      boolean NOT NULL DEFAULT false,
  variant      text,                       -- for A/B tests (e.g. "coaching_v2")
  rollout_pct  numeric(5,2) DEFAULT 100.0, -- gradual rollout support
  updated_by   uuid,
  updated_at   timestamptz DEFAULT now(),
  PRIMARY KEY (property_id, flag_name)
);

-- Global defaults (property_id = all-zeros UUID)
CREATE INDEX idx_feature_flags_lookup ON waste.feature_flags (property_id, flag_name)
  WHERE enabled = true;
```

**Required named flags** (must exist in Phase 1, even if off):

| Flag | Purpose |
|---|---|
| `feature.voice_capture` | Phase 2 voice-only mode |
| `feature.buffet_mode` | Phase 2 buffet set/close |
| `feature.ble_scale` | Phase 2 Bluetooth scale |
| `feature.par_sheet` | Phase 3 forecasting |
| `feature.network_intelligence` | Phase 3 benchmarks |
| `feature.coaching_v2` | A/B test slot for coaching cue improvements |
| `feature.recipe_match_llm_rerank` | A/B for LLM re-ranking on top of trigram |

**API:** `GET /api/waste/feature-flags?property_id=...` returns flat key-value map the mobile app caches.

**Admin UI** (Phase 1, minimal): toggle flags per property via the web dashboard.

---

## 3. Observability From Hour One

**Why:** Silent accuracy regressions will kill the product. You cannot debug what you cannot see.

**What to build:**

### Structured logging
Every AI call, every DB write, every capture event logs JSON:

```json
{
  "timestamp": "2026-04-22T10:18:45.231Z",
  "level": "info",
  "trace_id": "abc123",
  "span": "vision.video_scan",
  "property_id": "...",
  "entry_id": "...",
  "user_id": "...",
  "model": "gpt-5.4v",
  "prompt_version": "vision-video-scan@1.0.0",
  "latency_ms": 2180,
  "tokens_in": 18420,
  "tokens_out": 812,
  "cost_usd": 0.056,
  "confidence": 0.91,
  "item_count": 2,
  "result": "success"
}
```

### Metrics (OpenTelemetry, exported to Prometheus)

Required metrics:
- `echowaste.capture.e2e_latency_ms` (histogram, tagged by capture_mode)
- `echowaste.vision.latency_ms` (histogram, tagged by model)
- `echowaste.vision.confidence` (histogram, tagged by prompt_version)
- `echowaste.correction.rate` (gauge, tagged by user_id, outlet_id)
- `echowaste.coaching.events_per_capture` (histogram, tagged by event_type)
- `echowaste.sync.queue_depth` (gauge, tagged by property_id)
- `echowaste.ai.cost_usd_daily` (counter, tagged by property_id)
- `echowaste.errors.count` (counter, tagged by error_type)

### Trace propagation
Every capture gets a `trace_id` at the mobile app, propagated through:
- Upload request header (`X-Trace-Id`)
- API request header
- DB writes (stored in `waste.entries.trace_id` — **add column in a new migration**)
- Every downstream module call

### Error tracking
- Sentry (or equivalent) integrated in mobile, backend, and dashboard
- Source maps uploaded for RN builds (required for useful stack traces)
- PII scrubbed from error payloads (no voice transcripts, no chef names)

### Dashboards (minimum for launch)
- Latency dashboard: p50/p95/p99 for each capture mode
- Accuracy dashboard: confidence distribution, correction rate, unknown-item rate
- Cost dashboard: daily spend per property, running toward cap
- Health dashboard: error rates by endpoint, sync queue depth

---

## 4. Prompt Versioning & Cost Guardrails

**Why:** Prompts will change. Without versioning, a "small tweak" silently degrades accuracy across every property overnight.

**What to build:**

### Schema addition:

```sql
CREATE TABLE waste.prompt_versions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_name       text NOT NULL,       -- 'vision-video-scan', 'voice-extraction', etc.
  version           text NOT NULL,       -- semver: '1.0.0'
  system_prompt     text NOT NULL,
  model             text NOT NULL,
  temperature       numeric(3,2),
  schema_ref        text,                -- path to JSON schema
  active            boolean NOT NULL DEFAULT false,
  eval_f1           numeric(4,3),        -- F1 on ground-truth dataset
  eval_precision    numeric(4,3),
  eval_recall       numeric(4,3),
  deployed_at       timestamptz DEFAULT now(),
  deployed_by       uuid,
  deprecated_at     timestamptz,
  UNIQUE (prompt_name, version)
);

CREATE INDEX idx_prompt_versions_active
  ON waste.prompt_versions (prompt_name) WHERE active = true;
```

### Process:
- Every AI call records `prompt_version` in the log
- Only one version per `prompt_name` is `active` at a time
- Deploying a new version requires passing the ground-truth eval (see item #9) with **no F1 regression >2%**
- Rollback = `UPDATE waste.prompt_versions SET active = false WHERE id = ...; UPDATE ... SET active = true WHERE id = <previous>;`

### Cost Guardrails (Backend)

```typescript
// Pseudocode for the guardrail layer wrapping every AI call
async function callAI(property_id, prompt_name, input) {
  // 1. Check daily spend cap
  const spent_today = await getSpentToday(property_id);
  if (spent_today >= AI_DAILY_SPEND_CAP_USD_PER_PROPERTY) {
    throw new SpendCapExceededError();
  }

  // 2. Check circuit breaker
  if (isCircuitOpen(prompt_name)) {
    return callFallback(prompt_name, input);
  }

  // 3. Enforce token cap
  const tokens = estimateTokens(input);
  if (tokens > AI_VISION_MAX_TOKENS_PER_CALL) {
    throw new TokenCapExceededError();
  }

  // 4. Call, log cost
  const result = await executeAICall(prompt_name, input);
  await recordCost(property_id, result.cost_usd);

  // 5. Update circuit breaker
  if (result.error) incrementErrorCount(prompt_name);
  else resetErrorCount(prompt_name);

  return result;
}
```

**Circuit breaker:** 10 consecutive errors → open for 60 seconds → half-open (one test call) → closed on success.

**Fallback behavior when AI is unavailable:**
- Capture still succeeds — entry is written with `analysis_status: 'degraded'`
- On-device YOLO results are used as authoritative
- Entry flagged in dashboard as "awaiting re-analysis"
- Background job retries analysis when AI comes back

---

## 5. Idempotency Contract

**Why:** Offline-first + retries = duplicate captures without this. Chef uploads a video twice, gets two entries, dashboards are wrong, closed loops fire twice.

**What to build:**

### Mobile side
- Every capture has a device-generated `client_id` (UUID) created before submission
- `client_id` stored with the local queue item
- Retries send the same `client_id` every time

### Server side
- Every `/capture/*` endpoint accepts `Idempotency-Key` header (populated from `client_id`)
- Server maintains a 72-hour dedup index (already in schema via `client_id` unique constraint on `waste.entries`)
- Repeat submissions with the same key return the **original entry** with HTTP 200, not 409
- If the key exists but the body differs significantly, log a warning (potential client bug) but still return original

### Example:
```http
POST /api/waste/capture/video
Idempotency-Key: c8f3a9d1-2f4e-4b8e-9d42-7c1e0b3a5f92
Content-Type: application/json

{...}

# First call → 201 Created, new entry
# Second call with same key → 200 OK, existing entry
```

### Test to write immediately:
```
test('duplicate capture submission returns same entry', async () => {
  const body = makeVideoCaptureBody({ client_id: 'test-dedup-001' });
  const r1 = await post('/capture/video', body);
  const r2 = await post('/capture/video', body);  // same body, same key
  expect(r1.entry.id).toBe(r2.entry.id);
  expect(r2.status).toBe(200);  // not 201
});
```

---

# 🟡 This Month

## 6. Data Retention & Privacy Policy (In Code)

**Why:** Kitchens have staff who didn't opt into video. Some jurisdictions have strong biometric privacy laws (Illinois BIPA, GDPR, etc.). Retrofit is expensive.

**What to build:**

### Retention tiers (configurable per property)

```sql
ALTER TABLE waste.entries ADD COLUMN
  video_retention_tier text DEFAULT 'standard'
  CHECK (video_retention_tier IN ('minimal', 'standard', 'extended'));

-- Add to property settings table (new):
CREATE TABLE waste.property_settings (
  property_id uuid PRIMARY KEY,
  video_hot_days int NOT NULL DEFAULT 30,
  video_warm_days int NOT NULL DEFAULT 60,
  video_cold_days int NOT NULL DEFAULT 90,
  video_purge_days int NOT NULL DEFAULT 365,
  face_blur_enabled boolean DEFAULT false,  -- phase 2
  audio_retention_enabled boolean DEFAULT true,
  gdpr_mode boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);
```

### Background job (nightly)
- Move videos hot→warm→cold based on tier
- Purge blob + update `video_url = null` at purge threshold
- Keep `waste.entries` row forever (metadata is small and has reporting value)
- Keep low-res thumbnail + `frame_samples` forever for audit reference

### Per-user data export endpoint
```
GET /api/waste/users/:user_id/export
  → Returns JSON with all the user's captures + signed video URLs (24h expiry)
  → Required for GDPR "right to access"
```

### Per-user data deletion endpoint
```
DELETE /api/waste/users/:user_id/captures
  → Soft-deletes all of user's captures
  → Removes PII from voice transcripts (names, identifying language)
  → Writes audit record
  → Required for GDPR "right to erasure" and off-boarding
```

### Face blur (Phase 2, but scaffold now)
Mediapipe face detection runs on-device BEFORE upload. If `face_blur_enabled = true` for the property, faces are blurred in the upload. Always preserve the original on-device copy for 30 days so chefs can reference (then purge).

---

## 7. Multi-Tenancy Isolation Test

**Why:** Multi-property hotel groups are core customers. One hotel group seeing another's waste data is a contractual breach.

**What to build:**

### Write this test the first week and make it a CI gate:

```typescript
describe('multi-tenancy isolation', () => {
  const propertyA = 'prop-a';
  const propertyB = 'prop-b';
  const userA = createUser({ property_id: propertyA });
  const userB = createUser({ property_id: propertyB });

  beforeEach(async () => {
    await seedCaptures(propertyA, 10);
    await seedCaptures(propertyB, 10);
  });

  // Iterate through EVERY endpoint in the API
  for (const endpoint of ALL_ENDPOINTS) {
    test(`${endpoint} — user A cannot access property B data`, async () => {
      const response = await callEndpoint(endpoint, {
        user: userA,
        attemptedResource: propertyB,
      });
      // Either 403/404 or empty results — never 200 with property B data
      if (response.status === 200) {
        expect(response.body).toNotContainPropertyBData();
      }
    });
  }

  test('error messages do not leak cross-tenant info', async () => {
    // A user from property A hitting a property B resource must not get
    // an error message that confirms the resource exists
    const response = await callEndpoint('/entries/PROPERTY_B_ENTRY_ID', {
      user: userA,
    });
    expect(response.body.detail).not.toContain('property_b');
    expect(response.status).toBeOneOf([404]); // not 403 (which confirms existence)
  });
});
```

### Also verify:
- Every SQL query scoped by `property_id` at the ORM/query builder level
- No endpoint accepts `property_id` as a query parameter without verifying the JWT claims match
- Network Intelligence benchmarks never return raw property IDs (aggregates only, min 5 properties per peer group)
- Admin/support users require a different scope (`admin:read`) and every cross-tenant access is audit-logged

---

## 8. Model Version Pinning Per Property

**Why:** Don't let silent model updates break Tuesday morning.

**What to build:**

```sql
ALTER TABLE waste.property_settings ADD COLUMN
  vision_model_version text DEFAULT 'default',    -- 'default' = follow latest stable
  voice_model_version text DEFAULT 'default',
  on_device_model_version text DEFAULT 'default';
```

### Rollout process:
1. New model trained → deployed as `v1.2.0` alongside existing `v1.1.0`
2. Property settings default to `'default'` which resolves to the current stable
3. Opt-in properties run the new version on **shadow traffic** (every 10th capture runs both models, results compared but user sees v1.1.0 output)
4. After 2 weeks of shadow data: accuracy verified → `default` pointer moves to v1.2.0
5. Properties that pinned to a specific version stay on it until they upgrade manually

### Dashboard:
"Your property is on Vision Model v1.1.0 (stable since March 15). Model v1.2.0 is available — expected +2% count accuracy on pastries. [Enable shadow testing]"

---

## 9. Ground Truth Evaluation Dataset

**Why:** Every prompt change, every model update, every fine-tune must be measurable. Without this, you're guessing.

**What to build:**

From William's 200-300 labeled videos, pick 100 that form the eval set:
- 30 bakery (muffins, scones, pastries)
- 20 plated meals
- 20 bulk items (hotel pans, buckets)
- 10 buffet open scans
- 10 buffet close scans
- 10 edge cases (bad lighting, occlusion, novel items)

### Schema:

```sql
CREATE TABLE waste.ground_truth_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url text NOT NULL,
  scenario text NOT NULL,            -- 'bakery_overproduction', 'buffet_close', etc.
  ground_truth jsonb NOT NULL,       -- { items: [{name, quantity, recipe_id}] }
  difficulty text,                   -- 'easy', 'medium', 'hard'
  added_at timestamptz DEFAULT now(),
  added_by uuid,
  held_out boolean DEFAULT true      -- NEVER used in training
);
```

### Eval job (runs on every prompt version deployment):

```typescript
async function runEval(prompt_version_id: string) {
  const samples = await getGroundTruthSamples();
  const results = [];
  for (const sample of samples) {
    const prediction = await callVision(sample.video_url, prompt_version_id);
    const scoreboard = compareToGroundTruth(prediction, sample.ground_truth);
    results.push(scoreboard);
  }
  return {
    f1: computeF1(results),
    precision: computePrecision(results),
    recall: computeRecall(results),
    by_scenario: groupByScenario(results),
    by_difficulty: groupByDifficulty(results),
  };
}
```

### Deployment gate:
- New prompt cannot go active if F1 drops more than 2% from current stable
- New prompt cannot go active if any single scenario's F1 drops more than 5%
- Manual override allowed with a `override_reason` and approval from William

**These samples never feed into training. They are the eval truth forever.**

---

## 10. Manual Batch Entry (Paper-Sheet Bridge)

**Why:** Not every chef adopts day one. A manager who pastes a week of paper waste sheets as CSV bridges the adoption gap AND generates training signal.

**What to build:**

### Web dashboard feature: "Import Paper Sheets"

Uploader accepts CSV with columns:
```
date, daypart, station, item_name, quantity, unit, waste_type, reason, notes
```

Behavior:
- Parse row-by-row
- For each row:
  - Fuzzy-match `item_name` against recipes (use the trigram matcher)
  - Create a `waste.entries` row with `capture_mode = 'manual_import'`
  - Create a `waste.items` row with `detection_source = 'manual'`
  - Backdate `captured_at` to the row's date+daypart midpoint
- Show preview before commit: "120 rows will be imported. 108 matched recipes, 12 unmatched — review?"
- Unmatched rows shown in a correction UI where the manager picks the recipe

### Why this matters:
- Property onboarding accelerates — day one data instead of week one
- Training data accumulates faster for the cross-property model
- Skeptical chefs see their own waste patterns immediately, not in 2 weeks
- CSV is universal — every legacy waste-sheet PDF can be transcribed

Estimated effort: 4–8 hours. High leverage.

---

# 🟢 Post-MVP Roadmap (Spec Now, Build Later)

## 11. Training Data Governance

When corrections flow from 20+ properties, not all are trustworthy. Build the review workflow in Phase 3:

- `waste.training_feedback.excluded` flag (already in schema)
- Admin UI: filter corrections by property, user, rate, confidence delta
- Bulk exclude corrections from a property that's systematically mis-using the tool
- Fine-tune runs respect the exclusion filter
- Quarterly review cadence with William on data quality

---

## 12. Chef Attribution: Coaching Not Accusation

**A cultural/trust feature competitors don't think about.** It matters when the chefs' union notices the tool.

### Build these rules into the dashboard:

- **Shift-level attribution** by default, not individual
- Individual-level data accessible to managers only after 30 days of captures per user (avoids cherry-picking a bad first week)
- Staff leaderboards never surfaced publicly — only in private manager views with a toggle
- Guardian AI anomaly flags go to the chef first, not HR
- All waste-per-user queries logged in a property-admin-visible audit trail

### Implementation note:
Add a `waste.attribution_policy` setting per property: `shift_only` (default) / `individual_allowed`. Enforces the rule at query time.

---

## 13. Offline Model Distribution

On-device YOLO weights will update over time. Plan now:

- Models hosted on CDN (CloudFront / similar)
- App checks for new version on launch, wifi-gated
- Model signed with Ed25519; signature verified before loading
- Version pinned in property settings (see #8)
- Rollback-safe: keep last 2 model versions on device

Without this, model improvements are stuck behind App Store review cycles (2–7 days of delay).

---

## 14. Accidental Training Leak Guard

Prevent a failure mode: bored staffer mashing "correct" to seem productive, corrupting the training signal.

### Detection rules:
- User correcting >50% of items across 20+ captures → flag for review
- Median time-between-corrections <1.5 seconds → bot-like behavior flag
- Same correction pattern repeated >5 times in a row → suspicious

### Enforcement:
- `waste.training_feedback.training_weight` already in schema — set to 0.3 for flagged users' corrections
- Manual admin override to fully exclude
- Never surface flags to the user (no accusation)
- Quarterly review with William

---

## 15. Repurpose & Donation Closed Loop

**Spec the data shape now so Phase 3 reports work.**

`waste.buffet_sessions.overproduction_calc.disposition` values:
- `wasted` (default)
- `donated`
- `staff_meal`
- `repurposed`
- `pending` (decision not yet made)

### Phase 3 features that consume this:
- Daily digest shows "X% waste, Y% donated, Z% repurposed"
- Repurpose suggestions: "Tomorrow's menu has Breakfast Hash — use these eggs?"
- Donation partner integrations (Copia, Food Rescue US, Too Good To Go APIs)
- Tax-deduction reports (US: Bill Emerson Good Samaritan Act documentation)

### Ensure Phase 1 code:
- Emits all enum values in API responses (even if UI only shows `wasted` for now)
- No schema migration needed to enable Phase 3 features

---

## 16. Health Department Export

In some US jurisdictions, waste logs for TCS food (Time/Temperature Controlled for Safety) are required by code.

### Phase 3 feature: "Compliance Export"
Generates a PDF from `waste.entries` filtered by date range, formatted for health department submission:
- All spoilage events with date/time
- Reason codes
- Photos/videos available on request
- Property name + manager signature line
- Compliant with FDA Food Code §3-501.17 and local variants

### Phase 1 data requirements (already in schema):
- `waste.entries.captured_at` (precise timestamp)
- `waste.entries.waste_type = 'spoilage'`
- `waste.entries.reason_code`
- `waste.entries.video_url` (retention must exceed audit window — typically 90 days)

Ensure retention settings allow properties to extend video retention for compliance (see #6).

---

# Required Testing Mandates

**These are not negotiable. Required in CI by end of Phase 1.**

### Unit tests
- All `waste.*` business logic (delta math, par generation, recipe matching rank, reason-code validation, state machines)
- Target: 80%+ coverage on `services/api/src/` outside of wiring code

### Contract tests
- Mobile ↔ backend contract verified via OpenAPI (Prism or Dredd)
- Every PR that touches the API or mobile client re-runs contract tests
- Contract drift is a build failure

### Integration tests
- Full capture pipeline: upload → vision → recipe match → DB write → dashboard query
- Runs against dockerized Postgres + mocked AI proxy
- Required on every PR

### E2E tests
- 14-day acceptance scenario (pan 10 muffins → logged with value) as a Detox or Maestro test
- Runs on every PR against a dev simulator
- Must pass before merge

### Load tests
- Sync storm: 20 properties coming back online simultaneously after WiFi outage — what breaks?
- Target: p95 latency <500ms under 100 concurrent capture submissions
- Run weekly, report in Slack

### Golden prompt tests
- The "Testing" section in each prompt file becomes a CI job
- Any prompt change that fails golden tests blocks merge
- Target: Phase 1 ships with all 8 prompts having ≥3 golden test cases each

### Multi-tenancy isolation
- See item #7
- Every endpoint tested for cross-tenant leakage
- Required CI gate

### Migration tests
- Run all migrations from a fresh DB → verify schema matches snapshot
- Run all rollbacks → verify DB returns to prior state
- Required CI gate

---

# Questions We Expect Answered Now

Respond in the `#echowaste-build` Slack channel by end of this week:

1. **"How are you handling the offline sync race conditions?"**
   Specifically, what happens when a user corrects an item on their phone, then the server-side rescan completes with different results? Who wins?

2. **"Are you using the on-device YOLO results as authoritative, or just as hints to the cloud vision call?"**
   The brief says hints-only. Confirm and show where in the code.

3. **"What's your strategy when the vision API is slow (>5 seconds)?"**
   Loading state, or log optimistically and update later? Either is fine — we just need to know.

4. **"How are you typing the `bounding_tracks` jsonb structure?"**
   It's semi-structured. Show us the TypeScript type — it should not be `any`.

5. **"What's your rollback plan if a prompt change tanks accuracy?"**
   See item #4. Walk us through the procedure.

6. **"Are you building the dashboard as a new panel in the existing LUCCCA panel system, or as a standalone SPA?"**
   The brief says panel. Confirm you're not building a separate app.

7. **"Show us the error states."**
   What does the app look like when S3 upload fails, when the proxy times out, when the recipe DB is unreachable? Screenshots or videos.

8. **"What's your chosen state management library and why?"**
   Zustand, Redux Toolkit, Jotai — we don't care which, but we want to see a one-paragraph rationale.

9. **"How are you handling device-clock skew?"**
   If a chef's phone clock is 10 minutes off, captures get the wrong `captured_at`. What's the mitigation?

10. **"Where does the neural orb component live?"**
    We're shipping a component export from Echo AI³ via Builder.io. Confirm it slots cleanly into your RN project without forking.

---

# Addendum Status

| Item | Owner | Target Date | Status |
|---|---|---|---|
| 1. Environment & Secrets | Emergent backend | Sprint 1 | ☐ |
| 2. Feature Flags | Emergent backend | Sprint 1 | ☐ |
| 3. Observability | Emergent full-stack | Sprint 1 | ☐ |
| 4. Prompt Versioning | Emergent backend | Sprint 1 | ☐ |
| 5. Idempotency | Emergent backend | Sprint 1 | ☐ |
| 6. Data Retention | Emergent backend | Sprint 2 | ☐ |
| 7. Multi-Tenancy Test | Emergent QA | Sprint 2 | ☐ |
| 8. Model Version Pinning | Emergent backend | Sprint 3 | ☐ |
| 9. Ground Truth Eval | William + Emergent ML | Sprint 2 | ☐ |
| 10. Batch Entry | Emergent full-stack | Sprint 2 | ☐ |
| 11–16 | Deferred to post-MVP | — | ☐ |

---

**End of addendum. Questions → `#echowaste-build` Slack. Non-urgent architecture debate → weekly Thursday sync.**
