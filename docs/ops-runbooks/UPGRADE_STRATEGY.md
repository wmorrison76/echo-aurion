# Upgrade Strategy — macOS-style Updates, No Customer Data Loss

> What we promise customers, how we deliver it, and what every
> contributor must know before merging code that changes the schema
> or the persisted format.

---

## The promise (the only sentence that matters)

> *"Aurion never loses your data on upgrade. We can ship a bug fix
> at noon and you don't notice. We can ship a major feature at
> midnight and your team is using it on Monday morning, with their
> exact same data, intact and complete."*

This is the operational promise. Everything else in this document is
the engineering apparatus that makes that sentence literally true.

---

## The four guarantees

Every Echo / LUCCCA release honors four guarantees:

1. **Customer data is never destroyed.** No migration is allowed to
   `DROP COLLECTION`, `DELETE WHERE`, `truncate`, or remove a field
   that contains customer-authored data. Schema-evolves are
   forward-only by default; deprecated fields are tombstoned and
   continue to be readable for ≥ 12 months.

2. **Every release is rollback-able.** A snapshot manifest is recorded
   in `snapshot_manifests` BEFORE every destructive migration. The
   `rollback()` function on every migration must restore prior state.
   Production deploys take a Mongo snapshot or equivalent before the
   migration runs.

3. **Migrations are idempotent + resumable.** The existing
   `backend/migrations/run_migration.py` runner enforces this by
   contract — every migration writes checkpoints to `migrations_log`
   and re-running picks up where it left off. Crash mid-migration ≠
   corruption.

4. **Customers see what changed.** Every release publishes a
   user-facing changelog entry to `release_changelog`. The in-app
   "what's new" banner reads from this. No silent ships.

---

## Versioning — semver

The platform follows semantic versioning:

| Segment | Bumps when… | Customer impact |
|---|---|---|
| MAJOR (`1.0.0` → `2.0.0`) | API contract or schema change is breaking | Email + 30-day notice; coordinated upgrade window |
| MINOR (`0.64.0` → `0.65.0`) | Additive change — new modules, new endpoints | In-app banner; no customer action required |
| PATCH (`0.64.0` → `0.64.1`) | Bug fixes, doctrine corrections, no API change | Silent ship |

Current version: **`0.64.0`** (the D64 release shipping in PR #68 —
outlet capture system + 18 CFO toolkit modules + lifecycle engine
+ forecast endpoint rewrite).

Stamped in `backend/services/upgrade_safety.py` as `APP_VERSION`.
Customers can see it via `GET /api/upgrade/version`.

---

## The schema-migration apparatus

### What's already built (verified 2026-05-09)

| Piece | Location | Status |
|---|---|---|
| Idempotent, resumable migration runner | `backend/migrations/run_migration.py` | ✅ |
| Migration history (durable log of every run) | `migrations_log` collection | ✅ |
| Forward + rollback contract per migration | Each `m_*.py` file | ✅ |
| Resume-from-checkpoint on crash | `_run_migration.py` | ✅ |
| Required-schema-version stamp | `APP_VERSION` + `REQUIRED_SCHEMA_VERSION` in `upgrade_safety.py` | ✅ (new in 0.64.0) |
| Changelog endpoint | `release_changelog` collection + `/api/upgrade/changelog` | ✅ (new in 0.64.0) |
| Snapshot manifest endpoint | `snapshot_manifests` + `/api/upgrade/snapshots` | ✅ (new in 0.64.0) |
| Upgrade health probe | `/api/upgrade/health` | ✅ (new in 0.64.0) |
| Feature-flag visibility | `/api/upgrade/feature-flags` | ✅ (new in 0.64.0) |

### What still needs ops wiring (deploy-side, not code-side)

| Piece | What | Who owns |
|---|---|---|
| Automated daily Mongo snapshot | A cron / managed-service backup taking a daily snapshot, registering the manifest via `POST /api/upgrade/snapshots` | Ops |
| Pre-deploy snapshot hook | The deploy script POSTs a snapshot manifest before running migrations | Ops |
| Auto-migrate on deploy | The deploy script runs `python backend/migrations/run_migration.py <ID>` after the snapshot is recorded | Ops |
| Health-gated rollout | The load balancer reads `/api/upgrade/health`; a `red` status pauses the rollout | Ops |

These are **deployment automation**, not code changes. Once the deploy
pipeline runs them, every release becomes an automatic, safe,
customer-data-preserving upgrade.

---

## What goes in a migration vs. what doesn't

### YES — write a migration when:

- You add a new collection that needs an index
- You add a new field to existing documents that requires backfill
- You rename or restructure existing data
- You add a new feature flag that must be seeded
- You change an enum value from "old" to "new" across documents

### NO — don't write a migration for:

- Adding a new field that's optional and read-with-default
  (handled at read time)
- Adding a new endpoint (no schema impact)
- Adding a new collection that's created lazily on first write
- Adding indexes that are created idempotently in the module's
  `_ensure_indexes()` (e.g., outlet_capture, lifecycle_engine — they
  call `create_index` on import; running it again is a no-op)

### NEVER — these are forbidden in a migration:

- ❌ `db.collection.drop()` on customer data
- ❌ `db.collection.delete_many({})`
- ❌ `db.collection.update_many({}, {"$unset": {"customer_field": ""}})` without a tombstone trail
- ❌ Removing a field that has been written by customer-authored events
- ❌ Lossy schema changes (dropping precision on Money, truncating
  audit logs, removing event-bus history)

If you genuinely need to remove customer data — for a customer's
right-to-deletion request, for example — that's a **runtime API**
(per Privacy Tenet 5), not a migration. The runtime API
cryptographically deletes via key-shredding (per the doctrine patent),
preserving event-log integrity.

---

## The migration writing contract

Every migration in `backend/migrations/m_<YYYYMMDD>_<label>.py` MUST:

```python
ID = "20260509_lifecycle_engine"
DESCRIPTION = "Human-readable description of what this migration does"

def forward(db, *, dry_run=False, batch_size=500, resume=True, logger=print) -> dict:
    """Move the schema forward. MUST be:
      · idempotent — re-running with same data produces same end state
      · resumable — read checkpoint from migrations_log, write progress
      · non-destructive — never touches customer data unless the spec
        explicitly requires it (and even then, key-shredding only)"""
    ...
    return {"status": "ok", "counts": {...}}

def rollback(db, *, dry_run=False, logger=print) -> dict:
    """OPTIONAL — only required for migrations that have a meaningful
    rollback path. Pure-additive migrations (creating collections,
    adding indexes, seeding new defaults) can return a no-op."""
    return {"status": "rollback_noop"}
```

The runner reads the `migrations_log` collection to determine which
have run. Re-running an already-`done` migration is a no-op.

---

## Release process

### Patch release (bug fix, no schema change)

1. Develop on a branch
2. Open PR; CI runs (when fixed — see `BACKLOG.md` for the
   Setup-Node-step issue)
3. Code review
4. Merge to `main`
5. CD pipeline:
   - Pulls main
   - Runs `pytest` and `pnpm test`
   - Builds Docker image tagged `0.64.x`
   - Rolls out (no migration step needed)
6. `/api/upgrade/version` reports the new version
7. No customer-facing changelog needed for pure bug fixes (covered
   in the next minor)

### Minor release (new modules, new endpoints — additive)

1. Develop on a feature branch (like `claude/D64-icon-master-list`)
2. Write any required migrations (with `forward` + idempotent
   `_ensure_indexes()` in the module itself for collection setup)
3. Open PR; full CI runs
4. Code review with focus on migration safety
5. Bump `APP_VERSION` in `upgrade_safety.py`
6. Bump `REQUIRED_SCHEMA_VERSION` if any migration runs
7. Add a changelog entry via the migration's `forward()` (see
   `m_20260509_lifecycle_engine.py` for the pattern)
8. Merge to `main`
9. CD pipeline:
   - Pulls main
   - **Records snapshot manifest** before migration
   - Runs `python backend/migrations/run_migration.py <new_id>`
   - Verifies `migrations_log` shows status=done
   - Runs `pytest` against the migrated DB
   - Rolls out new image
   - Pings `/api/upgrade/health` post-rollout; rolls back if `red`
10. In-app "what's new" banner shows the changelog entry on next
    user login

### Major release (breaking change — rare)

1. 30-day customer notice with the breaking change listed
2. Otherwise same as minor, but with explicit customer
   communication and (optionally) a per-customer staggered rollout

---

## Rollback procedure

If a release ships and something breaks:

### For pure code issues (no schema change)

1. Re-deploy the prior image tag
2. Customers see prior version on next request
3. Investigate, fix, re-release

### For migration-related issues

1. **Stop the rollout** (load balancer drains the new pods)
2. **Run the migration's `rollback()`** if it has a meaningful one
3. **Restore from snapshot** if rollback isn't sufficient — the
   snapshot_manifests collection has the pointer to the pre-migration
   snapshot
4. Re-deploy the prior image
5. Customer impact: minutes of degraded service in the worst case;
   zero data loss

### For data corruption discovered later

1. Identify the corrupting commit/migration
2. Restore the affected collection from the latest pre-corruption
   snapshot
3. **Replay the append-only event log** from the snapshot timestamp
   forward — the doctrine patent's event-sourcing guarantee means
   we can rebuild any derived state from events
4. Customer impact: the corruption window's events are preserved;
   derived state is reconstructed exactly

---

## Customer-data preservation invariants

The following invariants are **always true** across any upgrade:

1. **Every event the customer's system has ever published is still
   in `event_bus_store`.** Events are append-only; never deleted.
   (Per Privacy Tenet 5, customers can delete their own data via
   the runtime API; that's distinct from migrations destroying it.)

2. **Every dollar amount that ever posted is still in
   `aurum_gl_journal`.** B1's Money type and B2's GL invariants
   guarantee no rounding drift across reads. Decimal precision is
   preserved across format changes.

3. **Every audit event ever recorded is still in `audit_events` /
   `outlet_capture_weights_history` / `period_close_step_events` /
   `intercompany_eliminations_audit` / `lifecycle_step_events`.**
   The doctrine §3.1 append-only invariant.

4. **Every customer-authored configuration is still readable.**
   Schemas may grow new optional fields; existing configs read with
   default values. Renamed fields keep their old name as a
   tombstoned alias for ≥ 12 months.

5. **The doctrine version under which any historical event was
   evaluated is recoverable.** Per the patent §4 cryptographic
   event-doctrine linkage. Even if doctrine evolves, we know
   exactly which version any given event passed.

---

## What customers see during an upgrade

- **Patch release:** nothing. Service stays up; new behavior takes
  effect on next request.
- **Minor release:** a small "what's new" banner on next login
  surfaces the changelog entry. Banner is dismissible. Their data,
  their views, their forecasts, their accuracy gauge — all
  preserved exactly.
- **Major release:** advance notice email, 30-day window, in-app
  banner during the window, and an opt-in "upgrade now" button if
  they want to cut over early.

---

## Who reads this document

- **Every contributor** before writing a migration or schema change.
- **Ops** when setting up the deploy pipeline (the snapshot →
  migrate → health-check sequence).
- **Customer success** when a customer asks "will I lose my data
  if you ship a new version?" — the answer is the four guarantees
  at the top of this doc.

---

## Quick reference — every endpoint added in 0.64.0

```
GET    /api/upgrade/version                  # current app + schema version
GET    /api/upgrade/health                   # red/amber/green operational health
GET    /api/upgrade/migrations               # full migration history
POST   /api/upgrade/changelog                # publish a release entry (CI-driven)
GET    /api/upgrade/changelog                # customer-facing "what's new"
GET    /api/upgrade/changelog/{version}      # specific release notes
POST   /api/upgrade/snapshots                # record a DB snapshot manifest
GET    /api/upgrade/snapshots                # all snapshots
GET    /api/upgrade/snapshots/latest         # most-recent snapshot
GET    /api/upgrade/feature-flags            # read-only flag visibility
```

These are operational endpoints; they're authentication-gated in
production deploys (admin-only) and read-only for non-admin users.

---

## Closing

The doctrine has a line: *"we do not lose customer data."* This
document is the engineering plan that makes that doctrine literally
true at deploy time. Every release that ships should pass through
this checklist:

  - [ ] APP_VERSION bumped per semver
  - [ ] REQUIRED_SCHEMA_VERSION bumped if any migration runs
  - [ ] Migration files written with `forward()` + idempotent
        index creation
  - [ ] Migration tested against a copy of production data
  - [ ] Snapshot manifest will be recorded before deploy
  - [ ] Changelog entry composed (lives in the migration's
        `forward()` for consistency)
  - [ ] Rollback path documented (even if no-op)
  - [ ] PR description includes the schema-impact summary

If you're ever about to ship a migration that breaks one of the
four guarantees, **stop and escalate**. The promise is more
important than the feature.
