# TICKET_003_PREP — type-mismatch context for downstream consumers

> Auxiliary doc paired with TICKET_002 (Foundation types).
> Read before firing TICKET_003 (Phase 1.3 Backend core).
> Saucier handoff context for the chef working the next plate.

---

## Why this exists

TICKET_002 tightened the foundation types in `shared/types/signals/*` and `shared/types/resonance/*` to align with the SQL schemas in migrations 008-012 and to enforce the privacy tenets at the type level. Three downstream files in `server/services/echo-ai3/` consume these types via stub interfaces. Those stubs were drafted before the SQL schemas were final; they will need updating when implementations are written. **The new types are correct; the stubs were wrong.**

This document captures the specific mismatches so the saucier firing TICKET_003 inherits the right context — the *why* behind each tightening, not just the *what*.

---

## File 1: `server/services/echo-ai3/resonance/resonance-engine.ts`

**Phase:** 1.3 (in TICKET_003 scope)
**Imports:** `ResonanceReading`, `NewResonanceReading`, `AffectCoordinate`, `ScoreConfig` from the resonance barrel.

### Current state
Imports compile cleanly post-TICKET_002. **No type errors at the import boundary.** The implementation is stub-only (`throw new Error('Not implemented (Phase 1)')`).

### What changed under TICKET_002
`ResonanceReading` now stores affect as **flat `arousal: number; valence: number;`** instead of nested `affect: AffectCoordinate`. `AffectCoordinate` survives as a standalone helper type — it's still imported and used by `scoreFromAffect()` for affect-math signatures.

### What the next saucier needs to do
- `createReading(input: NewResonanceReading)`: when constructing the persisted `ResonanceReading` object, set `arousal` and `valence` flatly (not under an `affect` key).
- `scoreFromAffect(affect: AffectCoordinate, config?: ScoreConfig)`: signature unchanged; implement the 1-10 score math.
- `createReading` must also set `expiresAt` per **Tenet 2** (score persists, audio evaporates) — typically `now() + 24h`. The repository should reject writes with missing `expiresAt`.

### Tenet driver
**Tenet 2.** The non-nullable `expiresAt: ISODate` on `ResonanceReading` is the type-level enforcement of audio decay. The engine must enforce it on every write — that's why the type was tightened, not loosened.

---

## File 2: `server/services/echo-ai3/resonance/trajectory-engine.ts`

**Phase:** 1.3 (in TICKET_003 scope)
**Imports:** `ResonanceTrajectory`, `TrajectoryTile`, `ResonanceReading` from resonance barrel; `UUID, PropertyId` from base.

### Current state
**Real type error at compile:** `import type { UUID, PropertyId } from '../../../../shared/types/base'` — `PropertyId` is not exported from `base.ts` (never was; pre-existing broken import, same pattern as the original `ISODateTime/GuestId/VisitId` issue we resolved in the type files themselves).

### What changed under TICKET_002
`ResonanceTrajectory` shape changed substantially:
- **Removed** `readings: ResonanceReading[]` (not a SQL column; readings live in the separate `resonance_readings` table — query them via `getRecentReadings()` on the resonance engine when needed)
- **Added** `propertyId: UUID` (SQL `property_id` NOT NULL — required by the partial index `idx_trajectories_property_active`)
- **Added** `endedAt?: ISODate` (SQL nullable; null while in-progress; uses `?:` per CC-4 "sometimes-not-yet-set")
- **Added** `readingCount: number` (SQL `INT NOT NULL DEFAULT 0`)
- **Added** `hasOpenIntervention: boolean` (SQL `BOOLEAN NOT NULL DEFAULT false`)

### What the next saucier needs to do
- **Fix the broken `PropertyId` import:** replace with `UUID`. No `PropertyId` brand type exists in this codebase; `propertyId` is just a `UUID` field.
- `getFloorView(propertyId: UUID)`: signature changes from `PropertyId` to `UUID` (parameter type matches the field type).
- `getTrajectory(visitId)`: returns the new shape — callers needing a readings array must hydrate via a separate query.
- `updateTrajectory(visitId, newReading)`: must increment `readingCount`, update `lastUpdatedAt`, and recompute `currentScore` / `trajectory` / `liftGap` / `status` from the running readings. The status transition logic (`green` → `amber` → `red` thresholds) lives here.

### Tenet driver
None directly. Trajectory shape changes were SQL-alignment per the TICKET_002 acceptance rule ("no invented fields"). The `readings` array was the largest invented field — it had no SQL column. The new shape matches `009_resonance_trajectories.sql` exactly.

---

## File 3: `server/services/echo-ai3/voyage/suggestion-ranker.ts`

**Phase:** 2 (NOT in TICKET_003 scope — this is Voyage / Phase 2 work)
**Imports:** `Gap` from `./gap-finder`; `UUID` from base.

### Current state
**No direct type-mismatch with TICKET_002's changed types.** suggestion-ranker.ts does not import from `shared/types/resonance/*` or `shared/types/signals/*`. Its dependency chain runs through `gap-finder.ts`, which has its own pre-existing broken import (`ISODateTime`) — but that's gap-finder's problem, not suggestion-ranker's.

### Why it's listed here
The pass flagged this file as a downstream consumer in the TICKET_002 dispatch. Direct-import analysis post-TICKET_002 doesn't confirm a tight coupling to the types changed in this ticket. Either:
1. The pass meant the indirect dependency through gap-finder, or
2. The list was indicative not exhaustive.

Either way, **this file is Phase 2 work and out of TICKET_003 scope.** Flagging here so the saucier firing TICKET_003 doesn't waste a plate trying to update it.

### What the future-saucier (Phase 2) needs to do
Eventually, when Voyage's `gap-finder.ts` gets its broken `ISODateTime` import fixed (likely via the same `ISODate` swap TICKET_002 used), suggestion-ranker.ts will compile via its dependency chain. No direct change needed in this file beyond what `gap-finder.ts` requires.

### Tenet driver
None.

---

## Summary table

| File | Phase | TICKET_003? | Type mismatch | Tenet driver |
|---|---|---|---|---|
| `resonance-engine.ts` | 1.3 | Yes | Stub uses old nested `affect:` shape; needs flat `arousal`/`valence` on construction | **Tenet 2** (`expiresAt` enforcement) |
| `trajectory-engine.ts` | 1.3 | Yes | Broken `PropertyId` import; needs new fields (`propertyId`, `endedAt`, `readingCount`, `hasOpenIntervention`) on construction; must drop `readings` array | None (SQL alignment) |
| `suggestion-ranker.ts` | 2 | No (Phase 2) | None direct; indirect via gap-finder | None |

---

## Carried forward from TICKET_002

- **Pre-existing repo-wide tsc errors:** 4122 across the codebase (cache-cleared count). 0 in `shared/types/`. 0 in TICKET_002's 7 ticket files. **TICKET_002 introduced 0 new errors.** Out of scope for both TICKET_002 and TICKET_003. Will become its own ticket (or set of tickets) when prioritized. Distribution is heavily concentrated in `client/modules/EchoEventStudio`, `client/modules/Culinary`, `client/modules/PurchasingReceiving`, `client/modules/Maestro`, and `client/modules/Schedule` — none of which intersect with the resonance/signals foundation.
- **`PropertyId` doctrinal call carried over.** The trajectory-engine.ts fix is straightforward (`PropertyId` → `UUID`), but a wider grep would find `PropertyId` (and `GuestId`, `VisitId`, `ISODateTime`) referenced in broken imports across `shared/types/voyage/*`, `shared/types/resonance/forecast.ts`, and elsewhere. The cleanest path: a separate ticket that audits all branded-UUID/datetime references in the scaffolding and replaces them with `UUID` / `ISODate` from `base.ts` en masse. Flagging here for visibility — out of TICKET_003 scope.

---

## Blockers inherited from TICKET_001

Per `HANDOFF_OVERNIGHT.md` from TICKET_001, three blockers persist that affect TICKET_003 directly:

- **A — No test database is wired.** TICKET_003 will write integration tests for `signal-recorder`, `signal-query`, and `signal-decay` that need a real database. Until `DATABASE_URL_TEST` is provisioned, those tests can be scaffolded but not executed.
- **B — No working rollback mechanism.** Affects test teardown.
- **C — Q3 auth is multi-candidate.** Phase 1.3 services don't directly need auth, but the cron in `signal-decay` may need staff context for audit logs. If so, Q3 becomes blocking before this ticket fires.

---

> *"Sauce is foundation. Get the foundation wrong and there is no recovery."* — `docs/maestro/STATIONS/SAUCIER.md`

Yes Chef.
