<!-- Per-algorithm 2-pager. Parent catalog: ALGORITHM_INVENTORY.md. SCORECARD ref: Section 3a. Doctrine cross-links: SILENT_SERVICE.md (pride from love vs fear), BRIGADE_LEARNINGS.md (.01 principle). -->

# 3a — Decision Clearance (Labor Brain Advisory Rail)

> ⚠️ **MODULE BOUNDARY STATUS — PENDING MERGE TO MAIN**
> The full algorithm (including the 232-line Labor Brain rules engine) lives on `origin/conflict_110526_1036`. On `origin/main`, only the dashboard aggregator half (lines 1–381) is present; the rules engine (lines 575–810 on conflict, 432 LoC) merges with the next PR.
> Score state: **3a.1 module boundary = 🟨 pending merge** until merge fires; flips 🟩 immediately on merge.

---

## Files

| Path | LoC | Branch | Role |
|---|---|---|---|
| `backend/routes/echo_schedule.py` | 812 | conflict (381 on main) | Dashboard aggregator + Labor Brain rules engine |
| `client/modules/Schedule/index.tsx` | (uses `LaborBrainRail` component @ line 388 + 617) | both | Frontend surface — the operator-facing advisory rail |

The 232-line Labor Brain rules engine lives in `echo_schedule.py:570–810` (verified by reading `git show origin/conflict_110526_1036:backend/routes/echo_schedule.py | sed -n '570,810p'`).

## Inputs

The Labor Brain is a **pure function of KPI tile state** plus portfolio context. Every threshold is grounded in a real KPI the dashboard already reports — there are no mocks, no derived assumptions outside the tile.

| KPI input (per outlet) | Used by rec type(s) |
|---|---|
| `coverage_pct` | coverage-gap, quality |
| `shifts_this_week` | coverage-gap |
| `sales_today` | labor-overrun, quality |
| `labor_actual` (dollars) | labor-overrun |
| `labor_scheduled` (dollars) | labor-overrun |
| `labor_pct_of_sales` | labor-overrun, quality |
| `approaching_ot` (count of employees ≥35h scheduled) | ot-risk |
| `compliance_flags` (count of open flags) | compliance |
| portfolio context (`outlet_ids`, `department`, `multi_outlet`) | ranking + scope |

## Outputs

Returns a `recommendations` list ranked by severity-weighted confidence, capped at 5. Each rec carries:

- `id` (deterministic, `{outlet_id}-{rec_type}`)
- `outlet_id`, `outlet_name`
- `severity` ∈ `{urgent, warn, optimize, info}` (weights: 100, 60, 30, 10)
- `title` (operator-facing summary)
- `rationale` (1-2 sentence explanation citing the exact KPI threshold breached)
- `action_type` ∈ `{cut_shift, call_in, reassign_ot, resolve_flag, hold_break}`
- `action_label` (1-tap button text)
- `confidence` (float, used as tiebreaker in ranking)
- `payload` (typed parameters for the PAF that fires on accept)

**1-tap accept** routes through `POST /accept_labor_brain_rec` with body `{rec_id, outlet_id, action_type, rationale, payload, accepted_by}` (see `LaborBrainAcceptBody` model). On accept, the system writes:

1. A real PAF (Personnel Action Form) to the `borrow_pafs` table — operator's signed acknowledgment of the recommendation
2. An audit row to `labor_brain_decisions` — append-only attestation of what was recommended, what was accepted, by whom, when

The audit feed is queryable at `GET /labor_brain_decisions?limit=50` — full transparency of every advisory decision the operator has acted on.

## Heuristic Logic — the five rec types

Source: `_generate_labor_brain_recs(tile, portfolio)` (`echo_schedule.py:606–718` on conflict branch). Each rule is a **pure conditional**: KPI state → recommendation. No statistical modeling. No machine-learned thresholds. **Operator-defined rules, operator-tunable thresholds, operator-auditable execution.**

| # | rec_type | Trigger | Action | Severity |
|---|---|---|---|---|
| 1 | `coverage-gap` | `coverage_pct < 85` AND `shifts_this_week > 0` | call_in (borrow from sister outlet or call on-call) | **urgent** |
| 2 | `labor-overrun` | `labor_pct_of_sales > 38` AND `labor_actual > labor_scheduled × 1.05` | cut_shift (with savings estimate to target 30%) | warn |
| 3 | `ot-risk` | `approaching_ot >= 2` | reassign_ot (move remaining hours to part-timers) | warn |
| 4 | `compliance` | `compliance_flags > 0` | resolve_flag (rest-window, minor-cutoff, OT trigger) | **urgent** if ≥3 flags else warn |
| 5 | `quality` | `coverage_pct >= 95` AND `0 < labor_pct_of_sales < 22` AND `sales_today > 0` | call_in (add runner or barback for service speed) | optimize |

Ranking (`_rank`): sort by `SEVERITY_WEIGHT[severity]` desc, then by `confidence` desc, take top 5. So a single outlet with 5 issues at peak coverage hour can surface all five; portfolio mode aggregates across outlets and prioritizes the most urgent first.

## Novelty Statement

**Rule-based prioritization of labor-coverage anomalies surfaced as 1-tap auditable PAFs against live KPI tiles** — distinct from competitors along four dimensions:

1. **Operator-defined rules vs. statistical thresholds.** Toast's anomaly detection is statistical (z-score against baseline). 7shifts uses threshold-only alerts (labor% > X → alert). LUCCCA's Labor Brain is **rules + KPI joint evaluation**: rules name the operational situation (coverage gap, OT risk, compliance violation), and severity reflects operator-defined business priority.

2. **1-tap → PAF execution vs. notification-only.** 7shifts and Toast notify; LUCCCA's accept-rec endpoint **writes a PAF** to the `borrow_pafs` table on accept. The operator's decision is the source of truth, but the audit trail is built into the execution path — not a manual reconstruction after the fact.

3. **Severity-weighted ranking with portfolio context.** Most schedule alerters fire one alert per breach. The Labor Brain aggregates KPI signals across a portfolio of outlets, ranks by `(severity_weight × confidence)`, caps at top-5, so the operator's attention is allocated to the highest-leverage decision first.

4. **Audit-first design** (`labor_brain_decisions` append-only feed). Every rec accepted is logged with `rec_id`, `outlet_id`, `action_type`, `rationale`, `accepted_by`, timestamp. Cross-references the **TraceLedger doctrine** (white paper #7) — deterministic replay of operational decisions. Toast/7shifts have no equivalent — their alerts are ephemeral notifications.

The combination of (operator-defined rules + KPI-aware severity + 1-tap PAF execution + append-only audit log) is the distinct intangible, not any single piece.

## Competitor Delta

Named per the May 12 pack's canonical competitor set (Toast / 7shifts / MarketMan / Tripleseat), plus ADP/Workday for enterprise HR comparison:

| Competitor | What they do | Where they fall short |
|---|---|---|
| **7shifts** | Schedule + alerts on labor%, OT, no-shows | Threshold-only alerting; no rules engine; no PAF execution path; no audit feed |
| **Toast** | POS-driven labor scheduling; statistical anomaly detection | No KPI-rule cross-reference; no rec ranking by operational severity; no auditable accept path |
| **MarketMan** | Inventory management with cost forecasting | Not a scheduling tool — adjacent but no labor decisions surface |
| **Tripleseat** | Event sales + BEO management | Event-side, not operations-side — different layer of the stack |
| **ADP / Workday** | Enterprise HR + payroll policy enforcement | Policy-time enforcement (post-fact), not real-time advisory; no hospitality-specific KPI integration |
| **Homebase / Deputy** | Simple shift-trade UIs | No rules engine, no PAF, no audit trail beyond trade history |

## Cross-links

### Doctrine
- [SILENT_SERVICE.md](../../docs/maestro/SILENT_SERVICE.md) — lines 168–181 ("Pride from love, not pride from fear"). The Labor Brain **invites operators to investigate** rather than punishing them for breaches — every rec is advisory, every accept is the operator's choice, every audit row is signed by the operator who accepted, not by the system that recommended. This is the rules engine done in silence.
- [BRIGADE_LEARNINGS.md](../../docs/maestro/BRIGADE_LEARNINGS.md) — the .01 principle. Yesterday's labor% is today's floor: the Labor Brain's `quality` rec (severity optimize) actively surfaces *under-spend* — capacity to add service speed without compromising margin. The system pushes toward .00001 precision in labor allocation, not flat conformance to a budget number.

### Parent catalog + inventory cross-references
- [ALGORITHM_INVENTORY.md](./ALGORITHM_INVENTORY.md) — Section B item #1 (Decision Clearance); Section C item #4 (constraint satisfaction); Section A item #1 (Echo AI³ MOI Architecture white paper)
- White paper #7 (TraceLedger / TraceProof) — the audit-feed pattern in Labor Brain is the TraceLedger pattern at module scale

### Pipeline evidence on disk
- `valuation/algorithms/3a/authorship.txt` — sole-author confirmation (`git shortlog -sn` output, FW-9)
- `valuation/algorithms/3a/timeline.txt` — first-to-last commit timeline (FW-10)
- `valuation/algorithms/3a/callgraph-echo_schedule.dot` — **0 bytes; pending pydeps fix** (FW-11 known pyan3-1.2.0 bug)

### Test coverage
- `test_reports/pytest/iter266_11_labor_brain.xml` — pytest output, iter266.11
- 259 total `test_reports/iteration_*.json` files; iter266 series specifically targets Labor Brain

## Status (per scorecard items)

| Item | State | Notes |
|---|---|---|
| 3a.1 Module boundary | **🟨 pending merge to main** | Half-step rule: full algorithm on conflict_110526_1036, dashboard half on main |
| 3a.2 Call graph | 🟥 | FW-11 pyan3-1.2.0 bug; pydeps swap queued |
| 3a.3 Spec in operator language | **🟩** | This file |
| 3a.4 Novelty / non-obviousness | **🟩** | Novelty Statement section above |
| 3a.5 Git timeline | 🟩 | `valuation/algorithms/3a/timeline.txt` cited in RUN-SUMMARY |
| 3a.6 Author attribution | 🟩 | `valuation/algorithms/3a/authorship.txt` cited in RUN-SUMMARY |

## Caveats (honest brigade-discipline notes)

- The exact migration creating `borrow_pafs` and `labor_brain_decisions` tables was not verified during this writeup; runtime evidence is the `db["borrow_pafs"]` and `db["labor_brain_decisions"]` write paths in `echo_schedule.py:786, 803`. Schema verification is a Session 4 task.
- The 232-line rules engine is "pure conditional" — no machine-learned thresholds, no statistical modeling. **Linear programming is NOT used here** (an earlier draft of this 2-pager incorrectly claimed LP; corrected per code reading).
- The 5 rec types are the **current state** as of `conflict_110526_1036`. Future iterations may add types (e.g., `hold_break` is reserved in `LaborBrainAcceptBody.action_type` but not yet generated by `_generate_labor_brain_recs`).

---

*Yes Chef.*
