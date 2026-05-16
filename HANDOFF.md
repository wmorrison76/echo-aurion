# Handoff Document — for Claude Code (or any coding agent)

> **Read this first if you are an AI coding agent or a developer picking up this scaffolding.**

## What you are looking at

This is the complete scaffolding for the Echo Resonance Platform — an anticipatory hospitality system built on top of the LUCCCA Framework. There are approximately 200 files here, organized into four layers and three substrates. **No file is functionally implemented**; every file is a typed, headed stub. Your job is to implement them.

## Read these first, in this order

1. `README.md` — what is in the package
2. `ARCHITECTURE.md` — the navigational map
3. `PRIVACY_TENETS.md` — **non-negotiable** rules. Read before writing any code that touches guest data.
4. `BUILD_PHASES.md` — sequenced build plan over six phases
5. `INTEGRATION_MAP.md` — how this connects to the existing LUCCCA repo
6. `IMPLEMENTATION_ORDER.md` — **start here for what to build first**
7. `HANDOFF.md` — you are reading it

After that, every individual file has a structured header that tells you:
- **Layer** (which of 4 layers + 3 substrates)
- **Status** (SCAFFOLD | STUB | PARTIAL | IMPLEMENTED)
- **Phase** (1-6)
- **Purpose** (one sentence)
- **Depends on** (files this needs)
- **Consumed by** (files that need this)
- **Integrates with** (existing LUCCCA modules)
- **Pending** (the implementation checklist)
- **Definition of Done** (when can this file be marked IMPLEMENTED — newer files include this)

## Things only the human knows — ASK before you guess

The scaffolding is intentionally agnostic about your project's specific tooling. Before you start implementing, **ask the human these questions** (one at a time, in priority order):

### Priority 1 — Cannot start without these
1. **Migration framework**: Drizzle? Prisma? raw SQL with a custom runner? Something else? The migrations in `server/database/migrations/` (008-025, formerly under `migrations/echo_resonance/`) are written as raw SQL but need to be translated to your tool.
2. **Server router**: Express? Fastify? Hono? tRPC? The route files have placeholder `registerXRoutes(router: any)` signatures that need to match your router's API.
3. **Auth middleware**: How do staff JWTs and guest JWTs get verified? Where is the existing auth middleware located in the LUCCCA repo?
4. **Database client**: Where is the existing DB connection in the LUCCCA repo? Services should import that, not create their own.
5. **Test runner**: Jest? Vitest? Mocha? The test scaffolds use `describe/it.todo` syntax that works with all three but assertions need a chosen library.

### Priority 2 — Will affect early implementation
6. **Data-fetching library on client**: SWR? React Query? Custom? The `use-*` hooks in `client/lib/*/use-*.ts` need to wrap whatever pattern is already used in the LUCCCA client.
7. **Voice provider for Aurion (Phase 3)**: Default in master doc is OpenAI Realtime API. Confirm or override.
8. **Mapping library (Phase 2)**: MapLibre? Mapbox? Google Maps? Match what the existing LUCCCA repo uses.

### Priority 3 — Can be deferred to phase 5+
9. **Object storage for media (Phase 5)**: S3? Cloudinary? Cloud Storage? Where do hero loop videos live?
10. **Loyalty program integrations (Phase 5)**: Which programs need to be supported on day one?

### How to ask
For each question, say something like:
> "Before I implement `server/services/echo-ai3/resonance/resonance-engine.ts`, I need to know your migration framework. The scaffolding has SQL files but I don't know if you want me to translate them to Drizzle/Prisma/something else. Which is it?"

**Do not invent answers.** If you don't get a response, mark the question in your output and wait. Inventing a tooling choice is the most common way agents waste a developer's time.

## How to read a file header

Every file looks like this:

```typescript
/**
 * ===========================================================================
 * Resonance engine - core scoring and persistence
 * ===========================================================================
 * Layer:    Resonance
 * Status:   STUB
 * Phase:    1
 *
 * Purpose:  Receives readings, computes scores, persists, broadcasts updates.
 *
 * Depends on:
 *   - shared/types/resonance/reading.ts
 *   - shared/types/resonance/score.ts
 *
 * Pending implementation:
 *   - [ ] Implement createReading(): persist to DB, emit signal, update trajectory
 *   - [ ] Implement getRecentReadings(): paginated query
 *   - [ ] Implement scoreFromAffect(): wrap shared score logic
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * ===========================================================================
 */
```

When you implement a function:
1. Mark the corresponding `[ ]` as `[x]` in the header.
2. Update `Status` from STUB → PARTIAL → IMPLEMENTED as you progress.
3. Keep the header — it travels with the code.

## How to know when a file is "done"

For each file, "done" means:
1. Every item in **Pending implementation** is marked `[x]`.
2. The file's tests pass (look in `tests/echo_resonance/` mirroring the source path).
3. The file's contract (its types and signatures) hasn't been changed in ways that break consumers.
4. Any **Definition of Done** in the header is satisfied.

## Tenet enforcement — these are not optional

Every contributor must understand the eight tenets in `PRIVACY_TENETS.md`:

1. Capture by observation, not interrogation
2. Score persists, audio evaporates
3. Tone informs care, never commerce
4. Trust score is invisible
5. Guest controls are first-class
6. Staff transparency runs both ways
7. Sensitive flags decay aggressively
8. Forbidden uses (no pricing, no advertising, no third-party sharing, no discrimination, no model training outside the network)

When implementing, **if a feature requirement conflicts with a tenet, the tenet wins.** If you cannot reconcile, surface the conflict to the human; do not silently break the tenet.

## Testing strategy

The `tests/echo_resonance/privacy/` directory contains the **NON-NEGOTIABLE** tenet enforcement tests. Every commit to main should pass these. Examples:

- `forbidden-uses.test.ts` — verifies tone signals cannot reach pricing/marketing services (Tenet 3)
- `audio-decay.test.ts` — verifies 24-hour audio purge (Tenet 2)
- `trust-tenets.test.ts` — verifies trust score never reaches guest clients (Tenet 4)

These tests are scaffolded as `it.todo`. Implement them alongside the code they protect.

## Commit conventions

Suggest using conventional commits with a layer prefix:

- `feat(resonance): implement createReading`
- `feat(aurion): wire up speech-to-speech bridge`
- `test(privacy): add tenet 4 enforcement test`
- `chore(scaffold): update file header status`

## What to do if you find a problem with the scaffolding itself

The scaffolding is the design. If something is wrong with it:

- **A type contract is incoherent**: stop and surface it to the human. Type contracts in `shared/types/` are the API between every pair of files; changing them is a breaking change.
- **A file is missing**: add it, with a header in the same format, update `ARCHITECTURE.md` to reference it.
- **A file is unreferenced and you think it's safe to delete**: do not delete. Surface to the human and check `BUILD_PHASES.md` for what phase it activates. Disconnected scaffolding is intentional.
- **A privacy tenet seems impractical**: stop. Privacy tenets are non-negotiable. If a stakeholder pushes back, escalate to the founder.

## When you're done with a phase

Each phase has a "ship target" in `BUILD_PHASES.md`. When you believe a phase is complete:

1. Run the full test suite.
2. Verify the ship target works end-to-end with a real demo.
3. Update each implemented file's `Status` to IMPLEMENTED.
4. Update `BUILD_PHASES.md` checkboxes for the phase.
5. Tell the human the phase is ready for review.

## Final note

This scaffolding is the result of careful design over multiple conversations. The architecture, the integration points, the privacy spine, the eight tenets — all of these are deliberate. Read the master design document if it's available. When in doubt, the scaffolding is the source of truth and the tenets are the constitution.

Good luck. The system you're about to build does not exist yet in any form, anywhere in hospitality. Build it well.
