# Scaffold vs Master Document — Recon Report

> Reconciles current repo state against `Echo_Resonance_Platform_Master_Document.docx` v1.0 (May 2026).
>
> **Author:** Saucier station, Plate D execution.
> **Purpose:** show what exists, what's stubbed, what's implemented, and what's load-bearing for the Phase 1 demo.
> **Reading window:** when you wake up. The next saucier dispatch flows from this report.

---

## Headline

The scaffolding is **far more complete than I expected** when I started this audit. Migrations 008-025 are all present. Every layer (Resonance, Aurion, Voyage, Atrium) has services and route files in place as stubs. The work between TICKET_003 (done) and a demoable Phase 1 is route bodies + frontend implementations + the 10 intervention templates — not greenfield scaffolding.

**The one-liner:** the kitchen is mise-en-place. We're cooking now, not building the kitchen.

---

## Master doc §9.1 — schema tables

Master doc specifies 12 schema additions. All migrations already exist on disk:

| Migration | Master doc table | Status |
|---|---|---|
| 008_resonance_readings | resonance_readings | ✅ shipped (TICKET_001) |
| 009_resonance_trajectories | resonance_trajectories | ✅ shipped (TICKET_001) |
| 010_interventions_library | interventions_library | ✅ shipped (TICKET_001) |
| 011_interventions_executed | interventions_executed | ✅ shipped (TICKET_001) |
| 012_signals | signals graph | ✅ shipped (TICKET_001) |
| 013_voice_sessions | voice_transcripts | ✅ scaffold exists |
| 014_prosody_readings | (master doc implicit) | ✅ scaffold exists |
| 015_staff_whispers | (master doc implicit) | ✅ scaffold exists |
| 016_trips | trip metadata | ✅ scaffold exists |
| 017_trip_briefs | trip_briefs | ✅ scaffold exists |
| 018_trip_blocks | trip_blocks | ✅ scaffold exists |
| 019_corporate_blocks | (corporate lane §6.3) | ✅ scaffold exists |
| 020_venues | venue catalog | ✅ scaffold exists |
| 021_media_assets | venue_media_assets | ✅ scaffold exists |
| 022_service_credits | service_credits | ✅ scaffold exists |
| 023_trust_scores | trust_scores | ✅ scaffold exists |
| 024_cross_property_consent | (network §10.6) | ✅ scaffold exists |
| 025_training_corpus | (network §10.6) | ✅ scaffold exists |

**Coverage:** 18/12 (the master doc undercounts; 6 implicit tables are also captured). No missing migrations for any phase.

---

## Master doc §3.1 — four operating layers

### Layer 1 · Resonance (Phase 1 demo target)

| File | Status | Comment |
|---|---|---|
| `server/services/echo-ai3/resonance/resonance-engine.ts` | ✅ IMPLEMENTED (TICKET_003 #5) | createReading, getRecentReadings, scoreFromAffect; transactional; Tenet 2 fix shipped |
| `server/services/echo-ai3/resonance/trajectory-engine.ts` | ✅ IMPLEMENTED (TICKET_003 #6) | updateTrajectory, getFloorView, getTrajectory; pure helpers exposed |
| `server/services/echo-ai3/resonance/intervention-library.ts` | ✅ IMPLEMENTED (TICKET_003 #7 + fix-pack) | full state machine: propose → approve → execute → outcome (+ skip); running-mean successRate |
| `server/services/echo-ai3/resonance/resonance-fast.ts` | ⚠️ STUB | Echo-Fast (System 1) — Phase 3-ish; not blocking demo |
| `server/services/echo-ai3/resonance/forecast-engine.ts` | ⚠️ STUB | pre-arrival forecast — Phase 2 |
| `server/services/echo-ai3/resonance/cascade-bridge.ts` | ⚠️ STUB | bridge to existing department-notification-cascader — Phase 1.4-ish |
| `server/services/signals/signal-recorder.ts` | ✅ IMPLEMENTED | canonical write path, optional PoolClient for transactions |
| `server/services/signals/signal-query.ts` | ✅ IMPLEMENTED | three filtered query methods, expired-row defense in depth |
| `server/services/signals/signal-decay.ts` | ✅ IMPLEMENTED | purgeExpiredSignals; cron wiring deferred |
| `server/services/signals/_signal-row.ts` | ✅ IMPLEMENTED | shared row mapper |
| `client/lib/resonance/score.ts` | ✅ IMPLEMENTED | pure math; server re-exports for parity-by-construction |
| `client/lib/resonance/trajectory.ts` | ⚠️ STUB | client-side trajectory helpers (TBD shape) |
| `client/lib/resonance/api.ts` | ⚠️ STUB | client API wrapper for the routes we're about to build |
| `client/lib/resonance/use-resonance.ts` | ⚠️ STUB | React hook for whisper-and-poll |
| `client/components/resonance/WhisperWidget.tsx` | ⚠️ STUB | the floating tap-or-voice capture widget |
| `client/components/resonance/TrajectoryDashboard.tsx` | ⚠️ STUB | floor-view tile grid |
| `client/components/resonance/SparklineTile.tsx` | ⚠️ STUB | individual trajectory tile |
| `client/components/resonance/InterventionCard.tsx` | ⚠️ STUB | red-zone surfacing of candidate interventions |
| `client/components/resonance/SignalTrail.tsx` | ⚠️ STUB | per-guest signal history |

**Demo-critical gap:** route bodies + the five frontend components. ~10-15h of saucier work.

### Layer 2 · Aurion (Phase 3)

All stubs in place: `pre-arrival-orchestrator`, `in-room-orchestrator`, `whisper-engine`, `prosody-analyzer`, `session-manager`, `speech-to-speech-bridge`, `brief-composer`, `conversation-memory`. **NOT in Phase 1 demo scope.** Correctly stubbed.

### Layer 3 · Voyage (Phase 2)

All stubs in place: `trip-engine`, `brief-engine`, `plan-engine`, `map-engine`, `gap-finder`, `affinity-engine`, `suggestion-ranker`, `corporate-orchestrator`, `unconverted-ask-tracker`. **NOT in Phase 1 demo scope.** Correctly stubbed.

### Layer 4 · Atrium (Phase 5)

All stubs in place: `venue-engine`, `media-library`, `hero-selector`, `narrative-composer`, `marketing-pipeline`. **NOT in Phase 1 demo scope.** Correctly stubbed.

---

## Master doc §3.2 — three substrates

### Signal Graph

✅ Fully shipped: signal-recorder, signal-query, signal-decay, signals migration. Defense-in-depth via expired-row filters; Tenet 7/8 enforced; integration tests exist (DB-gated).

### Wisdom Engine

⚠️ Stubs in place: `server/services/echo-ai3/wisdom/{extended-wisdom, wisdom-engine, wisdom-loader, wisdom-matcher}`. These are the System 2 (Echo-Deep) per master doc §5.3. Not blocking Phase 1 demo (routine perception runs through resonance-engine; deep reasoning lights up Phase 2+).

### Trust & Privacy Spine

✅ partially shipped + ⚠️ partially stubbed:
- Tenet 2 (`expires_at` on every signal/reading) ✅
- Tenet 7 (sensitivity-driven decay) ✅
- Tenet 8 (forbidden = 0 retention) ✅
- Tenet 3 (commerce isolation) ✅ static-analysis test (3 bypasses closed)
- Tenet 5 (guest controls — review/pause/delete/export) ❌ route stubs in `server/routes/trust.ts`, marked Phase 3
- Trust score (§8.5, master doc) ❌ stub types in `shared/types/trust/`

**Demo implication:** privacy-tenet enforcement is real and provable (the test suite exercises it). Tenet 5 controls are NOT yet implemented; if EDF asks "what does delete-everything actually do?" today, the answer is "the architecture is built for it; the route bodies are Phase 3 work."

---

## HTTP route surface — the actual demo blocker

Every route file exists as a stub. None are wired into `server/index.ts`. All currently throw `Not implemented (Phase 1)` if called.

| Route file | Status | Phase | Demo-blocking? |
|---|---|---|---|
| `server/routes/resonance.ts` | STUB | 1 | **yes** — needs implementation NOW |
| `server/routes/signals.ts` | STUB | 1 | **yes** — needs implementation NOW |
| `server/routes/voyage.ts` | STUB | 2 | no |
| `server/routes/aurion.ts` | STUB | 3 | no |
| `server/routes/atrium.ts` | STUB | 5 | no |
| `server/routes/trust.ts` | STUB | 3 | EDF-question risk |

**The Plate D plan:** implement `resonance.ts` + `signals.ts` route bodies, mount them in `server/index.ts`, ship route tests. Everything else stays correctly stubbed.

---

## Frontend surface — Phase 1.5 work

| File | Status | Demo-blocking? |
|---|---|---|
| `client/components/resonance/WhisperWidget.tsx` | STUB | yes |
| `client/components/resonance/TrajectoryDashboard.tsx` | STUB | yes |
| `client/components/resonance/SparklineTile.tsx` | STUB | yes |
| `client/components/resonance/InterventionCard.tsx` | STUB | partial (only if demo includes red-zone moment) |
| `client/components/resonance/SignalTrail.tsx` | STUB | no (drill-down view, nice-to-have) |
| `client/lib/resonance/api.ts` | STUB | yes (frontend API client wrapper) |
| `client/lib/resonance/use-resonance.ts` | STUB | yes (React hook for live updates) |
| `client/lib/resonance/trajectory.ts` | STUB | maybe (depends on TrajectoryDashboard impl) |

**The Phase 1.5 plate:** implement the five components + two libs against the Phase 1.4 routes. Out of Plate D scope; requires William in the room for UI/UX register decisions per Silent Service Principle §5.2.2.

---

## Operator wisdom — only William can write these

| Asset | Status | Demo impact |
|---|---|---|
| 10 intervention templates (Master doc §10.2 says 20; BUILD_STATE-2 settled on 10) | ❌ not written | **Without these the dashboard is empty when a tile bends red.** Backend works perfectly against zero rows. |

This is flagged for the third time in this brigade's history. It is a chef's task. No saucier work makes the demo believable until these exist.

---

## Drift from master doc — items worth flagging

1. **Reading TTL was 24h, now 30d.** Master doc §8.1 doesn't pin a number for resonance readings; the doc says "retained while relationship is active." 30d aligns with `RETENTION_DAYS['emotional']` and matches the corresponding signal's lifetime. Documented in fix-pack `5e2f2d148`.

2. **Intervention lifecycle adds `recordSkip`.** Master doc §4.4 names "proposed → approved → executed → outcome." The DB enum includes `skipped`; my implementation adds `recordSkip` (proposed | approved → skipped) so an operator can opt out without polluting successRate. Extends the spec; doesn't violate it.

3. **System 1 / System 2 not split.** Master doc §5.3 prescribes Echo-Fast (on-device, sub-second) + Echo-Deep (server-side LLM). Current `resonance-engine` is single-tier. Acceptable for Phase 1 GM dashboard (human-cadence reads); critical for Phase 3 (Aurion 200ms latency budget).

4. **Score parity by re-export, not by duplicate code.** Master doc doesn't prescribe an implementation; my choice was to have server `scoreFromAffect` re-export from the client lib. Single source, parity by construction. Validated by 9-sample grid in smoke v1.

5. **Tenet 3 isolation is broader than spec.** Master doc §8.2 lists five forbidden uses (pricing, advertising, profiling, discrimination, network exfiltration). My static-analysis test blocks ALL imports of `shared/types/{resonance,signals}/` from any commerce module. Stricter than the doc, intentional, defensible.

---

## What "finish the build" actually decomposes into

Honest sequencing for the 13-day demo:

1. **Plate D (TONIGHT, ~3-5h):** TICKET_004 routes. Resonance + signals. Mount, test, push.
2. **Phase B (THIS WEEK, William-led):** integration credentials audit per BUILD_STATE-2.
3. **Phase 1.5 (NEXT, ~10-15h saucier with William in room):** five frontend components + two client libs.
4. **William's task (60-90 min, blocker for demo believability):** 10 intervention templates.
5. **Demo prep (Day 12):** Phase E storyline + dry run.

Phase 2-6 of master doc are post-demo work and are correctly scaffolded for that future.

---

## What I'm NOT doing in Plate D

- **NOT** filling Phase 2-5 service stubs. They exist correctly. Premature implementation = bit rot.
- **NOT** building frontend. Requires William in the room.
- **NOT** writing intervention templates. Operator wisdom; only William.
- **NOT** wiring trust.ts (Phase 3 routes). EDF question is a verbal answer for now.
- **NOT** implementing resonance-fast / forecast-engine / cascade-bridge. Phase 2-3 work.

---

*Yes Chef. Mise-en-place verified. Routes next.*
