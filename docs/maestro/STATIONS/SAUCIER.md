# Saucier

> The sauce station. *The most senior chef de partie because everything else relies on the sauces.*

## The role

In a classical brigade, the saucier is the senior chef de partie. The reason is simple: every protein on the menu, every vegetable on the menu, every dish that needs depth — *passes through the sauces.* Wrong reduction, wrong dish. The saucier's failure does not stay at the saucier's station; it flows to every plate.

In this kitchen, the saucier is **Schema & Persistence**. The database is the sauce of the platform. Every layer reads from it, writes to it, depends on its shape. Get the schema wrong and every downstream station produces a flawed plate.

## What the saucier owns

**Migrations.** All Echo Resonance migrations in `server/database/migrations/` (008-025). The saucier translates the SQL into the team's chosen migration framework (Drizzle, Prisma, raw — whatever the pass has decided). The saucier owns ordering, idempotency, foreign keys, indexes. The saucier owns rollback paths.

**Repository / data access patterns.** The way services read and write the database. The saucier defines the patterns and the other stations follow them. *Saucier writes the recipe; other stations cook from it.*

**Retention and decay.** The cron jobs that enforce tenet 2 (audio decay) and tenet 7 (sensitive flag decay). The saucier owns the discipline of what stays and what evaporates. *The score persists, the audio evaporates.* The saucier makes that real.

**Schema integrity over time.** When new features arrive, the saucier ensures additive migrations only. *No existing column is changed. No existing constraint is loosened. New tables and new columns only.* This is non-negotiable: the existing LUCCCA system must remain intact.

## What the saucier does NOT own

- Anything in `shared/types/` — that is the pass's territory
- Service business logic — other stations cook from the sauces; the saucier does not run the line
- API routes — the garde manger composes; the saucier does not plate
- UI — that is the entremetier

## The saucier's discipline

A saucier tastes their sauce constantly. Every five minutes during service. They are not waiting until plating to find out the béarnaise broke. They check, they correct, they check again.

In code: *the saucier writes integration tests against real schema, not mocks.* Migrations run cleanly on a fresh database. Migrations roll back cleanly. The retention crons actually purge. The saucier does not ship a migration without watching it apply, watching it roll back, and watching the cron run end-to-end.

## What "done" looks like for the saucier

A migration is done when:
1. It applies cleanly on an empty database
2. It applies cleanly on a database with prior migrations
3. It rolls back cleanly with no orphan data
4. The retention cron for the new table (if applicable) is implemented and tested
5. The repository pattern is documented in a way the other stations can use without questions
6. The migration honors additive-only against the existing LUCCCA schema

If any of those is false, the plate does not fire.

## Who staffs this station

- Strong SQL background
- Comfort with the team's chosen migration framework
- Patience for retention/decay testing (these are easy to half-ship)
- Sees the database as a long-lived asset, not just storage

For an AI Maestro setup, this station wants a model with strong code-generation reliability and tests that genuinely run against a real database in CI.

---

> *"Sauce is foundation. Get the foundation wrong and there is no recovery."*
