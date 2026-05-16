# System Smoke Test — Echo Resonance End-to-End

> *Verifies Echo Resonance functions correctly under normal operating conditions.*
>
> **Run when:** After TICKET_003 services #1-7 land + TICKET_004 routes + initial frontend wiring. Realistic earliest run: Day 5-6 of the 13-day plan.
>
> **Run by:** Saucier executing tests in sequence; pass reviewing results between phases.
>
> **Pass criterion:** All Tier 1 tests pass cleanly; all Tier 2 tests pass with documented variance only; Tier 3 tests confirm operational fitness.
>
> **Companion documents:**
>   - `FOUNDATION_SMOKE_TEST.md` — paper-test of doctrine ↔ build coherence; runs first thing Phase A morning.
>   - `SYSTEM_STRESS_TEST.md` — runs back-to-back after this passes. Smoke test verifies *correct.* Stress test verifies *resilient.*
>
> **Doctrine alignment:** This is itself a Silent Service artifact. Test results are dev-team facing, never operator or guest facing. The system's pride is silent.

---

## Test environment requirements

Before running:

1. **Test database provisioned and migrations applied** — `DATABASE_URL_TEST` set, migrations 008-025 applied, schema verified
2. **Seed property fixture loaded** — Grand Floridian-shaped fixture per BUILD_STATE.md scoped seed plan
3. **Event generator wired** — produces realistic time-stamped events for one full service window
4. **All TICKET_003 services compiled and importable**
5. **Routes wired from TICKET_004**
6. **Frontend dashboard renders without console errors**

If any precondition fails, halt and remediate before running smoke tests. *No smoke testing on a partially-deployed system — false signals waste time.*

---

## Tier 1 — Foundation (must all pass)

These tests verify each layer in isolation. Each is fast (sub-second). Each is deterministic. **Any Tier 1 failure halts the run** — no point in higher-tier testing on a broken foundation.

### 1.1 — Database connectivity
**Asserts:** `server/database/connection.ts` opens a pool, executes a `SELECT 1`, closes cleanly.
**Pass:** Round trip < 100ms, no errors.
**Fail signal:** Connection refused, pool not created, query throws.

### 1.2 — Migrations applied correctly
**Asserts:** All 8 echo_resonance migrations (008-012, 015-018) report applied; schema includes all expected tables (signals, resonance_readings, resonance_trajectories, interventions_library, interventions_executed).
**Pass:** Schema query confirms all expected tables and indexes exist.
**Fail signal:** Missing table, missing column, wrong type.

### 1.3 — Foundation types load without error
**Asserts:** All 8 type files in `shared/types/{signals,resonance}/` import cleanly. `tsc --noEmit` on these files passes.
**Pass:** Zero type errors.
**Fail signal:** Any TypeScript error introduced by recent service work.

### 1.4 — signal-recorder.ts records a signal
**Asserts:** Service accepts a valid `NewSignalInput`, writes to `signals` table, returns the persisted row with correct `expires_at` based on sensitivity.
**Pass:** Row written. `expires_at` math correct per Tenet 7. Returned object matches schema.
**Fail signal:** Write fails, expires_at miscalculated, schema mismatch.

### 1.5 — signal-recorder.ts honors Tenet 8 forbidden contract
**Asserts:** Recording a `forbidden`-sensitivity signal succeeds at write-time, AND the row's `expires_at` is `<= now()` (i.e., would be swept by next decay tick).
**Pass:** Both assertions hold per the design contract from D2 in service #1.
**Fail signal:** Either assertion fails. *This is a doctrine-load-bearing test — Tenet 8 lives or dies here.*

### 1.6 — signal-query.ts returns recent signals correctly
**Asserts:** Query by property + time range returns expected rows. Cursor pagination works. Default sort `created_at DESC`. Forbidden-sensitivity signals do NOT appear in default results.
**Pass:** All four sub-assertions hold.
**Fail signal:** Wrong order, missing rows, or forbidden signals leaking into default queries.

### 1.7 — signal-decay.ts sweeps expired signals
**Asserts:** Run decay sweep against a database with known-expired test rows. Verify rows older than their retention window are deleted (or marked deleted per implementation). Verify rows within retention are preserved.
**Pass:** Expected rows removed, expected rows preserved, no over-sweep.
**Fail signal:** Wrong rows deleted, decay logic miscalculated.

### 1.8 — score.ts produces deterministic output for known input
**Asserts:** Pure-math score computation against a fixture of test inputs returns expected outputs. No DB, no async, no randomness.
**Pass:** Every input maps to documented expected output.
**Fail signal:** Any input produces unexpected score — math drift.

### 1.9 — resonance-engine.ts createReading writes complete record
**Asserts:** Given valid affect inputs, creates a ResonanceReading row, properly linking to property/visit/guest. Tenet 2 honored (`expires_at` is non-nullable). Transaction wraps multi-table writes correctly (touches readings + trajectories tables atomically).
**Pass:** All linkage correct, transaction either fully commits or fully rolls back on simulated failure.
**Fail signal:** Partial writes possible, expires_at nullable, transaction not honored.

### 1.10 — trajectory-engine.ts updateTrajectory advances state correctly
**Asserts:** Apply sequence of readings to a trajectory. Verify the trajectory state evolves correctly: green → amber thresholds, reading count increments, no orphan records.
**Pass:** State transitions match spec. Reading count accurate.
**Fail signal:** Trajectory drift, miscounted readings, orphan records.

### 1.11 — intervention-library.ts findCandidates returns ranked options
**Asserts:** Given a trajectory in amber state, findCandidates returns at least one matching intervention template, ranked by relevance.
**Pass:** Non-empty result, candidates relevant per template metadata.
**Fail signal:** Empty result on amber trajectory, or candidates that don't match the situation.

### 1.12 — intervention-library.ts recordProposal persists correctly
**Asserts:** Proposing an intervention writes to `interventions_executed`, links correctly to the trajectory and template, captures timestamp.
**Pass:** Row written, links resolve, timestamp accurate.
**Fail signal:** Missing link, missing timestamp, write fails.

---

## Tier 2 — Integration paths (variance allowed, document any deviation)

These tests verify cross-layer behavior. Some variance is acceptable (timing within tolerance, occasional retry, expected non-determinism in event ordering). **Document any variance; do not silently accept.**

### 2.1 — End-to-end signal-to-intervention flow
**Asserts:** Submit a synthetic guest observation as a signal → wait for decay/aggregation tick → confirm trajectory updated → confirm intervention candidate surfaced.
**Pass:** Full chain executes within reasonable time. Each stage's output feeds correctly into the next.
**Fail signal:** Chain breaks at any handoff. Common breakage: stage N writes data stage N+1 expects but in incompatible shape.

### 2.2 — Route layer accepts and validates input
**Asserts:** `POST /api/echo-resonance/readings` accepts a valid payload, validates per route-layer spec, persists via service, returns expected response shape.
**Pass:** Valid payload accepted, malformed payload rejected with clear 400, auth honored via `auth-jwt.ts` middleware.
**Fail signal:** Validation gaps, auth bypass, response shape mismatch.

### 2.3 — Floor view returns active trajectories
**Asserts:** `GET /api/echo-resonance/floor` returns currently-active trajectories for a property, with their state (green/amber/red), reading count, last-update timestamp.
**Pass:** Active trajectories returned, dormant ones omitted, timestamps accurate.
**Fail signal:** Wrong trajectories surface, stale data, missing fields.

### 2.4 — Dashboard tile renders from API data
**Asserts:** Frontend `TrajectoryDashboard` fetches from floor API, renders one tile per active trajectory, applies correct color per state.
**Pass:** Tiles render. Colors match state. Pseudonymization holds (no guest names visible).
**Fail signal:** Render error, wrong colors, guest PII leaking to UI.

### 2.5 — Whisper widget submits a reading
**Asserts:** Frontend tap-only WhisperWidget produces a valid signal payload, posts to API, receives confirmation, dashboard reflects update within ~3 seconds.
**Pass:** Round trip < 3 seconds end-to-end.
**Fail signal:** Submission fails, dashboard doesn't update, latency > 5 seconds.

### 2.6 — Intervention card surfaces approved cascade
**Asserts:** When an intervention is proposed, the InterventionCard renders correctly. One-tap approve fires the cascade through existing department-notification-cascader.
**Pass:** Card renders, approve fires cascade, downstream notifications confirmed sent.
**Fail signal:** Card fails to render, approve doesn't trigger cascade, cascade fires duplicates.

### 2.7 — Privacy controls round-trip
**Asserts:** Tenet 5 controls (memory review, pause, delete, export) execute end-to-end against a synthetic guest record. Pause genuinely pauses. Delete genuinely deletes. Export produces complete record.
**Pass:** All four operations behave as documented.
**Fail signal:** Pause is cosmetic, delete leaves residue, export incomplete.

### 2.8 — Decay job runs on schedule
**Asserts:** Cron-scheduled decay sweep fires at expected interval. Sweeps complete within reasonable wall time. No locks held longer than tolerance.
**Pass:** Scheduled fire confirmed, sweep duration documented, no long-lock errors.
**Fail signal:** Job doesn't fire, sweep takes minutes, lock contention with live traffic.

### 2.9 — Audit trail captures every signal and intervention
**Asserts:** For each signal recorded and each intervention proposed/approved, an audit record exists with timestamp, actor, payload hash. No silent operations.
**Pass:** Every operation traceable.
**Fail signal:** Untracked operations, missing actor, missing payload hash.

### 2.10 — Forecast (Prophet) integration produces output with confidence band
**Asserts:** Prophet forecast service returns predictions with confidence intervals, not bare point estimates.
**Pass:** Output shape includes lower/upper bound per prediction.
**Fail signal:** Bare numbers only — false-precision pattern that the formation philosophy explicitly rejects.

---

## Tier 3 — Operational fitness (qualitative pass; binary pass/fail)

These tests verify the system passes operator-facing standards. Pass requires **all** to be yes.

### 3.1 — Dashboard renders with zero console errors and zero warnings under normal load
Pass: Browser console clean across a full service window of simulated traffic.

### 3.2 — Whisper widget is usable on a phone in 3 seconds or less
Pass: From wakeup to submitted-observation, mobile experience clears 3-second target on midrange Android device.

### 3.3 — Intervention proposal copy reads in working voice, not system voice
Pass: Three randomly-selected intervention proposals all read like a captain's nudge, not like an AI announcement. *Bye thank you* register.

### 3.4 — No "Powered by Echo AI³" badging anywhere on guest-facing surfaces
Pass: Audit of every guest-touching surface confirms zero system attribution.

### 3.5 — Forbidden-sensitivity data does not appear in any operator-facing surface
Pass: Test traverses dashboard, whisper log, intervention history, audit log. Forbidden signals visible only in dedicated admin/audit context with explicit `includeForbidden` flag.

### 3.6 — Pseudonymization holds under all flows
Pass: Guest names never appear on operator surfaces. "Table 14, party of 2" pattern holds across dashboard, intervention card, whisper log.

### 3.7 — System recovers cleanly from a simulated database disconnect
Pass: Kill DB connection mid-operation. System logs the failure, retries with backoff, recovers when DB returns. No data loss, no operator-facing crash.

### 3.8 — Latency targets met for the "space between seconds" contract
Pass: Signal-to-trajectory-update p95 < 2 seconds. Trajectory-to-dashboard-render p95 < 3 seconds. End-to-end signal-to-intervention p95 < 5 seconds. *Subsecond preferred but not required for smoke; required for stress.*

### 3.9 — TICKET_001 regression intact
Pass: All 35 static foundation-migrations tests still passing. Full TICKET_001 + TICKET_002 + TICKET_003 unit suite green.

### 3.10 — No silent failures anywhere
Pass: Every error path either retries automatically with documented backoff, surfaces honestly to the operator, or both. Zero swallowed exceptions.

---

## Smoke test scoring

**Tier 1:** 12 tests — all must pass. Any failure = halt.

**Tier 2:** 10 tests — minimum 9 of 10 with documented variance on remainder.

**Tier 3:** 10 tests — all must pass. These are operational fitness gates.

**Total:** 32 tests. Pass threshold: 31 of 32 with at most 1 documented Tier 2 variance.

If smoke test passes, **proceed immediately to SYSTEM_STRESS_TEST.md** for the back-to-back run. The stress test inherits the smoke test's final database state.

---

## What to do on a failure

For each failed test:

1. **Halt the run** — do not continue cascading downstream tests on a known broken layer
2. **Capture state** — failed test, expected output, actual output, recent commits, environment
3. **Triage** — is this a doctrine-violating failure (e.g., Tenet 8 contract broken, pseudonymization leak) or an implementation drift (e.g., latency over budget by 200ms)?
4. **Fix and re-run from the failed test forward** — no need to re-run earlier passing tests unless the fix touched their code path
5. **Document the failure mode** — even fixed failures inform the stress test design

Doctrine-violating failures (Tenet violations, pseudonymization leaks, false-precision forecasting, "Powered by Echo AI³" badging) are **immediate halt-and-fix.** Implementation drift is acceptable to log and proceed if not in the demo's critical path.

---

## How this informs Phase B-F work

If smoke test fails, the failures *are* the work. Build state shifts to remediation until smoke test passes. **No new feature work proceeds while smoke tests fail.**

If smoke test passes, the system is ready for stress testing and demo prep. Phase D (stress testing) becomes the next priority.

---

*Yes Chef. Smoke test on the line. Calm seas verified before we ask the system to handle storms.*
