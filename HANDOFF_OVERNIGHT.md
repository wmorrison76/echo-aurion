# HANDOFF_OVERNIGHT — TICKET_001 foundation tests

> Saucier station, end of overnight shift. 2026-05-05.
> Branch: `feature/ticket-001-foundation-tests`
> Pass: William. Yes Chef.

---

## Where I stopped

After the atomic foundation commit `1021ae195` (renumber + doc updates + ticket rewrite, already on `main`), I worked the remaining TICKET_001 tasting notes that don't require a live database. The work landed on `feature/ticket-001-foundation-tests`, one commit on top of `main`. Branch pushed for backup; **not merged**.

**Remaining unverified items in TICKET_001 tasting notes:**
- [ ] All five migrations apply cleanly to an empty database  *(blocked — no test DB; see Blocker A)*
- [ ] All five migrations apply cleanly on top of existing LUCCCA schema  *(blocked — no test DB)*
- [ ] All five migrations roll back cleanly with no orphan data  *(blocked — no rollback mechanism; see Blocker B)*
- [ ] Type check passes (`tsc --noEmit`)  *(not run end-to-end this shift; the new test file type-checks via vitest's transform)*
- [ ] File headers `Status: STUB → IMPLEMENTED` on the 5 .sql files  *(deferred — SQL file headers don't carry a `Status:` line today; ticket expectation may be editorial drift; see "Carried forward")*
- [ ] Self-audit complete + fresh-eyes pass

---

## What I completed before stopping

### Discoverable-fact resolutions

| Question | Answer | Evidence |
|---|---|---|
| Q2 — server router | **Express ^5.1.0** | `package.json` deps; no fastify, hono, or tRPC packages present |
| Q4 — DB client | **`server/database/connection.ts`** (pg ^8.18.0, Neon PostgreSQL) | Exports `query`, `getClient`, `transaction`, `closePool`. Uses `DATABASE_URL` with forced SSL |
| Q5 — test runner | **Vitest ^3.2.4** | `npm test` = `vitest --run`; `vite.config.ts:621` test block; `globals: false` (explicit imports required); Playwright present but only for `test:smoke:ui` |

### Static verification of foundation SQL (008-012)

All 5 foundation files comply with TICKET_001 acceptance criteria:

- `expires_at TIMESTAMPTZ NOT NULL` present on `resonance_readings` (008) and `signals` (012) — Tenet 2 ✓
- `signals.sensitivity TEXT NOT NULL` present (012) — Tenet 7 ✓
- 3 required indexes present: `idx_resonance_readings_expires`, `idx_signals_expires`, `idx_trajectories_property_active` (partial index with `WHERE ended_at IS NULL`)
- FK `interventions_executed.template_id → interventions_library(id)` preserved
- **Zero destructive DDL** across all 18 echo_resonance files (008-025) — verified via grep for `DROP/ALTER/RENAME` patterns
- Header `-- Migration: NNN` matches filename across all 18 files (post-override fix)

### Integration test scaffolded and partially executable

**File:** `tests/echo_resonance/migrations/foundation-migrations.test.ts`

**Two-layer design:**
- **Static layer (35 tests, all passing in 9ms):** reads SQL files from disk, regex-asserts structural contract. Runs in any CI without a database. **Genuinely catches regressions** — if someone re-introduces a destructive ALTER, removes a required column, breaks the FK, drops an index, or mis-renames a file, these tests fail loudly.
- **DB integration layer (9 `it.todo`):** skipped unless `DATABASE_URL_TEST` is set. Gate is intentionally a separate env var from the production `DATABASE_URL` to prevent accidental destructive runs against prod.

**Test run output (this shift):**
```
✓ tests/echo_resonance/migrations/foundation-migrations.test.ts (44 tests | 9 skipped) 9ms
Test Files  1 passed (1)
Tests  35 passed | 9 todo (44)
```

---

## What blocked me

### Blocker A — No test database is wired

**Evidence:**
- `.env` exists (almost certainly production credentials — did not read)
- No `.env.test`, no `DATABASE_URL_TEST` pattern in `.env.example`, no test-DB env convention anywhere I can find
- No existing tests in `tests/` import `server/database/connection`; no fixture creates or drops a schema
- TICKET_001 mise en place says *"A test database is available for migration verification."* That claim is **aspirational, not realized in tooling.**

**Per pass rule** (Q5 decision tree: "scaffold the test, do NOT execute" when the test runner choice — or test infrastructure — is ambiguous), I scaffolded the DB tests as `it.todo` gated on `DATABASE_URL_TEST`. They cannot run against production by accident.

### Blocker B — No working rollback mechanism

**Evidence:**
- `server/database/migrate.ts` (the wired runner) is forward-only — no rollback function exists
- `server/services/migration-rollback-service.ts` is supabase-based and marked `TODO-023`. Inline comment: *"Note: Supabase client doesn't support raw SQL execution directly. In production, would use direct database connection."*
- Migration files (008-025 and the existing 001-007) do not ship reverse SQL alongside forward SQL
- TICKET_001 tasting note *"All five migrations roll back cleanly with no orphan data"* is **structurally unverifiable** in the current codebase

**Pattern observed during recon:** the codebase has two coexisting migration systems —
- `pg`-based: `server/database/migrate.ts` → `server/database/migrations/` (where 008-025 now live, alongside 001-007 LUCCCA)
- Supabase-based: `server/services/database-migrations.ts` → `server/migrations/` (69+ files, with name-collision artifacts)

The rollback service was clearly written for the supabase track. There is no unified rollback story.

### Blocker C — Q3 (auth) is multi-candidate

**Evidence:** four `auth*.ts` candidates under `server/`:
- `server/middleware/auth.ts`
- `server/middleware/auth-jwt.ts`
- `server/lib/auth.ts`
- `server/routes/auth.ts`

**Per pass rule** ("multiple coexisting choices = stop, do not invent"), deferred. Not blocking for migration tests; will become blocking before `server/routes/resonance.ts` and `server/routes/signals.ts` are wired.

### Carried forward (not blockers, but worth pass attention)

- **Stale `Pending:` block in 008.** File `008_resonance_readings.sql` lines 10-11 still read *"Pending: Adapt to your team's migration runner (Drizzle / Prisma / raw SQL). This file is the canonical schema; translate as needed."* The other 17 echo_resonance SQL files do not have this block. Now stale post-Q1. Editorial rewrite, not a wired-tooling fact — left untouched per "do not invent."
- **No `Status:` field in SQL file headers.** TICKET_001 expects `Status: STUB → IMPLEMENTED` on the 5 foundation .sql files, but those file headers don't carry a `Status:` line today (only TypeScript files do per HANDOFF.md's header format). Either the ticket expectation is editorial drift, or `Status:` should be adopted into SQL headers as a new convention. Pass call.

---

## What I need from the pass to unblock

### To clear Blocker A (test database)

1. **Provision a test database.** Suggested: a separate Neon database (or local Postgres for dev) with `DATABASE_URL_TEST` in `.env` (gitignored). Migrations use Postgres-only types (TIMESTAMPTZ, JSONB, UUID) so any Postgres works.
2. Once wired, the 9 `it.todo` cases become straightforward to implement — apply forward migrations, query `pg_indexes` and `information_schema.columns` for the structural assertions, then drop the new tables for teardown.

### To clear Blocker B (rollback story)

Doctrinal call needed. Three options:

1. **Write reverse-SQL alongside forward-SQL** — e.g. `008_resonance_readings.up.sql` + `008_resonance_readings.down.sql`. Requires extending `server/database/migrate.ts` to support a rollback subcommand. Production-grade.
2. **Programmatic teardown in tests only** — the test file drops the new tables for cleanup, doesn't validate true rollback semantics. Unblocks TICKET_001 immediately.
3. **Defer rollback criterion** — relax TICKET_001's rollback tasting note until a separate "rollback strategy" ticket is fired.

**My recommendation:** option 2 to unblock TICKET_001's test layer this week, option 1 (or equivalent) as a separate, prior-to-production ticket. The existing `migration-rollback-service.ts` is unfit for the `pg`-based runner — it's a supabase artifact.

### To clear Blocker C (Q3 auth)

Pass needs to inspect the four `auth*.ts` candidates and name the canonical one (or order the consolidation). Not blocking tonight; becomes blocking before route work in TICKET_002+.

### Editorial decisions awaiting pass

- Stale `Pending:` block in `008_resonance_readings.sql` — leave / rewrite / delete?
- `Status:` field in SQL file headers — adopt the convention, or treat the ticket expectation as drift?

---

## Deliverables on this branch

```
feature/ticket-001-foundation-tests        ← pushed to origin for backup
└── 1 new commit on top of main (1021ae195)
    ├── tests/echo_resonance/migrations/foundation-migrations.test.ts  (NEW)
    │     35 tests passing + 9 todo (DB layer)
    └── HANDOFF_OVERNIGHT.md  (this file)
```

**Not merged to main.** Pass reviews in the morning, opens a PR, fires it through with a clear head.

---

> *"The check list is not for the chefs who don't know what they're doing. It is for the chefs who do."*
> — `docs/maestro/STATION_CHECK_LIST.md`

Yes Chef.
