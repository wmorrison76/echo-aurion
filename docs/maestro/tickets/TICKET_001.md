# TICKET #001

> **Status:** READY TO FIRE
> **Format:** Per `docs/maestro/ORDER_TICKET_TEMPLATE.md`
> **Rewritten:** 2026-05-05 — scope updated post Q1 tooling-discovery (raw-SQL custom runner)

---

**Station:** Saucier *(Schema & Persistence)*

**Mission:** Verify migrations 008-012 (the resonance and signals foundation) apply cleanly against the existing LUCCCA schema using the raw-SQL custom runner, roll back cleanly, and are covered by an integration test that hits a real database. *No translation step — the .sql files are the canonical, authoritative artifacts.*

**Recipe:** `server/database/migrations/008_resonance_readings.sql` through `server/database/migrations/012_signals.sql` are the canonical schema. They define exactly what each table must contain.

---

## Tooling note (added 2026-05-05)

Migration framework: **raw SQL via custom runner**. Runner: `server/database/migrate.ts`. NPM scripts: `db:migrate` (prod) and `db:migrate:dev` (dev). Migration files are flat in `server/database/migrations/`, alphabetically ordered, tracked via the `schema_migrations` table. **The runner does not recurse into subdirectories.**

This was finalized as the answer to priority-1 question 1 from `HANDOFF.md`. Subsequent tickets in this batch inherit this context and should not re-litigate it.

---

## Plates to fire (files)

The .sql files already exist at these paths post-renumber. The plates this ticket fires are *verification + test + header-status* artifacts, not new migration source files.

Files to verify (pre-existing, no source changes expected):
- `server/database/migrations/008_resonance_readings.sql`
- `server/database/migrations/009_resonance_trajectories.sql`
- `server/database/migrations/010_interventions_library.sql`
- `server/database/migrations/011_interventions_executed.sql`
- `server/database/migrations/012_signals.sql`

Files to write:
- `tests/echo_resonance/migrations/foundation-migrations.test.ts` — integration test against real database

Files to update (status only):
- The 5 .sql files above: `Status: STUB` → `Status: IMPLEMENTED` post-verification (header line, no body changes)

---

## Mise en place (must already exist)

- `shared/types/resonance/*` — already complete in scaffolding
- `shared/types/signals/*` — already complete in scaffolding
- Raw-SQL custom runner at `server/database/migrate.ts` — wired to `npm run db:migrate`
- A test database is available for migration verification
- Q1 of priority-1 questions answered (raw SQL custom runner). Q2-Q5 in flight at time of rewrite.

---

## Tasting notes (must pass before sending to pass)

- [ ] All five migrations apply cleanly to an empty database via `npm run db:migrate`
- [ ] All five migrations apply cleanly on top of the existing LUCCCA schema (001-007) — no collisions on table names, indexes, or columns; additive-only
- [ ] All five migrations roll back cleanly with no orphan data
- [ ] Indexes from the SQL versions are preserved: `idx_resonance_readings_expires`, `idx_signals_expires`, `idx_trajectories_property_active`
- [ ] Foreign key constraints from `011_interventions_executed.sql` to `010_interventions_library.sql` are preserved
- [ ] Tenet 2 retention column: `expires_at` is present, NOT NULL, and indexed on `resonance_readings` and `signals`
- [ ] Tenet 7 sensitivity column: `signals.sensitivity` is present and drives per-row retention semantics
- [ ] Type check passes (`tsc --noEmit`)
- [ ] Integration test `tests/echo_resonance/migrations/foundation-migrations.test.ts` passes against a real database (not mocks)
- [ ] File headers updated on the 5 .sql files: `Status: STUB` → `IMPLEMENTED`
- [ ] Self-audit complete (see `docs/maestro/STATION_CHECK_LIST.md`)
- [ ] No placeholder slop (see `docs/maestro/NO_PLACEHOLDER_POLICY.md`)

---

## Send-back conditions (the pass will return the plate if)

- Any migration that does not roll back cleanly
- Any migration that modifies an existing LUCCCA column (additive only — *no exceptions*)
- Any missing index from the canonical SQL
- Any drift from the SQL spec that the pass did not approve in advance
- Any retention timestamp missing on a sensitive table
- Tests that pass against mocks instead of a real database
- File headers not updated to reflect new status
- Migration files placed in subdirectories of `server/database/migrations/` (the runner does not recurse)

---

## Tenet implications

- **Tenet 2** (score persists, audio evaporates): the `expires_at` columns are how this is enforced at the schema level. They must be present, NOT NULL, and indexed. The chef de partie should verify with the sous if uncertain.
- **Tenet 7** (sensitive flags decay aggressively): `signals.sensitivity` column drives the per-row retention timer. The cron that consumes it is *not* in this ticket — it's a separate ticket for Team #1 supporting work.

---

## Out-of-scope artifacts (carried forward from tooling-discovery, 2026-05-05)

1. **Top-level `migrations/` directory** retains LUCCCA 001-011 + 018 (gap 012-017). No runner found pointing at it. Out of scope for this ticket per pass — surface for a later cleanup ticket.
2. **`server/migrations/`** holds a separate sequence of 69+ files (managed by `server/services/database-migrations.ts`, with name-collision artifacts already in flight). Out of scope for this ticket per pass — surface for a later consolidation ticket.

---

## Pass note

This is **the first ticket of the first batch**. It is also the most consequential — the entire platform stands on these schemas. *Do not rush.* The discipline of getting these five migrations exactly right is worth a full day of extra care. Two days even. *The fundamentals hold or nothing else holds.*

When this ticket fires through, the next ticket will dispatch Team #2 (Resonance MVP — Backend) which depends on these schemas being final.

---

**Fire by:** end of shift, day one of Phase 1
**Dispatched by:** [pass name to be filled in when this ticket is actually used]
**Dispatched on:** 2026-05-05 (rewritten post tooling-discovery)

---

> *"Sauce is foundation. Get the foundation wrong and there is no recovery."* — `docs/maestro/STATIONS/SAUCIER.md`
