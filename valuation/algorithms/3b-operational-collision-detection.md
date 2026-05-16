<!-- Per-algorithm 2-pager. Parent catalog: ALGORITHM_INVENTORY.md. SCORECARD ref: Section 3b. -->

# 3b — Operational Collision Detection

> ⚠️ **MODULE BOUNDARY STATUS — PENDING MERGE TO MAIN**
> `backend/routes/cross_dept_borrow.py` (440 LoC) and `backend/routes/chef_outlet.py:beo_event_detail` (line 914, BEO same-day-prep aggregator) live only on `origin/conflict_110526_1036`. `backend/routes/echo_schedule.py:_check_shift_compliance` (line 191, shift-rules collision detector) exists on `origin/main`.
> Score state: **3b.1 module boundary = 🟨 pending merge** until merge fires.

---

## Files

| Path | LoC | Branch | Role |
|---|---|---|---|
| `backend/routes/cross_dept_borrow.py` | 440 | conflict-only | Cross-department employee borrow with auto-PAF generation |
| `backend/routes/echo_schedule.py:_check_shift_compliance` | 191 (function start) | both | Per-employee shift legality / collision checks |
| `backend/routes/chef_outlet.py:beo_event_detail` | line 914 | conflict-only | BEO same-day-prep aggregator (event-level collision surface) |
| `client/modules/Schedule/index.tsx` | (Schedule UI) | both | Frontend collision-surface display |

## Inputs

The collision-detection algorithm consumes joint state across three operational layers:

| Layer | Inputs |
|---|---|
| **Schedule layer** | Shift assignments (`shift_assignments`), employee profiles (skills, certifications), position requirements, rest-window + minor-cutoff + OT-trigger compliance rules |
| **Revenue scoping** | POS-attributed labor cost per outlet, per-position revenue contribution targets |
| **Event layer (BEO)** | Same-day-prep BEO events, station-level resource requirements, shared commissary draw |
| **Sister-outlet coverage** | Coverage% per sister outlet, employee cross-property eligibility, distance/travel-time constraints |

## Outputs

For each detected collision, produces:

- **Collision type** ∈ `{schedule_conflict, prep_overlap, coverage_gap_cross_property, position_eligibility_violation, compliance_flag}`
- **Severity** (urgent / warn / optimize) — same weighting as Decision Clearance
- **Borrow PAF** (Personnel Action Form) — auto-generated when cross-department borrow resolves the collision
- **Resolution path** — the suggested operator action (shift trade, position re-assignment, BEO timing adjustment, cross-property borrow)
- **Audit row** to `borrow_pafs` table — append-only attestation

## Heuristic Logic

The algorithm performs **multi-layer joint evaluation** — distinct from single-layer collision detection in legacy schedule tools:

1. **Schedule-layer pass**: detects shift overlaps, rest-window violations, minor-cutoff violations, OT-trigger violations per `_check_shift_compliance`
2. **Revenue-scoping pass**: detects when collision resolution must respect POS revenue boundaries (can't borrow a server from a high-revenue outlet to a low-revenue outlet without revenue-attribution correction)
3. **Event-layer pass (BEO)**: detects when same-day-prep events compete for shared commissary, prep stations, or specific specialist labor
4. **Cross-property pass**: detects when sister outlets have coverage headroom that can resolve the local collision (network-flow optimization over a directed graph of outlet adjacencies + employee cross-property eligibility)

Each pass produces collision candidates; the algorithm ranks by severity and proposes the **lowest-friction resolution** (preferring shift trades over PAFs, preferring same-outlet over cross-property, preferring same-position over cross-skill).

## Novelty Statement

**Cross-departmental, multi-layer collision detection with revenue-scoping, BEO-aware, and sister-outlet-coverage-aware resolution** — distinct from competitors along four dimensions:

1. **Multi-layer vs single-layer.** 7shifts / Homebase / Deputy detect schedule-layer collisions only (overlapping shifts, OT triggers). LUCCCA's 3b spans schedule + revenue + event + cross-property simultaneously.

2. **Revenue-scoping aware.** Existing shift-trade UIs ignore POS revenue scoping when proposing resolutions. LUCCCA's 3b respects that swapping employees across outlets changes the per-outlet labor% attribution and requires explicit operator acknowledgment.

3. **BEO same-day-prep awareness.** Event-side tools (Tripleseat) don't expose BEO event timing to scheduling tools. LUCCCA's `beo_event_detail` aggregator surfaces same-day-prep conflicts (two BEOs needing the same prep station at the same time) as collision candidates.

4. **Auto-PAF generation.** Cross-department borrow produces a real PAF (Personnel Action Form) in `borrow_pafs` table — operator's signed acknowledgment, audit-trail-grade — not just a calendar update. Sister-outlet coverage gaps trigger automatic borrow proposals when feasible.

The combination of (multi-layer + revenue-scoping + BEO-aware + auto-PAF) is the distinct intangible.

## Competitor Delta

| Competitor | What they do | Where 3b differs |
|---|---|---|
| **7shifts / Homebase / Deputy** | Schedule-layer overlap + OT alerts | Schedule-only; no revenue scoping, no BEO awareness, no auto-PAF |
| **Toast** | Statistical anomaly detection on labor% | No multi-layer joint evaluation; no event-layer awareness |
| **MarketMan** | Inventory + recipe costing | Not in collision-detection space |
| **Tripleseat** | Event sales + BEO management | Event-side only; doesn't surface BEO conflicts to schedule layer |
| **ADP / Workday** | Policy-time enforcement | Post-fact policy violations; no real-time collision detection |
| **Reflexis / Quinyx** | Enterprise WFM with retail AI | Schedule-layer ML for retail; not hospitality-native; no BEO or revenue scoping integration |

## Cross-links

### Doctrine
- [SILENT_SERVICE.md](../../docs/maestro/SILENT_SERVICE.md) — "Pride from love, not pride from fear" — 3b invites operators to investigate cross-property coverage gaps rather than punishing schedule violations
- [BRIGADE_LEARNINGS.md](../../docs/maestro/BRIGADE_LEARNINGS.md) — narrow-grep failure mode — 3b's broader scan across schedule+revenue+event+cross-property layers is the brigade-disciplined alternative to single-layer schedule-only checks

### Parent catalog
- [ALGORITHM_INVENTORY.md](./ALGORITHM_INVENTORY.md) — Section B.1 item #2 (Operational Collision Detection); Section C item #6 (network flow optimization)
- White papers #1 + #10 (Echo AI³ MOI Architecture, Maestro BQT Event OS) — 3b is the cross-layer collision surface across both

### Pipeline evidence on disk
- `valuation/algorithms/3b/authorship.txt` (sole-author confirmed)
- `valuation/algorithms/3b/timeline.txt`
- `valuation/algorithms/3b/callgraph-cross_dept_borrow.dot` (pydeps 1.4 KB)

## Status

| Item | State |
|---|---|
| 3b.1 Module boundary | 🟨 pending merge |
| 3b.2 Call graph | 🟩 |
| 3b.3 Spec in operator language | 🟩 (this file) |
| 3b.4 Novelty | 🟩 (Novelty Statement above) |
| 3b.5 Git timeline | 🟩 |
| 3b.6 Author attribution | 🟩 |

---

*Yes Chef.*
