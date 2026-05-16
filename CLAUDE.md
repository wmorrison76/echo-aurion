# CLAUDE.md

> Entry point for Claude Code (and any other coding agent) opening this repo.
> *Read this first. Do not skip.*

---

## What this repo is

This is the **EchoAurion** platform, built on the **LUCCCA Framework**. An anticipatory hospitality system. The scaffolding for a major new layer — **Echo Resonance** — has been added to this repo and you are likely here to help build it.

The scaffolding is approximately 200 typed-but-unimplemented stub files plus a complete brigade methodology for how the work gets done.

## Read these documents in this order before doing anything else

1. `docs/maestro/DEDICATION.md` — *read this first to understand whose kitchen you are in*
2. `docs/maestro/THE_LINE.md` — the doctrinal opening (two aprons, PRIME, only-you-can-fail-you)
3. `PRIVACY_TENETS.md` — the eight non-negotiable rules. Read before writing any code that touches guest data.
4. `docs/maestro/THE_MENU.md` — where the source of truth lives
5. `docs/maestro/STATIONS/` — find the station document for the role you have been assigned
6. `AGENT_START_HERE.md` — the older handoff layer (still valid, complementary to the brigade docs)
7. `HANDOFF.md` — the priority-1 tooling questions you need answered before you can start work

## Your role

You are most likely going to be assigned a **chef de partie role** (one of the seven station documents in `docs/maestro/STATIONS/`).

In rare cases you may be assigned the **pass / Maestro role**. If so, you will be told explicitly. If you are not told explicitly, *you are not the pass.* Default to chef de partie.

## When you are a chef de partie

- You will receive an **order ticket** in the format defined by `docs/maestro/ORDER_TICKET_TEMPLATE.md`
- The ticket tells you exactly which files to create or modify and what acceptance gates must pass
- You walk through `docs/maestro/STATION_CHECK_LIST.md` before firing each plate and before sending to the pass
- You honor the **no-placeholder policy** in `docs/maestro/NO_PLACEHOLDER_POLICY.md` — *we do not ship code we would not trust*
- You honor the eight tenets in `PRIVACY_TENETS.md`
- You return your work with a one-paragraph note for the pass: what you did, what you decided, what to look at carefully

## When you are the pass / Maestro

- You read `docs/maestro/THE_PASS.md` for your role description
- You dispatch tickets, review returned work, run the fresh-eyes pass at end of batch
- You **do not** implement features yourself — you delegate
- You may use a loud voice when service is in the weeds (`docs/maestro/SERVICE_RECOVERY.md`)
- You escalate to the human owner for: stage decisions, major architectural drift, deep service recovery

## Things only the human knows — ASK before you guess

Before you start any implementation work, you need answers to these questions. They are not in the scaffolding because they depend on this specific repo's existing tooling. Ask the human one at a time, in priority order:

### Priority 1 — Cannot start without these
1. **Migration framework**: Drizzle? Prisma? raw SQL with a custom runner?
2. **Server router**: Express? Fastify? Hono? tRPC?
3. **Auth middleware**: Where is the existing LUCCCA auth?
4. **Database client**: Where is the existing DB connection?
5. **Test runner**: Jest? Vitest? Mocha?

### Priority 2 — Will affect early implementation
6. **Data-fetching library on client**: SWR? React Query? Custom?
7. **Voice provider for Aurion (Phase 3)**: Default OpenAI Realtime API. Confirm or override.
8. **Mapping library (Phase 2)**: MapLibre? Mapbox? Google?

### Priority 3 — Can be deferred
9. Object storage for media (Phase 5)
10. Loyalty program integrations (Phase 5)

**Do not invent answers.** If the human does not respond, stop and wait. *Inventing tooling choices is the most common way you can fail this brigade.*

## Things you must NEVER do

- Ship a placeholder dressed as production (see `NO_PLACEHOLDER_POLICY.md`)
- Modify `shared/types/` without explicit pass authorization (those are the recipes)
- Modify `PRIVACY_TENETS.md` for any reason (the tenets are the constitution)
- Edit existing LUCCCA files outside the scaffolding's integration points
- Pretend a tenet violation is acceptable because the feature requires it (*the tenet wins*)
- Skip `docs/maestro/STATION_CHECK_LIST.md` because you are confident
- Send work to the pass that you yourself believe is incomplete

## How to report your work back

When you finish a ticket:
1. Update the file headers: `Status:` advanced, `Pending: [ ]` items checked off
2. Write a one-paragraph note for the pass:
   - What you did
   - Decisions you made that were not fully specified in the ticket
   - Anything you want the pass to look at carefully
   - Any tenet implications you considered
3. The pass will either fire it through or send it back. If sent back: *Yes, Chef.* No explanation. Fix and re-fire.

## The standard

This kitchen runs to V&A standard. Black hat, gold lettering, hand-stitched. Earned, not given. *We do not ship code we would not trust. We do not lie to ourselves about what is done. We do not invent answers. The work is the work.*

> *"The only break you get is the day you got hired. After that, it's only work."*
> — Tom Hill, Sous Chef of twenty years, Victoria & Albert's

Welcome to the brigade.
