# Echo AI³ — Source-of-Truth Brief (from William, iter202 kickoff)
**Received:** Feb 2026 iter202 · **Provenance:** `/Users/cami/.claude/projects/-Users-cami-Documents-Echo-Aurion-main/memory/project_echo_ai3_improvements.md`

> This brief references the **separate `Echo_Aurion-main` TypeScript/Postgres codebase**. Our current project lives at `/app` (Python/FastAPI/MongoDB). Where the patterns map, we adopt them faithfully. Where they don't (e.g., we use Mongo, not PG migrations), we preserve the spirit while keeping our stack.

## Hard rules (MUST preserve in every iter going forward)
1. **Human confirmation gate** — any action that creates a PO, pays a bill, or moves money MUST route through the `PendingActionBanner`-equivalent and wait for explicit "Yes" before action-executor runs. NEVER auto-execute money-moving actions.
2. **Anonymized cross-property learning** — network-intelligence shares benchmarks across orgs with zero org name, location, or PII.

## What's already in the Echo_Aurion-main repo (reference architecture)
- 3-layer reasoning chain (Guardian → Analyst → Synthesizer) replacing single GPT calls
- Live data eyes (queries real inventory / staffing / forecast / budget before every response)
- Persistent memory (`echo_memories`) + wisdom engine (`wisdom_rules`, 17 seeded)
- Proactive scheduler every 15 min from 6am–11pm, broadcasts over WebSocket
- Action executor with pending-actions store + human-gate UI
- Cross-property network intelligence (anonymized benchmarks)
- Labor cost predictor
- Outcome learning — insight `resolve` endpoint feeds back into wisdom engine
- Client-side event-bus (`client/lib/event-bus.ts` — 18 event types, inventory/purchasing/schedule/culinary/finance/AI)
- Security: Guardian wraps all AI endpoints · `req.user.org_id` never trusted from body · Aurum session fallback env-flagged
- UI: `zaro-guardian` panel key registered at `"critical"` priority

## How this maps to our `/app` codebase
| Echo_Aurion concept | Our equivalent (present or to build) |
|---|---|
| `server/services/echo-ai3/reasoning/reasoning-chain.ts` | We use `/api/echo/whats-new` + `/api/echo-agentic/*` with Claude Sonnet 4.5. Guardian/Analyst/Synthesizer pattern can be wrapped on top. |
| `memory-system.ts` (Postgres) | `timeline_events` collection + `echo_memories` (Mongo). Iter194 seeded the timeline spine. |
| `wisdom-engine.ts` + 17 rules | Not yet seeded — worth porting when we next touch Echo. |
| `proactive-scheduler.ts` every 15 min | We have APScheduler in `server.py`. Can add an `echo_proactive_scheduler` job. |
| `PendingActionBanner` + `action-executor` + `pending-actions-store` | iter196 built `echo_agentic.py` with Rung 3 reversibility window (1 hour undo on label regen). Extend with human-gate for PO/payment before execute. |
| `network-intelligence.ts` anonymized benchmarks | Iter195 built `Benchmark` UX contract — data layer still single-operator. |
| `labor-cost-predictor.ts` | We have overtime-forecast (`advanced_ops.py`) and shift planning — can be unified. |
| `event-bus.ts` client typed pub/sub | Currently using window `CustomEvent` for cross-module signalling. Upgrade when we unify calendar. |
| `zaro-guardian` panel | Exists in our `panel-registry.ts` → resolves to `@/modules/ZAROGuardian` ✅ |
| Migrations 008/009 | Our migrations live at `/app/backend/migrations/` via `run_migration.py` (Mongo). Add equivalents when each concept ships. |

## Rule for future work
Before scaffolding anything labelled "Echo AI³" / "agentic" / "memory" / "wisdom" / "proactive" / "network" / "action" — **grep first**, extend existing, never duplicate. Specifically check:
- `/app/backend/routes/echo_agentic.py`
- `/app/backend/routes/echo_whats_new.py` (or wherever `/api/echo/whats-new` lives)
- `/app/backend/lib/timeline*.py`
- `/app/client/modules/ZAROGuardian/`
- `/app/client/lib/` for event-bus equivalents

## Outstanding from this brief (queued, not yet in /app)
- Wisdom engine with seeded rules (17 from Echo_Aurion) → iter203+
- Proactive scheduler every 15 min with WebSocket broadcast → iter203+
- Human-gate banner for PO/payment actions → iter203+ (Rung 3 reversibility exists; need a visible banner)
- Typed client event-bus (replace ad-hoc CustomEvents) → iter203+
- Cross-property network intelligence data layer → P2 (awaiting multi-tenant path)
