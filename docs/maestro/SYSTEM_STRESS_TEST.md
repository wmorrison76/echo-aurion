# System Stress Test — Echo Resonance Under Pressure

> *Pushes Echo Resonance past its design limits to verify graceful degradation.*
>
> **Run when:** Immediately after `SYSTEM_SMOKE_TEST.md` passes. Back-to-back. Same environment. Inherits final smoke test state as starting state.
>
> **Run by:** Saucier executing tests in sequence; pass reviewing results between phases. Failures here are *expected* — the test is whether the system handles them with grace, not whether it avoids them.
>
> **Pass criterion:** No doctrine-violating failures. No silent data loss. No operator-facing confusion. Latency stays within budget under load. POS-failover Eureka moment works end-to-end.
>
> **Companion documents:**
>   - `FOUNDATION_SMOKE_TEST.md` — paper-test of doctrine ↔ build coherence; runs first thing Phase A morning.
>   - `SYSTEM_SMOKE_TEST.md` — runs first; verifies code is correct. This document runs after.
>
> **Doctrine alignment:** This is the system proving its pride and perseverance under conditions that would break lesser systems. Failure modes here are not punishment — they are *apprenticeship.* Every failure logged here informs the next training pass.

---

## Stress test environment

Inherits from smoke test. Does not require teardown. *Stress tests are most realistic when they hit a system that has just finished healthy operation.*

Additional requirements:

1. **Event generator at variable pace** — must support real-time, 2x, 5x, 10x replay
2. **Failure injection harness** — must support killing specified data sources mid-run (POS feed, Profitsword sync, UKG, Craftable, internet entirely)
3. **Load generator** — produces concurrent simulated guest signals at configurable rates
4. **MyECHO mobile session simulator** — stand-in for actual server phones during POS-failover testing
5. **EchoLayout seating chart fixture** — populated with the smoke test's property fixture

---

## Tier 1 — Load stress (system under volume)

These verify Echo Resonance handles concurrent traffic without degrading core service. *Calm seas were 1 ticket per minute. Storm seas are 50.*

### 1.1 — Sustained signal recording at 50 signals/second
**Setup:** Event generator produces 50 valid signal payloads per second for 5 minutes (15,000 signals total).
**Asserts:**
- All 15,000 signals recorded successfully
- p95 write latency < 100ms throughout the run
- No connection pool exhaustion
- Database CPU/memory remain within budget

**Pass:** All four hold.
**Fail signals:**
- Dropped writes → data loss is unacceptable; doctrine-violating
- p95 spike past 100ms → "space between seconds" contract violated; investigate batching or pool tuning
- Pool exhaustion → tune connection pool size or add backpressure

### 1.2 — Concurrent trajectory updates across 200 active guests
**Setup:** Simulated property with 200 active guest visits, each generating signals at realistic intervals (1 every 30-60 seconds per guest).
**Asserts:**
- All trajectory updates compute correctly
- No race conditions producing inconsistent state
- Dashboard floor view stays accurate
- Reading counts on each trajectory match signal count exactly

**Pass:** Every trajectory's state and reading count match expected after the run.
**Fail signals:**
- Lost updates → optimistic-locking failure; need DB-level constraint or retry pattern
- Inconsistent reads → caching bug or query missing isolation level
- Reading count drift → atomic counter not actually atomic

### 1.3 — Decay sweep during live write traffic
**Setup:** Hourly decay job fires while signal recording continues at full pace.
**Asserts:**
- Decay completes without blocking writes
- No writes lost during sweep window
- Sweep duration documented and within tolerance

**Pass:** Live traffic continues uninterrupted; decay sweep completes cleanly.
**Fail signals:**
- Long lock during sweep → blocks operator-facing reads; redesign as batched sweep
- Writes lost → race between sweep and write; fix isolation
- Sweep takes 5+ minutes on test data → won't scale to production

### 1.4 — Dashboard rendering under 100 active trajectories
**Setup:** Floor view fetches 100 active trajectories simultaneously; UI renders all of them.
**Asserts:**
- Initial render < 2 seconds
- Update tick (every 5 seconds) < 1 second to refresh
- No browser memory leak across 30 minutes of continuous viewing
- Pseudonymization holds (no name leaks) at all 100 tile counts

**Pass:** All four hold.
**Fail signals:**
- Render slowness → too much computed in render loop; move to memoized derivation
- Memory leak → event listeners not cleaned up; fix unmount
- Name leak under load → defensive coding gap; pseudonymize at the API boundary

---

## Tier 2 — Integration failure stress (the dependencies break)

These verify Echo Resonance survives when external systems fail. *This is where Echo Aurum proves it is the system that holds when others fall.*

### 2.1 — Profitsword sync drops mid-shift
**Setup:** Profitsword data is flowing into the simulation. At T+10 minutes, kill the Profitsword feed entirely. Continue simulation for 30 more minutes.
**Asserts:**
- Echo Resonance core continues operating on cached Profitsword state
- Dashboard surfaces "Profitsword sync degraded since [timestamp]" with honest staleness indicator
- Trajectory engine keeps running (does not depend on live Profitsword)
- When Profitsword feed restored, system reconciles within 60 seconds

**Pass:** All four hold. *No operator-facing crash. No silent failure.*
**Fail signals:**
- Dashboard shows stale data without flagging staleness → silent failure; doctrine-violating
- Trajectory engine throws errors when Profitsword unreachable → wrong dependency direction
- Reconciliation produces duplicates or missing data → fix replay pattern

### 2.2 — Craftable invoice feed fails
**Setup:** Same pattern as 2.1 but with Craftable.
**Asserts:**
- Procurement reconciliation queues unreceived invoices for replay
- No hard error to operator
- Dashboard "invoice match degraded" surfaces honestly
- Reconciliation completes when feed restored

**Pass:** All four hold.

### 2.3 — UKG schedule data lagging or wrong
**Setup:** Inject UKG data that disagrees with active MyECHO sessions (UKG says server X is on schedule, but X is not actually logged in to MyECHO).
**Asserts:**
- System trusts MyECHO sessions, not UKG
- Disagreement surfaces as a soft note to GM
- No false intervention based on phantom staff

**Pass:** All three hold.
**Fail signals:**
- System uses UKG over MyECHO → trust the wrong source; fix priority
- Disagreement silent → operator unaware of staffing reality

### 2.4 — Database connection pool exhaustion mid-service
**Setup:** Saturate the connection pool deliberately. Continue submitting requests.
**Asserts:**
- New requests queue rather than fail
- Pool releases connections fast enough to keep latency reasonable
- Critical path (signal recording) prioritized over non-critical (forecast refresh)
- No deadlock

**Pass:** All four hold.

### 2.5 — Internet down at the property entirely
**Setup:** Cut all external connectivity. Echo Resonance must run from local DB and local intervention library.
**Asserts:**
- Dashboard continues rendering from local data
- Signal recording continues
- Trajectory updates continue
- Intervention candidates surface from local library
- Privacy controls (Tenet 5) still operate
- When internet returns, system queues outbound state for sync without losing local writes

**Pass:** All six hold. **This is the killshot demo moment for an EDF.**
**Fail signals:**
- Anything throws "network unreachable" to operator surface → not actually local-first; emergency Day 8 fix
- Sync after restore produces duplicates or loss → fix replay pattern with idempotency

---

## Tier 3 — POS-failover stress (the Eureka)

These verify the discovery from the doctrine session: EchoLayout + offline-first + MyECHO + chit printer + QR code compose into a working POS-failover. **This is the demo's crown jewel if it works.**

### 3.1 — POS goes down, GM scans QR, MyECHO enters POS mode
**Setup:** Simulated property mid-service. Toast/POS feed is killed. GM scans the QR code to activate MyECHO POS mode.
**Asserts:**
- QR scan unlocks POS mode in MyECHO across all logged-in server sessions
- EchoLayout seating chart appears in MyECHO with table state matching last-known POS state
- Servers can enter new orders on their phones
- Orders generate chits to the chit printer
- Chits include all required information (item, modifiers, table, server, timestamp)
- 8-hour auto-break timer starts and is visible to GM

**Pass:** All six hold.
**Fail signals:**
- QR scan doesn't activate POS mode → integration gap, fix
- Seating chart doesn't load → EchoLayout sync issue
- Orders don't print → chit printer integration gap
- 8-hour timer not honored → could become permanent shadow infrastructure; CRITICAL fix

### 3.2 — Server phone dies during POS-failover service
**Setup:** During POS-failover mode, kill one server's phone. Server logs in on a different phone.
**Asserts:**
- Open tickets reassociate to the new session
- No duplicate tickets
- No lost orders
- Order history reconciles correctly when POS feed returns

**Pass:** All four hold.

### 3.3 — POS feed returns mid-failover
**Setup:** During active POS-failover mode, restore the Toast feed.
**Asserts:**
- System does not silently switch back (could lose orders mid-stream)
- GM is notified that POS is back and can confirm switchover
- Switchover does not duplicate or drop orders
- Reconciliation matches MyECHO orders against Toast records

**Pass:** All four hold.
**Fail signals:**
- Auto-switchback → could lose unsynced orders; require manual GM confirmation
- Duplicates after switchover → idempotency key gap; fix

### 3.4 — 8-hour auto-break triggers correctly
**Setup:** POS-failover active for 7 hours 45 minutes. Verify warning surfaces to GM.
**Asserts:**
- 15-minute warning surfaces clearly
- 5-minute warning surfaces clearly
- At T+8 hours, POS-failover mode ends, settlement initiated
- All open tickets either settled or queued for handoff

**Pass:** All four hold.

### 3.5 — Chit printer jam during POS-failover
**Setup:** Chit printer simulated as offline mid-service. New orders continue.
**Asserts:**
- MyECHO holds ticket queue locally
- Printer comes back, queue flushes
- No duplicate chits printed
- Each ticket carries idempotency key

**Pass:** All four hold.

---

## Tier 4 — Doctrine violation attempts (these must all fail to write)

These tests *attempt* to violate the doctrine. Pass means the system rejects each attempt. **Any test that succeeds in writing is a doctrine breach and a halt-the-line emergency.**

### 4.1 — Attempt to write a signal with `expires_at = NULL` (Tenet 2 violation)
**Setup:** Submit a NewSignalInput with explicit `expires_at: null` or `expires_at: undefined`.
**Pass:** System rejects the write. Returns clear error.
**Fail:** System writes the row → Tenet 2 architecturally broken; immediate halt.

### 4.2 — Attempt to record a signal with sensitivity = 'forbidden' and a multi-day expires_at (Tenet 8 violation)
**Setup:** NewSignalInput with `sensitivity: 'forbidden'` and a manually-set far-future `expires_at`.
**Pass:** System overrides to `expires_at = now()` per Tenet 8 contract.
**Fail:** System honors the manual far-future expires_at → Tenet 8 contract architecturally broken; halt.

### 4.3 — Attempt to surface guest PII on operator-facing surface
**Setup:** Inject test signal with guest name/email/phone in a free-text field; query and render.
**Pass:** Operator surfaces show pseudonymized identifier ("Table 14") not the PII.
**Fail:** PII renders → pseudonymization gap; doctrine breach; halt.

### 4.4 — Attempt to surface "Powered by Echo AI³" or similar to a guest-facing surface
**Setup:** Audit any guest-touching surface (Trip Brief draft, in-room digital displays, etc.).
**Pass:** Zero AI attribution found.
**Fail:** Found anywhere → Silent Service Principle breach; remove immediately.

### 4.5 — Attempt to suppress audit trail
**Setup:** Inject a signal recording where audit logging is disabled at the call site.
**Pass:** Audit logging cannot be disabled; it's a core invariant of the recorder.
**Fail:** Audit log skipped → audit trail not load-bearing; fix to make audit unconditional.

### 4.6 — Attempt to retrieve a deleted (Tenet 5) guest's data
**Setup:** Run delete-everything for a synthetic guest. Then query for their data through every available read path.
**Pass:** Zero rows returned across all paths.
**Fail:** Any residue → delete is incomplete; Tenet 5 breach; halt.

### 4.7 — Attempt to surface forecast as a bare point estimate (false-precision violation)
**Setup:** Force the forecast service to omit the confidence band.
**Pass:** Output without confidence band is rejected by the API contract or rendered as "estimate unavailable."
**Fail:** Bare number renders → false-precision pattern; rebuild forecast contract.

### 4.8 — Attempt to inject an intervention into the cascade without operator approval
**Setup:** Try to fire a department-notification cascade without going through staff approval.
**Pass:** Cascade rejected without explicit staff sign-off.
**Fail:** Cascade fires automatically → human-in-the-loop violation; severe doctrine breach.

---

## Tier 5 — Demo-day failure simulation (rehearsing the room)

These run on Day 12 (final dry run before demo) to verify the system handles the realistic disasters that could happen during the EDF demo. Pass on Day 12 = ship the demo as planned.

### 5.1 — Wi-Fi drops at the demo location
**Setup:** Mid-demo, kill Wi-Fi. Echo Resonance demo continues from local data.
**Pass:** Demo continues without operator-visible degradation. Trajectory dashboard, intervention surfacing, POS-failover all work locally.

### 5.2 — Laptop crashes during demo
**Setup:** Kill the demo laptop process mid-run. Switch to backup laptop.
**Pass:** Backup laptop has identical state, picks up within 30 seconds.

### 5.3 — Power BI embed fails to render
**Setup:** Block Power BI domain. Demo continues.
**Pass:** Demo flows around the missing BI tile. Static screenshot fallback available if needed.

### 5.4 — EDF asks to see something not in the demo
**Setup:** Practice the response: *"That's a great question. In Phase 2, here's what that looks like..."* with the roadmap slide.
**Pass:** Response is rehearsed and natural.

### 5.5 — EDF asks for a reference customer
**Setup:** Practice the response: *"You'd be the first paying customer. The pricing reflects that — there's a partnership component."*
**Pass:** Response is rehearsed and natural.

### 5.6 — Profitsword API rate limit hit during live demo
**Setup:** Simulate Profitsword returning 429s.
**Pass:** Demo dashboard continues from cached data with honest staleness indicator. EDF sees the resilience as a feature.

### 5.7 — Trajectory tile reads green when it should be amber (data inconsistency)
**Setup:** Manually corrupt one trajectory's state to test recovery.
**Pass:** Post-service review surfaces the inconsistency; system self-corrects on next reading; *no operator-facing crash.*

### 5.8 — Intervention proposed at wrong table due to seating reassignment mid-service
**Setup:** Reassign a guest to a different table mid-trajectory. Observe intervention behavior.
**Pass:** Intervention proposal carries the table-state-snapshot; staff sees the discrepancy and ignores or reassigns.

---

## Stress test scoring

**Tier 1 (Load):** 4 tests — all must pass.
**Tier 2 (Integration failure):** 5 tests — all must pass.
**Tier 3 (POS-failover Eureka):** 5 tests — all must pass for the demo killshot to ship.
**Tier 4 (Doctrine violations):** 8 tests — *all must fail to write.* Any successful write = halt.
**Tier 5 (Demo-day disasters):** 8 tests — all must pass on Day 12 dry run.

**Total:** 30 tests.

**Pass threshold:** 30 of 30. *Stress tests have no soft-fail tolerance.* The system either survives the storm or it doesn't.

---

## What to do on a failure

**Tier 1-2 failures:** Performance or integration gap. Fix and re-run. Document the discovered limit if not already in spec.

**Tier 3 failures:** POS-failover Eureka has a gap. **This is the demo killshot.** Fix immediately. If not fixable in time, cut the failover demo from the room and lead with resonance instead.

**Tier 4 failures:** Doctrine breach. *Halt everything else.* No further work proceeds until the breach is closed. **The doctrine is load-bearing or it is decoration.** We do not ship decoration.

**Tier 5 failures:** Day 12 disaster sim failed. Either fix in 24 hours or cut that scenario from the demo plan.

---

## What back-to-back means in practice

1. **Smoke test runs first** (`SYSTEM_SMOKE_TEST.md`) — 32 tests, ~30 minutes
2. **If smoke passes, stress test runs immediately** — same environment, same DB state, no teardown — 30 tests, ~60 minutes (some need real-time waits for decay/cron)
3. **Total run time: ~90 minutes.**
4. **Run once on Day 5-6** (initial verification after backend services land)
5. **Run again on Day 10** (checkpoint)
6. **Run again on Day 12** (final dry run before demo)
7. **Run again on Day 13** if anything changed since Day 12

**Each run produces a report.** Pass / fail per test, latency numbers, any documented variance. Reports go in `docs/audits/STRESS_TEST_RUNS/` with a timestamp.

---

## How this aligns with the doctrine

The smoke test verifies the system *does its job.* The stress test verifies the system *holds its standard under pressure.* Together they test what the doctrine requires:

- **Pride** — every variance is logged with consequence, not waved away
- **Perseverance** — failures inform the next run, not the last
- **Pre-mortem discipline** — every failure mode mapped before service starts
- **Silent Service** — test results are dev-team facing, never operator-facing
- **The space between seconds** — latency budgets are non-negotiable
- **The system performs in the gap** — graceful degradation when integrations fail
- **What we will not do** — Tier 4 verifies the floor holds

If we ship the demo with these tests passing, **we are shipping a system that knows itself.** It has been tested under storm conditions. It has been honest about where it bends. It has nothing to hide from the EDF, because the failure modes are documented and the responses are rehearsed.

That is the version of pride and perseverance that lands an EDF in 13 days.

---

*Yes Chef. Stress test on the line. Storm seas verified after calm seas pass. The system either holds or it does not, and we will know honestly which.*
