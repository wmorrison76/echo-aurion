<!-- Per-algorithm 2-pager. Parent catalog: ALGORITHM_INVENTORY.md. SCORECARD ref: Section 3d. -->

# 3d — Echo AI³ / Guardian / Prophet Orchestration

## Files

| Path | LoC | Branch | Role |
|---|---|---|---|
| `backend/routes/echoai3_ripple.py` | 358 | main + conflict | Cross-system action ripple — propagates labor/menu/inventory consequences |
| `backend/routes/echoai3_roi.py` | 181 | main + conflict | ROI computation for proposed actions (manual-mins vs echo-mins) |
| `server/routes/echo-ai3-chat.ts`, `echo-ai3-forecast.ts`, `echo-ai3-actions.ts`, `echo-ai3-recipe-chain.ts`, `echo-ai3-daily-digest.ts`, `echo-ai3-bmb-proxy.ts` | (multiple) | main | Echo AI³ TS service surfaces (9 routes) |
| `server/lib/echo-resonance-metrics.ts` + `server/routes/resonance.ts` + `server/routes/echo-resonance-health.ts` | — | main | Echo Resonance signal layer (Phase 1.3 backend) |
| `client/components/echo/` + 216 `client/modules/*/index.tsx` | — | both | Frontend orchestration surface across every dashboard |
| `backend/tamper_audit.py` (Guardian) | 230 | main | Append-only audit chain (`verify_chain`, `log_entry`, `compliance_report`) |

## Echo AI³ Architecture Map (single-source-of-truth, fulfills 3d.1)

```
                    ┌────────────────────────────────────────────────┐
                    │             OPERATOR (single human)             │
                    └──────────────────────┬─────────────────────────┘
                                           │ "Yes" confirmation gate
                                           │ (per ECHO_AI3_BRIEF Hard Rule #1)
                                           ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │                         ECHO AI³ ORCHESTRATOR                     │
        │                                                                   │
        │  ECHO  (Empathy)     STRATUS  (Intelligence)    ARGUS (Protection)│
        │  guest signal +      forecasting +              recovery + audit  │
        │  resonance           orchestration              integrity         │
        └──┬────────────────────────┬───────────────────────────┬───────────┘
           │                        │                            │
           ▼                        ▼                            ▼
    ┌──────────────┐        ┌──────────────────┐        ┌──────────────────┐
    │ Echo         │        │ Prophet          │        │ Guardian         │
    │ Resonance    │        │ (forecasting +   │        │ (tamper_audit +  │
    │ (signal      │        │  self-calibration│        │  append-only     │
    │  recorder +  │        │  loop — the .01  │        │  chain — the     │
    │  decay)      │        │  principle in    │        │  TraceLedger     │
    │              │        │  software)       │        │  pattern)        │
    └──────┬───────┘        └────────┬─────────┘        └────────┬─────────┘
           │                          │                            │
           │  Signal events           │  Forecasts +               │  Audit rows
           │  (guest experience       │  recommendations +         │  (every accepted
           │   variance, prosody,     │  ROI computations          │   action signed)
           │   sentiment)             │                            │
           ▼                          ▼                            ▼
    ┌──────────────────────────────────────────────────────────────────────┐
    │                       9 OPERATIONAL SURFACES                         │
    │                                                                       │
    │  1. Labor         (3a Decision Clearance)                            │
    │  2. Forecast      (3c Yield-Aware Costing — Monte Carlo)             │
    │  3. Schedule      (Schedule Unified — proposed-vs-actual)            │
    │  4. BEO / Events  (Maestro BQT)                                      │
    │  5. Commissary    (cross-property ordering + COGS)                   │
    │  6. Finance       (Aurum + InvoiceBrain Forensic Accountant)         │
    │  7. Guest         (Resonance + concierge + VIP Pre-Check)            │
    │  8. Layout        (Echo Layout digital twin)                         │
    │  9. Network       (Network Intelligence — cross-property benchmarks) │
    └──────────────────────────────────────────────────────────────────────┘
                                           ▲
                                           │ ripple effects propagate via
                                           │ echoai3_ripple.py
                                           │
                                           ▼
                          ┌─────────────────────────────────┐
                          │       Recommendation back       │
                          │       to operator with audit    │
                          │       trail + ROI estimate      │
                          │       (manual-mins vs echo-mins)│
                          └─────────────────────────────────┘
```

The Power-of-Three (white paper #8) framing: **Echo** = empathy layer (guest signals, resonance), **Stratus** = intelligence layer (forecasting, recommendation orchestration), **Argus** = protection layer (tamper audit, recovery framework). All three converge in Echo AI³ as the operator-facing orchestrator.

## Inputs

- Guest signals (Echo Resonance: voice prosody, sentiment, hesitation patterns)
- Forecasts (Prophet: revenue, labor, inventory consumption)
- Operational state (current schedules, current BEOs, current inventory, current AP)
- Operator confirmations (the "Yes" gate before any money-moving action)
- Historical outcomes (resolved insights feed back into wisdom_rules + scheduler)

## Outputs

- **Ranked operational recommendations** across the 9 surfaces, each with severity + confidence + ROI estimate
- **PAFs / orders / actions** — only after operator explicit confirmation
- **Audit trail** in `tamper_audit` (verifiable chain via `verify_chain`)
- **ROI report** showing manual-mins-saved per accepted recommendation (`echoai3_roi.py` — pto_conflict_check saves 14.8 manual minutes per BEO, etc.)
- **Network-percentile context** — every metric surfaced with cross-property anonymized benchmark

## Heuristic Logic — the 3-layer reasoning chain (per ECHO_AI3_BRIEF)

1. **Guardian (input gate)** — every AI endpoint is wrapped by Guardian: `req.user.org_id` never trusted from body; Aurum session fallback env-flagged; all action proposals validated against org-tenant boundary
2. **Analyst (reasoning)** — 3-layer reasoning chain replaces single-GPT calls. Layer 1 queries live data (inventory / staffing / forecast / budget). Layer 2 cross-references wisdom_rules (17 seeded heuristics). Layer 3 synthesizes recommendation with provenance.
3. **Synthesizer (output)** — actions are proposed as `PendingActionBanner`-equivalent items; operator confirms each individually; action_executor fires only on explicit "Yes"

**Hard Rule #1 (immutable):** "any action that creates a PO, pays a bill, or moves money MUST route through the PendingActionBanner-equivalent and wait for explicit 'Yes' before action-executor runs. NEVER auto-execute money-moving actions."

**Hard Rule #2 (immutable):** "Anonymized cross-property learning — network-intelligence shares benchmarks across orgs with zero org name, location, or PII."

These hard rules are operator-mandated and codified in `memory/ECHO_AI3_BRIEF.md`. They define the orchestrator's behavior at the most fundamental level.

## Novelty Statement

**Pattern-recognition + recommendation orchestration across hospitality verticals with persistent audit trail (Guardian) and forecast self-calibration (Prophet's feedback loop)** — distinct from competitors along five dimensions:

1. **Cross-vertical reasoning** — labor + costing + inventory + VIP + BEO + Network Intelligence simultaneously, not in isolation. **No competitor pairs all five.**

2. **Hard-rule confirmation gate** — Hard Rule #1 hard-codes the operator-confirmation gate. No money moves without explicit "Yes." Distinct from AI agents that auto-execute (CrewAI, AutoGen patterns, etc.).

3. **Append-only Guardian audit** — `tamper_audit.verify_chain` provides cryptographic verification of decision history. Cross-link to white paper #7 (TraceLedger / TraceProof). Every accepted recommendation is signed, dated, and recoverable.

4. **Prophet self-calibration loop** — the .01 principle in software. Every forecast is retrospected (per [SILENT_SERVICE.md:154-166](../../docs/maestro/SILENT_SERVICE.md) Monte Carlo retrospective); insights resolve and feed back into wisdom_rules; tomorrow's forecast learns from yesterday's variance.

5. **Operator-direct doctrine, not LLM-derived** — 17 seeded wisdom_rules represent 35 years of hospitality operating discipline distilled into rule-based heuristics. Not "trained on hospitality data" — **authored by a 35-year hospitality operator**. This is the rare AI-system whose domain knowledge is operator-direct.

## Competitor Delta

| Competitor | What they do | Where 3d differs |
|---|---|---|
| **CrewAI / AutoGen / LangGraph (frameworks)** | Multi-agent orchestration patterns | Frameworks, not hospitality OS; no hard confirmation gate; no domain doctrine |
| **Presto / Bbot (hospitality AI startups)** | Specific applications (voice ordering, drive-thru) | Single-application AI; no cross-vertical orchestration; no audit-first design |
| **Toast / 7shifts / MarketMan / R365** | Function-specific tools | None of them have an AI orchestration layer crossing modules; LUCCCA is the layer they should plug into |
| **Avero** | Restaurant analytics | Dashboard-out; no agentic orchestration |
| **OpenAI / Anthropic API directly** | Foundation models | Models without operational scaffolding; LUCCCA's value is the scaffolding (rules + gates + audit + ROI) |

## Cross-links

### Doctrine (most load-bearing for 3d)
- [`memory/ECHO_AI3_BRIEF.md`](../../memory/ECHO_AI3_BRIEF.md) — **the source-of-truth brief**; Hard Rule #1 + Hard Rule #2; 17 wisdom_rules; 3-layer reasoning chain
- [BRIGADE_LEARNINGS.md](../../docs/maestro/BRIGADE_LEARNINGS.md) — **the .01 principle** anchors Prophet's self-calibration loop
- [SILENT_SERVICE.md:63, 89](../../docs/maestro/SILENT_SERVICE.md) — **beneath the waterline** — Echo AI³ acts without announcing itself; Guardian audit trail credits the operator and the staff, not the system

### Parent catalog
- [ALGORITHM_INVENTORY.md](./ALGORITHM_INVENTORY.md) — Section A items #1, #2, #6, #8 (the 4 Echo AI³ / LUCCCA OS white papers); Section B.1 item #4; Section C items #5 (heuristic search), #7 (Bayesian updating / signal decay), #9 (stochastic decision processes)

### Pipeline evidence on disk
- `valuation/algorithms/3d/authorship.txt`
- `valuation/algorithms/3d/timeline.txt`
- `valuation/algorithms/3d/callgraph-echoai3_ripple.dot`
- `valuation/algorithms/3d/callgraph-echoai3_roi.dot`

## Status

| Item | State |
|---|---|
| 3d.1 Module boundary + single architecture map | 🟩 (this file includes the architecture map; surface modules on main; full orchestrator distributed across the 9 surfaces) |
| 3d.2 Call graph | 🟩 |
| 3d.3 Spec | 🟩 (this file + ECHO_AI3_BRIEF) |
| 3d.4 Novelty | 🟩 (Novelty Statement above) |
| 3d.5 Git timeline | 🟩 |
| 3d.6 Author attribution | 🟩 |

---

*Yes Chef.*
