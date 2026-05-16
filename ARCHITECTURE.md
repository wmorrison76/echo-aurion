# Echo Resonance Platform - Architecture Map

> **Read this first.** This document is the navigational entry point for the entire scaffolding.

## What this is

This is the complete file-and-directory scaffolding for the Echo Resonance Platform - the four-layer anticipatory hospitality system described in the master design document. **No file in this scaffolding is fully implemented**; every file is a typed, commented stub that explains what it will become and what it depends on.

The structure mirrors how these files will eventually merge into the existing LUCCCA Framework repo. Each path you see here should be reproduced verbatim in your repo when ready to integrate.

## Directory tree

```
echo-resonance-platform/
|-- ARCHITECTURE.md              <- you are here
|-- BUILD_PHASES.md              <- what gets built when
|-- INTEGRATION_MAP.md           <- how this connects to existing LUCCCA modules
|-- PRIVACY_TENETS.md            <- non-negotiable trust constraints
|
|-- shared/types/                <- TypeScript types, shared by client & server
|   |-- resonance/               <- Layer 1: emotional intelligence
|   |-- aurion/                  <- Layer 2: voice & conversation
|   |-- voyage/                  <- Layer 3: trip companion
|   |-- atrium/                  <- Layer 4: marketing-concierge bridge
|   |-- trust/                   <- Substrate: trust & privacy
|   |-- signals/                 <- Substrate: unified signal graph
|   \-- wisdom/                  <- Substrate: wisdom engine
|
|-- server/
|   |-- services/echo-ai3/
|   |   |-- resonance/           <- Layer 1 backend
|   |   |-- aurion/              <- Layer 2 backend (Pack 2)
|   |   |-- voyage/              <- Layer 3 backend (Pack 2)
|   |   |-- atrium/              <- Layer 4 backend (Pack 3)
|   |   \-- orchestrator/        <- Echo-Fast / Echo-Deep handshake
|   |-- services/trust/          <- Trust score, fraud, credits
|   |-- services/signals/        <- Signal graph writer & query
|   \-- routes/                  <- HTTP endpoints
|
|-- client/
|   |-- modules/
|   |   |-- EchoResonance/       <- Staff & GM trajectory dashboard
|   |   |-- EchoAurion/          <- Voice surfaces (Pack 2)
|   |   |-- EchoVoyage/          <- Trip Brief, Living Plan, Map (Pack 2)
|   |   \-- EchoAtrium/          <- Venue pages with mood-tagged video (Pack 3)
|   |-- components/
|   |   |-- resonance/           <- Whisper widget, sparkline tile
|   |   |-- aurion/              <- Voice button, transcript view
|   |   |-- voyage/              <- Plan timeline, map pin, brief card
|   |   |-- atrium/              <- Hero loop, action band
|   |   \-- trust/               <- "What do you remember about me" surface
|   \-- lib/
|       |-- resonance/           <- Score math, trajectory math
|       |-- aurion/              <- Speech-to-speech client
|       |-- voyage/              <- Plan editor logic
|       \-- atrium/              <- Video selector, mood matcher
|
|-- server/database/migrations/  <- Echo Resonance schema additions (008-025) live alongside LUCCCA 001-007
\-- tests/echo_resonance/        <- Mirror of the source tree
```

## The four layers

### Layer 1 - Resonance
The emotional-intelligence backbone. Scores every guest's affective state. Tracks the trajectory of each visit. Surfaces interventions to staff. **Phase 1 starts here.**

### Layer 2 - Aurion
The voice and conversational interface. Speech-to-speech architecture for sub-300ms latency.

### Layer 3 - Voyage
The pre-arrival and in-stay planning layer. Trip Brief, Living Plan, Map.

### Layer 4 - Atrium
The marketing-to-concierge bridge. Reuses Instagram-bound video as native ambient surfaces.

## The three substrates

### Substrate A - Signal Graph
The unified, structured log of every guest interaction across every layer. The platform's memory.

### Substrate B - Wisdom Engine
The decision layer - Echo-Fast (S1) and Echo-Deep (S2) split. Modeled on Figure AI's Helix architecture.

### Substrate C - Trust & Privacy Spine
What is captured, retained, forgotten, and who can see it.

## Type-system conventions

### Phase 1 simplification: single-type approach
TypeScript types in `shared/types/` are written as **single interfaces that serve as both the DB-row shape and the domain object**. There is no separate `RawSignalRow` vs `Signal` split. The repository layer (Phase 1.3 work — `server/services/signals/*`, `server/database/postgres-repository.ts`) translates between snake_case SQL columns and camelCase TS fields, parses JSONB columns into structured types, and applies any other format conversions.

This is **a deliberate Phase 1 simplification, not an oversight**. A future row-type/domain-type split is permitted as the codebase scales — when derived UI projection types proliferate, or wire-format DTOs need to diverge from internal domain shapes. The current single-type approach keeps the surface small while the platform is still finding its shape.

### Nullable conventions
Two distinct semantic buckets, deliberately preserved:
- **`field?: T`** — *sometimes-not-yet-set*: the field has a state-machine pathway where it will (or may) be set later. Examples: `endedAt?: ISODate` (visit hasn't ended yet), `approvedBy?: UUID` (intervention not yet approved).
- **`field: T | null`** — *deliberately-absent-by-design*: the field is always present on the row but has a meaningful "no value" state by domain semantics. Examples: `Signal.visitId: UUID | null` (signal unattached to any visit), `InterventionExecution.cascadeId: UUID | null` (intervention by design didn't fire a cascade).

The distinction survives JSON serialization (`JSON.stringify` preserves `null`, drops `undefined`) and tells API consumers something real about each field's semantics.

### Narrow string unions
SQL columns typed `TEXT NOT NULL` with comment-documented allowed values are narrowed to **literal-string unions in TypeScript**. Example: `signals.source TEXT NOT NULL  -- staff-whisper|aurion-voice-prosody|...` becomes `SignalSource = 'staff-whisper' | 'aurion-voice-prosody' | ...`. Adding a new value to the SQL set requires a TS update — that compile-time enforcement *is the value of the type system*; loosening it loses the value.

## How to read a file

Every file has a header comment with this structure:

```
Layer:    <which of the 4 layers + 3 substrates>
Status:   SCAFFOLD | STUB | PARTIAL | IMPLEMENTED
Phase:    1-6 from BUILD_PHASES.md

Purpose:  <one-sentence description>

Depends on:    <files this needs>
Consumed by:   <files that need this>
Integrates:    <existing LUCCCA modules>
Pending:       <implementation checklist>

WARNING: DO NOT DELETE - disconnected files are placeholders.
```

If a file looks unreferenced, **do not delete it**. Cross-check against BUILD_PHASES.md before any file removal.

## Status legend

- **SCAFFOLD** - file exists, header only
- **STUB** - types and signatures defined, no logic
- **PARTIAL** - some functions implemented, some still TODO
- **IMPLEMENTED** - complete with tests
