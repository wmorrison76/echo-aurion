# ADR-0004 · Tenant isolation as a first-class contract

## Status
Accepted · 2026-04 (D27)

## Context
LUCCCA serves multiple property groups. Each group is a `tenant_id`.
Cross-tenant data exposure is a contract-level violation — not a
bug, a breach. The doctrine `PRIVACY_TENETS.md` puts this at the
top of the list.

Before D27, several modules wrote rows without `tenant_id` or
queried without filtering by it. The audit pass-1 caught this in
commissary, forecasts, and COGS events. The fix: make `tenant_id`
mandatory at the schema, query, AND test level.

## Decision
**Three-layer enforcement**:

1. **Schema**: every collection that holds tenant data has
   `tenant_id` as a required field. Indexes lead with it
   (D53.2).

2. **Query**: every `find()` / `find_one()` / `update_one()` /
   `delete_one()` call MUST include `tenant_id` in the filter.
   We don't ship route handlers that omit it. CI will fail
   on a Semgrep rule (D23 `find-without-tenant-id`).

3. **Tests**: D53.15 tenant isolation contract tests seed
   alpha + beta and assert no cross-tenant leakage. CI runs
   them on every PR.

`tenant_id` flows from the request via `x-tenant-id` header,
defaulting to `"default"` for legacy compatibility (will be
removed once all callers updated).

## Consequences
**Pros**
- An accidental leakage at PR time fails CI before merge
- Compliance reviews can point at the contract test file as
  proof
- D38 cross-correlation engine is safe: it scopes to one
  tenant's findings only

**Cons / risks**
- Every query has +1 field to remember; we mitigate via the
  Semgrep rule
- Cross-tenant analytics (e.g., the multi-property benchmark
  in D43) require a separate code path that explicitly
  un-scopes; that path anonymizes peer property names
- "Default" tenant fallback is a temporary compatibility layer;
  removing it will require a migration to stamp `tenant_id` on
  all legacy rows

**Alternatives considered**
- **Database-level row security** (Postgres RLS): not available
  on Mongo. Would require migration to Postgres (rejected per
  ADR-0001).
- **Per-tenant database / collection sharding**: too operationally
  heavy at our stage. Re-evaluate at >100 tenants.

## Migration trigger
Re-evaluate when:
- Tenant count exceeds 100 (per-tenant collection / DB may
  outperform)
- Performance telemetry shows tenant_id filter as a hot loop
  (means we've outgrown the index strategy)
