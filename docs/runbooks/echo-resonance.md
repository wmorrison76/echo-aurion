# Echo Resonance — Operational Runbook

> What to do when the system bends. First-aid for the Phase 1 demo and beyond.
>
> **Audience:** the on-call (probably you), the GM at the pilot property if they call mid-shift, and any future operator who inherits this system.
>
> **Escalation rule:** if a doctrine tenet is violated (Tenet 2 missing `expires_at`, Tenet 3 commerce import, Tenet 5 incomplete delete, Tenet 8 forbidden retention > 0), **HALT THE LINE.** No further work proceeds until the breach is closed. Everything else is operational and recoverable.

---

## Health check

`GET /api/echo-resonance/health` (unauthenticated; safe to wire to load-balancer probes)

Returns:
```json
{
  "status": "ok" | "degraded",
  "startedAt": "...",
  "uptimeMs": 3600000,
  "errorRate": 0.0,
  "metrics": {
    "signals": { "recorded": 142, "decayPasses": 24, "decayRowsDeleted": 18 },
    "readings": { "recorded": 142 },
    "interventions": {
      "candidatesListed": 88, "proposed": 14, "approved": 11,
      "executed": 11, "skipped": 3, "completed": 11
    },
    "routes": { "successTotal": 410, "clientErrorTotal": 12, "serverErrorTotal": 0 }
  }
}
```

`status: degraded` triggers when **server-error rate ≥ 5%** of total responses since process start.

The numbers reset every restart. That's intentional for Phase 1; production observability with histograms, percentiles, and persistent storage lands with prom-client / OTel post-Phase-1.

---

## Common failure modes

### 1. The dashboard is empty mid-shift

**Symptom:** GM opens the floor view, sees "No active visits at this property yet."

**Diagnosis:**
- `GET /api/echo-resonance/floor/:propertyId` returns `[]`
- Check `metrics.readings.recorded` — is it 0 since restart? then no whisper widget submissions
- Check `metrics.routes.serverErrorTotal` — is it nonzero? real backend error
- Check `signal-decay` last pass time — could decay have eaten everything? unlikely (TTLs are 30d for emotional, longer for others)

**Recovery:**
1. Verify the staff is using the whisper widget (look at network tab; should see `POST /readings` going through)
2. If widget not submitting, check browser console for `ResonanceApiError`
3. If submissions hit the server but nothing renders, `propertyId` might not match the trajectories' `property_id`. Compare the dashboard's URL param to what's in `resonance_trajectories`.
4. Last resort: insert a smoke reading via curl against `/api/echo-resonance/readings` with valid auth and verify it appears

### 2. A trajectory is stuck on "amber" forever

**Symptom:** Tile color won't update even though new readings are coming in.

**Diagnosis:**
- React-Query cache may not be invalidating (defensive 5s polling should still pick it up)
- `resonance_trajectories.last_updated_at` will tell you whether the row is being touched

**Recovery:**
1. Force refresh the dashboard tab (the polling interval is 5s; reload bypasses cache)
2. If still stuck, check `signals` table for the affected `visit_id` — count rows since the trajectory's `last_updated_at`
3. If signals exist but trajectory unchanged, `updateTrajectory` may have failed silently — check the application log for `[TrajectoryEngine]` errors
4. Last resort: manually trigger a trajectory recompute by submitting another reading with the same affect (no-op data; just to fire the path)

### 3. Signal-decay scheduler not running

**Symptom:** `metrics.signals.decayPasses` doesn't increment; `signals` table grows unbounded.

**Diagnosis:**
- Check env: `ECHO_DECAY_DISABLED=1` would disable it
- Check `metrics.signals.decayPasses` after >1h of uptime; should be >0
- Application log for `[SignalDecayScheduler] starting` at boot

**Recovery:**
1. Confirm `ECHO_DECAY_DISABLED` is unset
2. Restart the server; scheduler starts automatically inside `createServer()`
3. Manually trigger a one-shot pass via `runOnce()` (call from a one-off script importing the module)
4. If the function itself is failing, application log shows `[SignalDecay] purge failed` with the underlying error — likely a DB connection issue

### 4. Idempotency duplicates appearing

**Symptom:** Same logical reading appears twice with different IDs.

**Diagnosis:**
- Idempotency cache requires Redis (cache-layer config). Without Redis it falls back to in-memory and DOES NOT survive restart.
- A network blip retry within 24h SHOULD return the cached result. If two distinct keys come in (from two different clients posting the same payload), both are written — that's correct behavior.

**Recovery:**
1. Check that the client is sending an `Idempotency-Key` header (the api.ts wrapper auto-generates one; if the WhisperWidget bypasses api.ts, it won't have a key)
2. Verify Redis is connected (`REDIS_URL` env, idempotency-service healthy)
3. If duplicates were already created, `DELETE FROM resonance_readings WHERE id IN (...)` and let the next decay tick clean up the orphan signal — or just leave them (Tenet 7 will sweep them in 30 days)

### 5. Tenet 3 isolation failure on PR

**Symptom:** GitHub Actions CI fails with "Tenet 3 violation: commerce module(s) import resonance/signal/affect data."

**This is doctrine-violating. HALT.**

**Recovery:**
1. The CI output names the violating file path and the import that triggered the violation
2. Either move the file out of the commerce path (RevenueOps/, DynamicPricing/, etc.) OR remove the offending import
3. Do NOT add an exception. Tenet 3 does not bend. (See `tests/echo_resonance/privacy/forbidden-uses.test.ts` header for the rationale.)
4. If the import is genuinely required by a non-commerce reason, the file is in the wrong directory — relocate it.

### 6. Database connection pool exhaustion

**Symptom:** Routes start returning 5xx; `metrics.routes.serverErrorTotal` rises; logs show "ECONNREFUSED" or "Connection terminated unexpectedly."

**Diagnosis:**
- Pool size is 10 (default in `server/database/connection.ts`). 200 concurrent guest interactions could saturate it.
- Concurrent decay sweeps are not the cause (re-entry guard prevents overlapping passes)

**Recovery:**
1. Tune pool size in `server/database/connection.ts` (`max: 10` → `max: 25`)
2. Check Neon dashboard for connection limits on the plan
3. If load-test scenario (Phase D stress test §1.4): expected behavior; document and tune

### 7. Reading TTL appears wrong

**Symptom:** Readings disappearing after 24h instead of 30d.

**This is the bug we already shipped a fix for.** If it reappears:

**Diagnosis:**
1. `resonance-engine.ts` insertReading: `expiresAt = computeExpiresAt('emotional', now)` — should evaluate to ~30 days
2. NOT `READING_TTL_HOURS = 24` — that was the old buggy code

**Recovery:**
- Revert to the post-fix-pack state (`5e2f2d148` or later)
- The decay cron will not retroactively un-delete; rows already swept are gone

---

## When to escalate to William directly

- **Doctrine violations** (Tenet 2/3/5/7/8 broken) — always
- **Data loss confirmed** (rows deleted that should not have been) — always
- **PII appearing on a guest-facing surface** — immediate, halt the demo
- **Demo-day issue at the pilot property** — immediate, regardless of severity

---

## What this runbook does NOT cover (yet)

- Real backup/restore plan for `signals` and `resonance_readings`
- Multi-region failover (Phase 6)
- Aurion voice service health (Phase 3)
- Load-balancing across multiple Echo Resonance instances (Phase 6)

These land with the Network phase. For the Phase 1 demo, single-instance + nightly DB backup at the Neon level + this runbook is enough.

---

*Yes Chef. Runbook on the line. Read this when something breaks. Update it when you learn something new.*
