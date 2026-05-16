# Financial Operations

> **Module path:** `client/modules/FinanceExplainability/` + `client/modules/FinancialOps/` + `backend/routes/echoaurium_pnl.py` + `backend/routes/payroll_engine_full.py` + `backend/routes/budget_engine.py` + `backend/echo/forensic.py`
> **Audience:** Controller, CFO, Bookkeeper, Property GM (subset)
> **Status:** Stable
> **Last updated:** 2026-05-07 (D63)

---

## In one sentence

The Financial module is where the controller proves the property
made (or lost) money — covering P&L, payroll, forensic 3-way match,
budget vs actual, and live COGS — with the audit chain back to the
source event for every number.

## Who uses it

  - **Controller** — daily; review forensic findings, approve
    invoices, run payroll
  - **CFO** — weekly + monthly; P&L, budget variance,
    cross-property roll-up
  - **Bookkeeper** — daily; invoice ingest, GL coding
  - **Property GM** — weekly; prime cost trend, top variance lines

## Top tasks (3-click flows)

| Task | Path | Click count | Voice intent |
|---|---|---|---|
| Run payroll for current period | Home → Payroll → Run | 3 | "run payroll for this period" |
| Approve invoice (3-way matched) | Notification → tap | 1 | "approve invoice {N}" |
| View today's COGS live | Home → Live COGS | 2 | "show me COGS today" |
| Drill from P&L line to source | Home → P&L → tap line | 3 | "explain {line item}" |
| Tip share what-if | Home → Tip share → simulate | 3 | "what if bussers got +0.1" |
| Resolve forensic finding | Auditor → tap → resolve | 3 | "resolve finding {N}" |
| Export month-end pack | Home → Reports → Month end | 3 | "export the month-end pack" |

All meet the §3-click rule.

## Key concepts

  - **Live COGS** — every confirmed commissary transfer fires a
    `cogs_event`; the P&L overlay reads them in real time so the
    chef knows current food cost % BEFORE month end (D19, D22).
  - **3-way match** — D30 forensic auditor pairs every Vendor
    Invoice with its Purchase Order and Receiver. Discrepancies
    become findings with the WHY (qty gap / price drift / item
    substitution / late delivery).
  - **Vendor fingerprint** — D30 per-vendor pattern over 90 days.
    Drift trend (improving / steady / worsening) tells the
    controller when to re-bid.
  - **Sub-recipe drift** — D30 walks the BOM tree to attribute
    recipe-level cost variance to the leaf ingredient that
    actually moved (e.g., mousse cake +14.9% because cocoa butter
    inside chocolate-glaze sub-recipe moved +25%).
  - **Prime cost** — COGS + labor; the top metric for hospitality
    operations health. Target: 55–65% of revenue.
  - **Tip share policy** — D49 configurable allocator (manager OR
    accounting can set); supports what-if simulator (zero-sum
    redistribution preview).
  - **Forecast self-audit** — D29 retrospective replays
    predictions against actuals; D41 stress harness exposes
    MAPE and hit rate per forecast.
  - **Chef divergence** — D42 + D51; when chef edits Echo's
    forecast-driven order, system compares chef vs Echo against
    actual sales (D42 distance method) AND against P&L impact
    over a 10-hour service window (D51 P&L method).

## Backend endpoints

### Payroll (D47)

| Method | Path | Audience |
|---|---|---|
| POST | `/api/payroll/run/{outlet_id}` | payroll admin |
| GET | `/api/payroll/runs/{run_id}` | operator |
| POST | `/api/payroll/runs/{run_id}/post` | payroll admin |
| POST | `/api/payroll/year-end/w2/{tax_year}` | payroll admin |
| GET | `/api/myecho/payroll/paystubs` | self (employee) |
| GET | `/api/myecho/payroll/w2/{tax_year}` | self |

### Forensic (D30)

| Method | Path | Audience |
|---|---|---|
| POST | `/api/echo/forensic/three-way-match/scan` | operator |
| GET | `/api/echo/forensic/vendor-fingerprint?vendor_id=` | operator |
| GET | `/api/echo/forensic/subrecipe-drift?recipe_id=` | operator |
| GET | `/api/echo/forensic/findings` | operator |
| POST | `/api/echo/forensic/findings/{id}/resolve` | operator |

### Live COGS + P&L (D19, D22)

| Method | Path | Audience |
|---|---|---|
| GET | `/api/echoaurium-pnl/{property_id}/{month}` | operator |
| GET | `/api/echoaurium-pnl/cogs/today/{outlet_id}` | operator |

### Tip share (D49)

| Method | Path | Audience |
|---|---|---|
| GET | `/api/tip-share/policy/{outlet_id}` | operator |
| PUT | `/api/tip-share/policy/{outlet_id}` | manager OR accounting |
| POST | `/api/tip-share/allocate/{outlet_id}` | operator |
| POST | `/api/tip-share/simulate/{outlet_id}` | operator |

### Forecast accuracy (D41 + D42 + D51)

| Method | Path | Audience |
|---|---|---|
| GET | `/api/echo/stress/accuracy-report` | operator |
| POST | `/api/echo/divergence/analyze/{outlet_id}` | operator |
| POST | `/api/echo/divergence-pnl/evaluate` | operator |
| GET | `/api/echo/divergence-pnl/summary/{outlet_id}` | operator |

### Invoice extractor (D54)

| Method | Path | Audience |
|---|---|---|
| POST | `/api/echo/invoice-extract/extract` | operator |
| GET | `/api/echo/invoice-extract/extractions` | operator |
| GET | `/api/echo/invoice-extract/vendors` | operator |

## Doctrine alignment

  - **§1.4 voice register**: payroll runs require pass_dev or
    payroll-admin audience; self-service paystub/W-2 endpoints
    scope per `x-user-id` (employee sees own only).
  - **§2.5 framing**: forensic findings describe observations
    ("invoice $0.30 over PO line, +6.7% drift") never
    accusations ("vendor is overcharging").
  - **§2.6 never throw the pan**: chef divergence summary surfaces
    chef-collective win rate; per-chef breakdowns are pass_dev
    only. Tip share allocations show by-role; per-employee
    breakdowns require operator audience for the reason that
    drove the role allocation.
  - **§3.1 append-only**: paystubs and W2s are write-once.
    Corrections create NEW rows linked to the prior via
    `prior_paystub_id`. The audit chain shows the correction
    was applied; the original is never overwritten.
  - **Tenet 8 forbidden persists, never surfaces**: Direct
    deposit account numbers are masked on every read
    (`****1234`); the full number is decrypt-on-use only by the
    bank ACH adapter at the point of submission.
  - **D27 tenant isolation**: every payroll / forensic / tip
    share read filters by `tenant_id`. D53.15 contract tests
    prove the boundary holds even when employee_id collides
    across tenants.

## Data this module reads / writes

| Collection | Notes |
|---|---|
| `payroll_runs` | One per pay period; locked after post |
| `paystubs` | Individual paystub per employee per run |
| `w2_records` | Year-end summary; idempotent on (year, employee) |
| `direct_deposits` | Account numbers stored encrypted; read-masked |
| `ach_batches` | Bank-submission record; D17 fuse-box seam |
| `tax_tables` | Per-year, per-jurisdiction; D59 OpenTaxSolver seed |
| `forensic_findings` | 3-way match + vendor fingerprint + sub-recipe drift |
| `vendor_fingerprints` | 90-day rolling per-vendor pattern |
| `cogs_events` | Append-only COGS source-of-truth |
| `invoice_extractions` | OCR'd invoice → structured fields (D54) |
| `tip_share_policies` | Versioned; superseded never deleted |
| `tip_share_allocations` | Per pay period |
| `order_divergences` | Chef-vs-Echo orders + analysis |
| `chef_pnl_evaluations` | D51 P&L impact per divergence |

## Integration points (D17 fuse-box seams)

  - `services/clients.py:submit_failover_order(...)` — POS API for
    D33 reconcile-on-recovery
  - `services/clients.py:get_bank_ach_client()` — bank ACH for
    D47 payroll batch submission (NACHA file format)
  - `services/clients.py:get_pos_client()` — POS sales import for
    forecast feedback + chef divergence
  - `services/clients.py:get_tax_table_provider()` — Symmetry /
    Vertex / open-data for tax table updates
  - `services/clients.py:get_ocr_client()` — server-side OCR
    fallback when on-device OCR isn't available

## Common operator questions

  · **"Why does my month-end P&L disagree with the live COGS?"** —
    The live COGS shows the in-flight cost as transfers are
    confirmed; month-end P&L is the closed-period number after
    all reconciliations. They reconcile at month-close. If they
    DISAGREE after month-close, that's a forensic finding —
    surface it via D30.
  · **"A vendor charged us a different price than the PO. What
    happens?"** — D30 3-way match fires a `price_drift` finding
    with severity scaled to the % drift. Controller decides:
    accept-as-market-move or call vendor for credit.
  · **"Can I undo a payroll post?"** — No. Posts are write-once.
    Corrections happen via a NEW reverse paystub linked to the
    original. The original survives the audit chain.
  · **"Why is the chef's number different from Echo's?"** — D42
    captures every chef edit. D51 evaluates the P&L impact of
    both chef and Echo's call against actual sales. The chef
    sees the side-by-side; controller sees the aggregate
    "chef intuition net win rate" (current synthetic data: 33%
    chef-right, 39% chef-wrong, 28% inconclusive — real
    properties trend higher chef-right because real chefs
    see things the model can't).

## Known limitations

  - **NACHA file format not yet implemented** — D47 generates
    `ach_batches` collection rows; the actual bank submission
    requires the NACHA-format adapter (one-file fuse-box seam,
    not yet wired)
  - **Tax tables for states beyond FL/CA/NY use 5% flat fallback**
    — per D59 OpenTaxSolver seed; replace with CPA-authored
    per-state tables before launching in those states
  - **Sub-recipe drift cycle guard at depth 8** — recipes nested
    deeper than 8 levels are not analyzed; queue for D30-followup
  - **Forecast stress harness uses synthetic data** — real
    accuracy on a customer's actual sales requires their POS
    history loaded; D41 supports this via `seed_sales` from any
    POS export

## Doctrine cross-references

  - ADR-0001 (Mongo as event store) — every COGS event, every
    invoice, every payroll line lives in the append-only chain
  - ADR-0003 (D17 fuse-box) — bank ACH, OCR, and POS adapters
    are pluggable seams
  - ADR-0004 (tenant isolation) — payroll never crosses tenants
    even when employee IDs collide
  - ADR-0005 (doctrine-as-contract) — chef divergence surface
    redacts chef_id at operator audience; pass_dev sees per-chef

## Changelog (this module)

  - 2026-05-07 · D63 · Initial module documentation written
  - 2026-05-07 · D54 · Invoice extractor calibrated on 91 real
    invoices; 71 vendor templates, 83% recognition, 93% invoice
    number capture
  - 2026-05-07 · D51 · Chef-call P&L review (alternative to D42
    distance method)
  - 2026-05-07 · D49 · Tip share + what-if simulator
  - 2026-05-07 · D47 · Full payroll engine + W-2 + ACH + employee
    self-service
  - Earlier · D42 chef order divergence, D41 forecast stress
    harness, D30 forensic Phase 1, D29 retrospective, D22 Chronos
    COGS tiles, D19 Aurium reads cogs_events
