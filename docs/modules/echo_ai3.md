# Echo AI³ — The Intelligence Layer

> **Module path:** `backend/echo/` + `client/modules/EchoAI3*/`
> **Audience:** Operator (most surfaces), pass_dev (retrospection + correlation), via the user-facing modules that consume Echo AI³
> **Status:** Stable; doctrine-load-bearing
> **Last updated:** 2026-05-07 (D63)

---

## In one sentence

Echo AI³ is the audit chain + retrospective replay + service auditor
+ cross-correlation engine that powers every "did the chef make the
right call?", "is the same vendor drifting across outlets?", "what
finding pattern preceded this complaint?" question — without ever
violating the privacy doctrine.

## Who uses it (indirectly)

Almost every other module. The doctrine framework is woven into:

  - Admin module → audit_log
  - Financial → forensic findings, cogs_events, chef divergence
  - Concierge → allergen cascade, resonance bend
  - MyEcho → activity drawer
  - Sous chef agent (D45) → intent → skill routing
  - Service auditors (D36) → labor / comps / engineering / FOH

## Top tasks (3-click flows)

| Task | Path | Click count | Voice intent |
|---|---|---|---|
| Sweep all auditors | Home → Auditor → Sweep | 3 | "run the audit" |
| View auditor findings | Home → Auditor | 2 | "show me findings" |
| Run correlation report | Home → Correlation | 2 | "show me patterns" |
| Open activity drawer | always-on tile | 1 | (drawer is ambient) |
| Dictate a recipe | Drawer → Voice → speak | 2 | direct voice |
| Ask "teach me X" | Drawer → Teach → speak | 2 | "teach me {topic}" |
| Resolve a finding | Auditor → tap → resolve | 3 | "resolve finding {N}" |

## Key concepts (the load-bearing ones)

  - **Event log** — D28; append-only `echo_events` collection.
    Every prediction, decision, action, outcome lands here.
    Read by D29 retrospective for replay; read by D38 for
    correlation. Never edited; corrections are new rows
    referencing prior_event_id.
  - **Voice register** — D28; every event has
    `voice_register ∈ {operator, staff, pass_dev, guest}`.
    The register decides who can read it. Operators see operator
    + staff registers; pass_dev sees all. Guest register is
    write-only (events about the guest, never readable by them).
  - **Tenet 8 forbidden persists, never surfaces** —
    `sensitivity ∈ {ordinary, sensitive_pii, sensitive_allergen,
    sensitive_health, sensitive_financial, forbidden}`.
    Forbidden-class events are written (audit trail intact)
    with `surfaceable=False` and `expires_at=now()`. They never
    appear in any read endpoint. Tenet §7 retention sweep
    tombstones them on schedule.
  - **Retrospective replay** — D29; perturbs decision_features
    at 5 multipliers (0.5×, 0.85×, 1.0×, 1.15×, 1.5×), finds
    best, writes findings to `retrospective_findings` queue.
    All endpoints require `audience=pass_dev` per §2.4 ("pride
    done where no one is watching").
  - **Service auditors** — D36; framework with `@register_auditor`
    decorator. Currently 4 auditors: labor (ghost shifts, OT
    spikes), comps (repeat-comper, high-value), engineering
    (repeat-asset, systemic-category), FOH ops (table-flip
    drift, server no-show). Each auditor emits to
    `service_audit_findings` + a D28 prediction event.
  - **Cross-correlation** — D38; co-occurrence (kind A and B
    within window with lift > 1.5), cascade (kind A consistently
    precedes kind B), cross-outlet (same finding signature
    across multiple outlets).
  - **Activity drawer** — D39; transparency surface where users
    see EVERY action Echo took on their behalf, with append-only
    chunks for streaming output.
  - **Sous chef agent** — D45; voice intent classifier routes to
    skills (beo_compile, popup_schedule, menu_proposal,
    peer_message). Skills always return DRAFTS; chef approves.

## Backend endpoints (subset; the heavy hitters)

| Method | Path | Audience |
|---|---|---|
| POST | `/api/echo/events` | append (any module) |
| GET | `/api/echo/events` | operator |
| POST | `/api/echo/retrospective/replay` | pass_dev |
| POST | `/api/echo/audit/sweep` | operator |
| GET | `/api/echo/audit/findings` | operator |
| POST | `/api/echo/audit/findings/{id}/resolve` | operator |
| GET | `/api/echo/correlation/report` | operator |
| POST | `/api/echo/activity/voice/recipe` | self (chef) |
| POST | `/api/echo/activity/teach` | self |
| POST | `/api/echo/sous-chef/intent` | self (chef) |

## Doctrine alignment

This IS the doctrine implementation layer. The doctrine doesn't
sit alongside Echo AI³; it IS Echo AI³.

  - **§1.1 transparency** → activity drawer (D39)
  - **§1.2 silent service** → resonance bend (D32);
    sous chef peer_message routing (D45);
    operator-audience strips of chef_id / actor_id (D36, D43, D51)
  - **§1.4 voice register** → enforced on every endpoint;
    contract tested by D53.15
  - **§2.4 retrospective practice** → D29 endpoints require
    pass_dev
  - **§2.5 pride from love** → all finding explanations are
    framed as observations
  - **§2.6 never throw the pan** → service auditors strip
    employee_id / server_id / chef_id at operator audience;
    pass_dev sees the row with the identifier
  - **§3.1 append-only** → D28 events.py never overwrites;
    corrections are new rows
  - **Tenet 8 forbidden persists, never surfaces** → forbidden
    sensitivity → surfaceable=False, expires_at=now,
    Tenet 7 retention sweep tombstones eventually

## Data this module reads / writes

| Collection | Notes |
|---|---|
| `echo_events` | The substrate. Append-only. Every other collection's actions land here. |
| `retrospective_findings` | D29 queue; drains overnight |
| `service_audit_findings` | D36 framework output |
| `forecast_replay_results` | D41 stress harness |
| `order_divergences` | D42 chef-vs-Echo |
| `chef_pnl_evaluations` | D51 P&L impact analysis |
| `concierge_alerts` | D32 allergen cascade |
| `complaint_events` | D43 |
| `echo_activity_tasks` | D39 drawer tasks |
| `echo_activity_chunks` | D39 streaming output |
| `recipe_drafts` | D39 voice + D40 scan |
| `audit_log` | App-level audit, distinct from echo_events |

## Integration points (D17 fuse-box seams)

  - `services/clients.py:get_llm_client()` — for sous chef intent
    classifier (regex fallback always works; LLM upgrade adds
    fuzzy intent matching)
  - `services/clients.py:get_ocr_client()` — for D40 mobile
    recipe scan + D54 invoice extraction (server-side fallback)

## Common operator questions

  · **"Why doesn't this finding show staff names?"** — §2.6
    "never throw the pan." Operator audience sees patterns by
    station/shift/dow. Per-individual breakdowns are pass_dev
    only and require an HR-flow gate.
  · **"How does Echo know that's a stockout vs over-production?"**
    — D41 stress harness simulates the 10-hour service window
    hour-by-hour with a realistic dinner-curve. A "close"
    forecast that exhausts inventory at hour 7 of 10 loses 3
    hours of sales — the simulation captures that asymmetry.
    D51 chef P&L review uses the same.
  · **"Why was a finding tombstoned?"** — Tenet §7 (decay)
    cron sweep. Per-collection retention windows live in
    `backend/jobs/data_retention.py`. Tombstones survive the
    audit chain; PII fields are scrubbed.
  · **"Can I delete a guest's record?"** — Yes, per Tenet §7
    + GDPR/CCPA rights. Submit via Admin → Users → Guest →
    Right-to-erasure. Tombstone fires immediately; the audit
    trail proves deletion happened.

## Known limitations

  - **Sous chef agent intent classifier is regex** — works for
    documented commands; fuzzy/multi-step intents need an LLM
    seam wired (D17 fuse-box ready, vendor not selected)
  - **Cross-correlation is computed at request time** — no
    materialized projections. At >1M events / tenant, the
    computation may need a cache layer (queued for D38-followup)
  - **Teach primers are built-in for 3 topics (P&L, Monte Carlo,
    prime cost)** — others fall through to a generic primer
    until the LLM seam is wired

## Doctrine cross-references

  - ADR-0001 (Mongo as event store) — `echo_events` is the
    canonical event log; ADR justifies why Mongo over Kafka or
    Postgres+jsonb
  - ADR-0003 (D17 fuse-box) — every Echo AI³ external dep is
    behind a factory function
  - ADR-0005 (doctrine-as-contract) — Echo AI³ IS the doctrine
    in code form

## Changelog (this module)

  - 2026-05-07 · D63 · Initial module documentation written
  - 2026-05-07 · D54 · Invoice extractor (calibrated on 91
    real invoices, 71 vendor templates)
  - 2026-05-07 · D51 · Chef P&L review
  - 2026-05-07 · D38 · Cross-correlation engine
  - 2026-05-07 · D45 · Personal sous chef voice agent
  - 2026-05-07 · D39 · Activity drawer (transparency)
  - 2026-05-07 · D36 · Service auditors framework
  - 2026-05-07 · D32 · Concierge intelligence (allergen cascade,
    resonance bend, spend trajectory, arrival calibration)
  - 2026-05-07 · D31 · EchoWaste intelligence
  - 2026-05-07 · D30 · Forensic accountant Phase 1
  - 2026-05-07 · D29 · Retrospective analyzer
  - 2026-05-07 · D28 · Echo AI³ event log substrate
