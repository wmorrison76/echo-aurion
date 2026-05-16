# TICKET #003

> **Status:** READY TO FIRE *(awaiting test-DB provisioning per TICKET_001 HANDOFF_OVERNIGHT Blocker A)*
> **Format:** Per `docs/maestro/ORDER_TICKET_TEMPLATE.md`
> **Drafted:** 2026-05-05 — paired with TICKET_002 close-out
> **Predecessor reading:** `docs/maestro/tickets/TICKET_003_PREP.md` (mandatory)

---

**Station:** Saucier *(Backend core — signals, scoring, trajectory, interventions)*

**Mission:** Implement the seven Phase 1.3 Backend core services that turn the type contracts from TICKET_002 and the schemas from TICKET_001 into a working pipeline. End-to-end loop: a reading is captured → score computed → persisted → signal emitted → trajectory updated → decay cron honors retention. **The plate that fires when this ticket completes is "a fake reading travels the loop and the trajectory dashboard would render it."**

**Recipe:**
- Type contracts: `shared/types/signals/*`, `shared/types/resonance/*` (locked by TICKET_002, IMPLEMENTED status)
- Schema: `server/database/migrations/008_*.sql` through `012_*.sql` (locked by TICKET_001)
- Pre-flight: `docs/maestro/tickets/TICKET_003_PREP.md` for the type-mismatch context on the consuming files

---

## Tooling note (inherited from TICKET_001 / TICKET_002)

- Migration runner: raw SQL via `server/database/migrate.ts` → `npm run db:migrate`
- DB client: `server/database/connection.ts` (pg ^8.18.0, Neon PostgreSQL); use `query`, `getClient`, `transaction`, `closePool`
- Test runner: vitest ^3.2.4; `npm test` = `vitest --run`; `globals: false` (explicit imports)
- Server router: Express ^5.1.0 (relevant for Phase 1.4, not this ticket)

---

## Plates to fire (files)

### Server services (6 files)

1. `server/services/signals/signal-recorder.ts` — single write path
   - `recordSignal(input: NewSignalInput): Promise<Signal>` — persists to `signals` table, sets `expiresAt` from `RETENTION_DAYS[sensitivity]`, returns full row
   - **Tenet 2 + Tenet 7 enforcement point**: every write goes through here

2. `server/services/signals/signal-query.ts` — read path
   - `getSignalsForGuest(guestId: UUID, limit?: number): Promise<Signal[]>` — paginated, ordered desc by timestamp
   - `getSignalsForVisit(visitId: UUID): Promise<Signal[]>`
   - `getSignalsBySource(source: SignalSource, since: ISODate): Promise<Signal[]>`

3. `server/services/signals/signal-decay.ts` — cron, hourly
   - `purgeExpiredSignals(): Promise<{ deleted: number; bySensitivity: Record<SensitivityLevel, number> }>`
   - **Tenet 7 enforcement point**: deletes rows where `expires_at < now()`, returns count by sensitivity for observability
   - Wired to a cron scheduler (mechanism TBD — flag if not already in repo)

### Client (1 file)

4. `client/lib/resonance/score.ts` — pure score math
   - `scoreFromAffect(affect: AffectCoordinate, config?: ScoreConfig): number` — 1-10 score from arousal/valence with `arousalWeight` from config
   - **Pure function. No imports from server. No DB.** Mirrors the server-side `resonance-engine.scoreFromAffect`.

### Server services (3 more files — resonance core)

5. `server/services/echo-ai3/resonance/resonance-engine.ts` — engine
   - `scoreFromAffect(affect: AffectCoordinate, config?: ScoreConfig): number` — same math as client, kept in sync
   - `createReading(input: NewResonanceReading): Promise<ResonanceReading>` — single transaction: persist reading (with `expiresAt` set per **Tenet 2**), call `signalRecorder.recordSignal()` for the unified graph, call `trajectoryEngine.updateTrajectory()` for floor view freshness
   - `getRecentReadings(guestId: UUID, limit?: number): Promise<ResonanceReading[]>`
   - **Construction site for the new `ResonanceReading` flat shape** (see TICKET_003_PREP File 1)

6. `server/services/echo-ai3/resonance/trajectory-engine.ts` — lift tracking
   - **Fix the broken `PropertyId` import first** (replace with `UUID` per TICKET_003_PREP File 2)
   - `updateTrajectory(visitId: UUID, newReading: ResonanceReading): Promise<ResonanceTrajectory>` — increments `readingCount`, updates `lastUpdatedAt`, recomputes `currentScore` / `trajectory` / `liftGap` / `status` (green/amber/red thresholds defined here)
   - `getFloorView(propertyId: UUID): Promise<TrajectoryTile[]>` — joins `resonance_trajectories` with guest profile + last N reading scores for sparkline
   - `getTrajectory(visitId: UUID): Promise<ResonanceTrajectory | null>` — returns the new shape (no readings array)

7. `server/services/echo-ai3/resonance/intervention-library.ts` — intervention dispatch
   - `findCandidates(affect: AffectCoordinate, signals: SignalTag[]): Promise<InterventionTemplate[]>` — filters by affect quadrant + `requiresSignals` / `excludeSignals` + `active = true` + `reuseCooldownDays` window per guest
   - `recordProposal(templateId: UUID, guestId: UUID, visitId: UUID, proposedBy: ProposedBy): Promise<InterventionExecution>` — persists with status `proposed`, returns full row

### Tests (mirror the source tree)

- `tests/echo_resonance/server/signals/signal-recorder.test.ts`
- `tests/echo_resonance/server/signals/signal-query.test.ts`
- `tests/echo_resonance/server/signals/signal-decay.test.ts`
- `tests/echo_resonance/client/lib/resonance/score.test.ts` *(pure function — no DB needed)*
- `tests/echo_resonance/server/resonance/resonance-engine.test.ts`
- `tests/echo_resonance/server/resonance/trajectory-engine.test.ts`
- `tests/echo_resonance/server/resonance/intervention-library.test.ts`

### Tenet enforcement test (NON-NEGOTIABLE)

- `tests/echo_resonance/privacy/tenet-3-tone-isolation.test.ts` — **Tenet 3 enforcement**: verify resonance-engine outputs cannot be imported from any pricing, sales, or marketing service. Either lint rule or directory-boundary import test.

---

## Mise en place (must already exist)

- TICKET_001 foundation migrations 008-012 applied to a test database
  - **CURRENTLY BLOCKED** per TICKET_001 `HANDOFF_OVERNIGHT.md` Blocker A — no `DATABASE_URL_TEST` provisioned. Until resolved, integration tests can be scaffolded but not executed against a real DB.
- TICKET_002 types stable (`shared/types/signals/*` and `shared/types/resonance/*` at `Status: IMPLEMENTED` in `main`)
- TICKET_003_PREP read and absorbed by the saucier
- pg client at `server/database/connection.ts` (Q4 confirmed)
- vitest at version ^3.2.4 (Q5 confirmed)

---

## Tasting notes (must pass before sending to pass)

- [ ] Each of the 7 service files has every method in its header's `Pending` checklist marked `[x]` and implemented (no `throw new Error('Not implemented')`)
- [ ] **Tenet 2 enforcement** (score persists, audio evaporates): `signalRecorder.recordSignal()` and `resonanceEngine.createReading()` both set `expiresAt`. A test inserts a record without `expiresAt` and expects rejection.
- [ ] **Tenet 3 enforcement** (tone informs care, never commerce): the privacy test confirms `resonance-engine` is not importable from any `pricing/`, `sales/`, or `marketing/` service. Lint or directory-boundary test passes.
- [ ] **Tenet 7 enforcement** (sensitive flags decay aggressively): `signalDecay.purgeExpiredSignals()` deletes rows where `expires_at < now()` and returns counts by sensitivity. A test seeds rows with various `expiresAt` values and verifies only expired rows are removed.
- [ ] `client/lib/resonance/score.ts` and `server/services/echo-ai3/resonance/resonance-engine.ts` both implement `scoreFromAffect` with identical math (verified via cross-file unit test or shared helper)
- [ ] `trajectory-engine.ts`'s broken `PropertyId` import is fixed (replaced with `UUID`)
- [ ] `trajectory-engine.updateTrajectory` correctly increments `readingCount` and updates `status` when crossing green/amber/red thresholds (test asserts each transition)
- [ ] `trajectory-engine.getFloorView` returns active visits only (`endedAt IS NULL`) and joins reading scores for sparkline
- [ ] `intervention-library.findCandidates` honors `reuseCooldownDays` per guest
- [ ] All integration tests run against a real test database (not mocks) — pattern from TICKET_001's `foundation-migrations.test.ts` + DB-layer-not-skipped
- [ ] Type check passes (`tsc --noEmit -p tsconfig.json`): **0 new errors** introduced by this ticket. Pre-existing 4122 baseline acceptable.
- [ ] File headers updated on all 7 service files: `Status: STUB → IMPLEMENTED`. Pending checklists `[x]`'d.
- [ ] `docs/maestro/tickets/TICKET_003.md` Status: READY TO FIRE → COMPLETED at the end of the run
- [ ] Self-audit complete (see `docs/maestro/STATION_CHECK_LIST.md`)
- [ ] No placeholder slop (see `docs/maestro/NO_PLACEHOLDER_POLICY.md`)

---

## Send-back conditions (the pass will return the plate if)

- Any service still throws `Not implemented` after this ticket fires (NO_PLACEHOLDER_POLICY violation)
- Any test passes against mocks instead of a real database
- Any service writes a row that bypasses `expiresAt` set (Tenet 2 violation)
- Tone signals from `resonance-engine` are importable from a pricing/sales/marketing path (Tenet 3 violation)
- Sensitive signals are not auto-decayed by `signal-decay.ts` (Tenet 7 violation)
- Any modification to `shared/types/` outside an explicit pass-authorized ticket (CLAUDE.md NEVER list)
- Any modification to migrations 001-025 (the schema is locked)
- New net pre-existing-style tsc errors anywhere in the repo (TICKET_002 baseline of 0 new must hold)
- File headers not updated to `IMPLEMENTED`
- Integration tests scaffolded as `it.todo` or `describe.skip` without test-DB provisioning evidence (the TICKET_001 pattern is acceptable for genuinely DB-blocked cases; a status note must be added to the file header)

---

## Tenet implications

- **Tenet 2** (score persists, audio evaporates): every `signal-recorder` and `resonance-engine` write must set `expires_at`. The default for `ResonanceReading` is `now() + 24h` unless the guest opts in to longer retention. The decay cron in `signal-decay` is the enforcement counterpart at the storage layer.
- **Tenet 3** (tone informs care, never commerce): the resonance scoring outputs (arousal, valence, resonance score) are care-layer signals. They must not flow into pricing decisions, upsell logic, or marketing personalization. **Enforce at the import boundary** via lint rule or a privacy test that fails if `resonance-engine` is importable from `pricing/*`, `sales/*`, or `marketing/*`.
- **Tenet 7** (sensitive flags decay aggressively): `signals.sensitivity` drives per-row retention. `signal-decay.purgeExpiredSignals()` is the cron consumer. **30-day decay** for `sensitive` and `emotional` signals (per `RETENTION_DAYS` in `shared/types/signals/sensitivity.ts`).

---

## Out-of-scope artifacts (carried forward)

1. **Q3 auth (multi-candidate, deferred since TICKET_001).** Phase 1.3 services don't directly need auth, but if the `signal-decay` cron requires staff context for audit logs, Q3 becomes blocking. Surface to pass on first encounter.
2. **Routes (Phase 1.4).** `server/routes/resonance.ts` and `server/routes/signals.ts` are out of scope. They become a separate ticket, with Q3 auth resolution as a prerequisite.
3. **Frontend (Phase 1.5).** All `client/components/resonance/*` and `client/lib/resonance/use-*.ts` are out of scope.
4. **Pre-existing 4122 tsc errors.** Separate ticket. **Out of scope.**
5. **`PropertyId` / `GuestId` / `VisitId` / `ISODateTime` broken-import audit across `shared/types/voyage/*` and `shared/types/resonance/forecast.ts`.** Fix only what this ticket's services directly touch (per TICKET_003_PREP, that's just `trajectory-engine.ts`'s `PropertyId` swap). The wider audit is its own ticket.
6. **TICKET_001 carry-forward limitations:**
   - Stale `Pending:` block in `008_resonance_readings.sql` (editorial)
   - `Status:` field convention for SQL file headers (editorial)
   - Rollback strategy for migrations (Blocker B from TICKET_001 HANDOFF_OVERNIGHT)
   These are editorial / strategic — not implementation work. They don't block TICKET_003.

---

## Blockers inherited from TICKET_001 / TICKET_002

- **A — Test database wiring.** Without `DATABASE_URL_TEST`, the integration tests can be scaffolded but not executed. The pass needs to provision this before TICKET_003 can fully complete. *(Reasonable workaround: scaffold all integration tests with `describe.skipIf(!DATABASE_URL_TEST)` per the TICKET_001 pattern; mark this ticket PARTIAL until the DB is wired and tests run green.)*
- **B — Migration rollback story.** Affects test teardown. Workaround per TICKET_001 HANDOFF: programmatic table-drop in test teardown (option 2). Acceptable for TICKET_003.
- **C — Q3 auth.** Watch for any service that needs staff context. If hit, halt and ask the pass.

---

## Pass note

TICKET_003 is **the bridge from "types and schemas exist" to "the pipeline runs end-to-end."** The integration tests are the proof — when they pass green against a real test database, the platform's foundation is operational. Until then, the work is structurally complete but not service-ready.

This ticket has more surface than TICKET_001 or TICKET_002 (7 service files vs 7 type files vs 1 ticket-rewrite). Suggested batching: fire `signals/*` first (recorder + query + decay) since they're the foundation everyone else builds on, then `resonance-engine` + `trajectory-engine` together (cross-call), then `intervention-library`, then the cross-cutting `score.ts` parity.

The Tenet 3 enforcement test is non-negotiable — if `resonance-engine` outputs ever flow into pricing/marketing code, the platform's promise is broken at the architectural level. Build the import-boundary test before the first service implementation lands.

---

**Fire by:** to be set when test DB is provisioned
**Dispatched by:** [pass name to be filled in when this ticket is actually used]
**Dispatched on:** [date]

---

> *"The brigade depends on each other's success. The saucier cannot succeed if the prep failed. The pass cannot succeed if the line is in the weeds."* — `docs/maestro/THE_LINE.md`

> *"Sauce is foundation. Get the foundation wrong and there is no recovery."* — `docs/maestro/STATIONS/SAUCIER.md`
