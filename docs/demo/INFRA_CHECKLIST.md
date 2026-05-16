# Infra Checklist — Day 14 Demo Readiness

> Concrete, action-able. Every item is either William-only (your access/credentials/decisions) or me-runnable (I do it once you provide the input).
>
> Status legend: ✅ done · ⚠️ partial · ❌ not started · 🔒 blocked-on-William · 🤖 me-runnable

---

## A. DATABASE_URL_TEST (Neon test branch)

**Status:** 🔒 blocked-on-William

**Why it matters:** unblocks 66 DB-gated integration tests + lets the demo seed run.

### Steps for William

1. Open Neon dashboard
2. Find your prod project
3. Click "Branches" → "Create branch"
4. Name it `echo-resonance-test`
5. Branch from your prod main DB
6. Copy the connection string (it'll look like `postgres://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/<dbname>?sslmode=require`)
7. At the repo root, create `.env.test` if it doesn't exist:
   ```
   DATABASE_URL_TEST=<paste connection string here>
   ```
8. **Tell me when this is set.** I'll run the integration tests and the seed script.

### What I do once you've set it

- Run `pnpm test` — 66 skipped tests light up; I report which pass / which need fixes
- Run `pnpm tsx scripts/echo-resonance/seed-demo-fixture.ts` — populates the trajectory_dashboard with the fixture data
- Run the migrations against the test DB to verify they apply cleanly

---

## B. Production env vars (verify checklist)

**Status:** 🔒 blocked-on-William verification

### What to check on prod

```bash
echo $DATABASE_URL       # Neon prod connection — should be set
echo $JWT_SECRET         # ≥ 32 random chars — should be set
echo $NODE_ENV           # 'production' — should be set
```

### TELL ME
- [ ] `DATABASE_URL`: set / missing
- [ ] `JWT_SECRET`: set / missing / weak
- [ ] `NODE_ENV`: production / development / other

### Optional but recommended
- [ ] `REDIS_URL` — for idempotency cache persistence across restarts (Phase 1 in-memory works fine without it; Phase 2+ wants it)
- [ ] `ECHO_DECAY_INTERVAL_MS` — defaults to 1h (3,600,000)
- [ ] `SENTRY_DSN` — for error reporting

---

## C. Integration credentials

**Status:** 🔒 blocked-on-William

### TELL ME (just fill in the table)

| System | Have credentials? (yes / sandbox / no) | Working endpoint URL? |
|---|---|---|
| Profitsword | _____ | _____ |
| Craftable | _____ | _____ |
| OnTrack | _____ | _____ |
| UKG | _____ | _____ |
| Power BI | _____ | _____ |

### What I do with each answer

- **yes + URL:** I wire the integration directly; demo runs against live data
- **sandbox:** I wire to sandbox; demo runs but with synthetic data behind it
- **no:** I mock the integration with a "here's what this looks like once we connect" framing per BUILD_STATE-2 §3.4. EDFs accept pilot-stage limits as long as we're honest.

---

## D. Property fixture

**Status:** ⚠️ partial — example shape filled in; TODOs awaiting your edits

**File:** `tests/fixtures/echo-resonance/property-fixture.ts`

The fixture has ONE outlet, ONE staff member, and ONE visit fully filled in as the example shape. Five additional outlets, seven additional staff, and four additional visits are TODO entries you can replace at your own pace.

### TELL ME (replace TODOs)

**Outlets** — your 4-6 dining/wellness/marina rooms. Format:
```
"Victoria's: Michelin-tier tasting room, 8 tables, intimate"
"Sand Bar: pool-side casual, all-day service"
"Atlas: lobby bar, cocktail-forward, late-night"
...
```

**Staff** — 12-18 first names + roles. Format:
```
"Maria - captain - Victoria's"
"James - sommelier - Victoria's"
"Sara - front desk lead"
"Daniel - concierge"
...
```

**Active visits** — 5-8 guests. Format:
```
"Henderson, party of 2, anniversary, 6pm Friday, low-pos (delayed flight)"
"Chen group, party of 8, business deal, 7:30pm, high-pos"
"Brown solo, party of 1, business, 8pm, low-neg"
...
```

Even rough notes are enough. I convert format → TypeScript fixture rows + UUIDs.

---

## E. Hosting target for Day 14

**Status:** 🔒 blocked-on-William

### TELL ME (pick one)
- [ ] Demo runs on my laptop locally
- [ ] Deployed to: ____________ (Railway / fly.io / Vercel / DigitalOcean / other)
- [ ] Not sure yet — let's pick later

### What I do for each answer

- **Laptop locally:** add `pnpm demo:start` script that runs server + client + seeds the fixture in one command
- **Deployed:** help with the deploy config (Dockerfile, env vars, GitHub Actions)
- **Not sure:** we pick on Day 11

---

## F. Day 12 dry run

**Status:** 🔒 blocked-on-the-week's progress

### Pre-mortem on the dry run

The Day 12 dry run is when SYSTEM_SMOKE_TEST.md + SYSTEM_STRESS_TEST.md run back-to-back against the demo environment with real data. Pass on Day 12 = ship on Day 14.

### TELL ME
- [ ] Day 12 = which calendar date for you?
- [ ] Backup laptop ready by then? (yes / no / will be)
- [ ] Mobile hotspot tested? (yes / no / will be)

---

## G. Camila / runway / personal infra

**Status:** 🔒 blocked-on-William reflection (foundation smoke test #2.2)

### What FOUNDATION_SMOKE_TEST.md flagged

> *"if EDF says yes but pilot is unpaid for 90 days, what's the bridge?"*

### TELL ME (no judgment, just the answer)
- [ ] If pilot signs but is unpaid for 90 days, the bridge is: ____________
- [ ] Day 14 demo fails → Day 15 plan: ____________
- [ ] Camila's read on the runway, your version: ____________

I don't write these answers — you do. The smoke test says they need to exist, not that I produce them.

---

## What I'm running right now without you

While you fill in the TELL MEs above, I am:
- ✅ Running `pnpm test` baseline regularly to catch regressions
- ✅ Keeping main green on every commit
- ✅ Holding the audit/cluster/runbook docs current as code lands
- ⚠️ Not deploying anything (no hosting target yet)
- ⚠️ Not testing the integrations (no credentials yet)
- ⚠️ Not seeding production with the fixture (refuses to run without DATABASE_URL_TEST)

---

*Yes Chef. Infra checklist on the line. Fill what you can, when you can.*
