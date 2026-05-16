# BLOCKER A — Neon Test Database Setup

> Human-executed setup steps for provisioning the Neon test database
> that unblocks TICKET_003. The code-side scaffolding is already in place
> (see commit at end of this doc) — all that remains is creating the
> Neon project and pasting the connection string into `.env.test`.

---

## Why Neon?

Pass picked Neon over Docker for three reasons:
- **Same provider class as production-likely** — production will probably
  also be Neon (or compatible Postgres). Test DB matching production
  flavor avoids drift.
- **Lowest local-machine friction** — no Docker daemon, no port juggling,
  no running container to remember.
- **Free tier is sufficient** — Neon's free tier handles a single test
  branch with our migration count without billing.

---

## Step-by-step (human runs these)

### 1. Sign up at neon.tech

Go to <https://neon.tech> and sign up. Google / GitHub / email all work.
The free tier is the default — no credit card required.

### 2. Create a project named `echo-aurion-test`

In the Neon dashboard, click **New Project**:
- **Project name:** `echo-aurion-test`
- **Postgres version:** 16 (latest stable; our migrations require 13+ for
  `gen_random_uuid()` and JSONB but Postgres 16 is the safest pick)
- **Region:** pick whichever is closest to your dev machine — latency
  isn't critical for tests, but lower is more pleasant

### 3. Create a database branch named `test`

Neon supports branching like git. The default branch is usually `main` or
`production` — create a separate `test` branch so you can experiment
without touching whatever lives on the default branch:

In the project, **Branches** → **New Branch** → name it `test`.

(If you'd rather keep it simple and just use the default branch, that
works too. The branch isolation is just a nice-to-have, not required.)

### 4. Copy the connection string

In the dashboard for your `test` branch:
- Click **Connection Details**
- Pick **Pooled connection** (the suffixed `-pooler` host) — this is
  what you want for short-lived test connections
- Copy the full URL. It looks like:
  ```
  postgresql://user:password@ep-something-pooler.region.aws.neon.tech/dbname?sslmode=require
  ```

### 5. Create `.env.test` at repo root

The file is gitignored — it will never be committed. Create it from the
template:

```bash
cd ~/Documents/Echo_Aurion-main/Echo_Aurion-LUCCCA_Framework
cp .env.test.example .env.test
```

Then open `.env.test` in an editor and replace the placeholder line:

```
DATABASE_URL_TEST=postgres://user:password@host/db?sslmode=require
```

with the actual connection string you copied from Neon.

### 6. Run the migrations against the test database

```bash
npm run test:db:apply-migrations
```

This invokes `scripts/test-db/apply-migrations.ts`, which:
- Loads `.env.test`
- Verifies `DATABASE_URL_TEST` is set (errors with a clear pointer to
  this doc if not)
- Spawns the canonical `server/database/migrate.ts` runner with
  `DATABASE_URL=DATABASE_URL_TEST` in the child process env (never
  mutating the parent's production-pointing value)
- Streams migration output: `Executing migration: 001_create_base_schema.sql` …
  through `025_training_corpus.sql`

Expected output ends with:

```
✅ All migrations completed successfully!
```

If a migration fails, the exit code propagates. The runner's
`schema_migrations` table tracks what's already applied, so re-running
is idempotent — it skips migrations that are already recorded.

### 7. Run the integration tests

```bash
npm run test:db
```

This runs `vitest run tests/echo_resonance --reporter=verbose`.

Expected output:

```
✓ tests/echo_resonance/migrations/foundation-migrations.test.ts (44 tests | 1 todo)
  ✓ TICKET_001 - foundation migrations 008-012 (static)
    ✓ 008 resonance_readings (3 tests)
    ✓ 009 resonance_trajectories (2 tests)
    ✓ 010 interventions_library (1 test)
    ✓ 011 interventions_executed (2 tests)
    ✓ 012 signals (4 tests)
    ✓ additive-only invariant (18 tests)
    ✓ header-filename consistency (5 tests)
  ✓ TICKET_001 - foundation migrations 008-012 (DB integration)
    ✓ all five foundation migrations are recorded in schema_migrations
    ✓ LUCCCA foundation migrations 001-007 also recorded — 008-012 applied on top
    ✓ all five expected tables exist in public schema
    ✓ FK from interventions_executed.template_id to interventions_library(id) is enforced
    ✓ expected indexes exist
    ✓ Tenet 2: NOT NULL on resonance_readings.expires_at is enforced
    ✓ Tenet 2: NOT NULL on signals.expires_at is enforced
    ✓ Tenet 7: NOT NULL on signals.sensitivity is enforced
    ↓ rollback BLOCKED (Blocker B, todo)

Test Files  1 passed (1)
     Tests  43 passed | 1 todo (44)
```

35 static + 8 DB-integration = **43 passing**, plus the 1 deferred
rollback test as `todo` (Blocker B — separate ticket).

If you see this output, **Blocker A is RESOLVED** and TICKET_003 can fire.

---

## Troubleshooting

### "DATABASE_URL_TEST is not set"
- `.env.test` not created at repo root, OR
- File exists but the variable name has a typo, OR
- Connection string is empty after the `=`

### "Connection refused" / network errors
- The connection string from Neon must include `sslmode=require` (the
  helper auto-appends it if missing, but Neon's pooled connection string
  always includes it)
- If you're behind a corporate firewall, Neon's hosts may be blocked

### Migration fails with "extension X does not exist"
- Some migrations may need extensions (e.g., `pgcrypto` for
  `gen_random_uuid()`). Postgres 13+ has it built in. Neon Postgres 16
  has it. If you picked an older Neon Postgres version, recreate the
  project with 16.

### Tests pass but skip the DB block
- Vitest runs `tests/setup.ts` which calls `dotenv.config({ path: '.env.test' })`.
  If `.env.test` is missing or has the wrong variable name, the
  `describe.skipIf` gate in the test file fires and the DB tests are
  skipped (you'll see 35 passing + 9 skipped).
- This is the **expected fallback** when no test DB is provisioned. Once
  `.env.test` is in place, the tests un-skip automatically.

---

## Code-side scaffolding already in place

Branch: `feature/blocker-a-test-db`

Files committed alongside this doc:
- `tests/_helpers/test-db.ts` — `getTestPool`, `closeTestPool`,
  `withTransaction`, `applyMigrations` helpers
- `scripts/test-db/apply-migrations.ts` — CLI for the
  `test:db:apply-migrations` npm script
- `.env.test.example` — template (this file's reference)
- `.gitignore` — added `!**/.env.test.example` exception so the example
  is tracked while `.env.test` itself stays gitignored
- `tests/setup.ts` — added dotenv load for `.env.test`
- `tests/echo_resonance/migrations/foundation-migrations.test.ts` —
  converted 8 of 9 `it.todo` tests to real `it()` tests gated on
  `describe.skipIf(!DATABASE_URL_TEST)`. The 9th (rollback) stays
  `it.todo` because Blocker B (no rollback mechanism) isn't resolved.
- `package.json` — added `test:db` and `test:db:apply-migrations` scripts

When `.env.test` is in place, everything just works — no further code
changes needed.

---

## What this doc does NOT do

- Does not provision Neon for you — that's account work, intentionally
  human-only
- Does not modify `.env` (the production env file) under any circumstance
- Does not log connection strings anywhere
- Does not touch the production database, even read-only

---

> *"Sauce is foundation. Get the foundation wrong and there is no recovery."*
> — `docs/maestro/STATIONS/SAUCIER.md`

Yes Chef.
