# The Order Ticket

> The dispatch format. *The order ticket is not a project specification. It is the chef calling out the next dish.*

## Format

```
TICKET #<id>
Station: <station name>
Mission: <one sentence — what is being made>
Recipe: <link to the file headers / type contracts being implemented>

Plates to fire (files):
  - <path/to/file.ts>
  - <path/to/file.ts>

Mise en place (must already exist before firing):
  - <dependency file 1>
  - <dependency file 2>

Tasting notes (must pass before sending to pass):
  - [ ] Type check passes
  - [ ] Tests pass
  - [ ] Self-audit complete (see STATION_CHECK_LIST.md)
  - [ ] Tenets reviewed (especially: <relevant tenet numbers>)

Send-back conditions (the pass will return the plate if):
  - <specific failure condition 1>
  - <specific failure condition 2>

Fire by: <deadline>
```

## How to read it

Like a kitchen ticket. Short. Crisp. Unambiguous. The chef de partie at the station reads the ticket, walks through the station check list, fires the plate, tastes it, sends it to the pass.

The ticket is **not a brief**. It is not a place for the executive to explain the strategy or the rationale. The chef de partie already knows the menu — they read it before tying their apron. The ticket says *what is being made now*. The reasoning lives in `THE_MENU.md` and the file headers.

## What goes on a ticket and what does not

**On the ticket:**
- The station (so the chef knows it is for them)
- The mission in one sentence
- The exact files to be created or modified
- The dependencies that must already exist
- The acceptance gates the chef must pass before sending to the pass
- The deadline

**Not on the ticket:**
- Long explanations of why this work matters (that is the menu)
- Implementation hints (the chef knows their station)
- Code samples (the file headers and type contracts are the spec)
- Negotiation language ("if you have time, would you mind...")

## Sample ticket

```
TICKET #007
Station: Saucier
Mission: Translate migrations 0001-0005 from raw SQL to Drizzle, with rollback paths.
Recipe: server/database/migrations/008_resonance_readings.sql through 012_signals.sql

Plates to fire (files):
  - server/database/migrations/008_resonance_readings.ts (Drizzle)
  - server/database/migrations/009_resonance_trajectories.ts
  - server/database/migrations/010_interventions_library.ts
  - server/database/migrations/011_interventions_executed.ts
  - server/database/migrations/012_signals.ts

Mise en place:
  - shared/types/resonance/* (already complete)
  - shared/types/signals/* (already complete)
  - Drizzle config in existing LUCCCA repo (confirmed with pass)

Tasting notes:
  - [ ] All five migrations apply cleanly to empty database
  - [ ] All five migrations apply cleanly on top of existing LUCCCA schema (no collisions)
  - [ ] All five migrations roll back cleanly with no orphan data
  - [ ] Indexes from the SQL versions preserved
  - [ ] Foreign key constraints preserved
  - [ ] Tenet 7 retention timestamps present on all sensitive tables

Send-back conditions:
  - Any migration that does not roll back cleanly
  - Any migration that modifies an existing LUCCCA column
  - Any missing index
  - Any drift from the SQL version that the pass did not approve

Fire by: end of shift Tuesday
```

That is a complete ticket. Forty lines including the header. The saucier reads it, gets to work, and the pass knows exactly what to expect back.

---

> *"A ticket is not a conversation. It is the chef calling out the next dish."*
