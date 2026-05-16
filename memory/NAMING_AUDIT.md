# LUCCCA Naming Audit — iter173

> William asked: *"Are we using ECHO naming too much? I originally did that to drive the thinking that EchoAi³ was the brain power — the Odin, all-seeing, all-knowing. Now I want to avoid confusion and overlap when searching for things."*

**Yes — "Echo" has become the default prefix for almost everything, which dilutes its original meaning.** Below is a concrete rename plan grouped by intent. Most renames are **UI/UX label-only** (no code refactor needed). Code identifiers stay as-is for stability.

## The principle we should adopt

Reserve the prefix **"Echo"** (or **EchoAi³**) exclusively for things that represent the **thinking/orchestration intelligence** — the brain itself, the things that "watch, learn, and suggest." Everything else should be named for its **function** (what it does for the user) or its **persona** (who it's for).

### Three naming lanes

| Lane | Purpose | Naming rule | Examples |
|------|---------|------------|----------|
| 🧠 **Echo family** | AI orchestration, cross-module intelligence | Keep "Echo" / "EchoAi³" prefix | Echo Command Bar · EchoStratus · EchoAurium · Echo Activity · Echo Solve (⌘J) |
| 🛠 **Functional tools** | Product modules serving a specific job | Name by what it **does** | Daily Standup · Lifestyle Command · People & Operations · Alice Tickets · Cake Designer |
| 👤 **Persona rooms** | Dashboards for a specific role | Name by **who** uses them | GM Bridge · Director of Lifestyle · Concierge Desk · Pastry Studio |

---

## Full rename proposal — Current → Suggested (UI labels only)

### 🟢 Keep as-is (genuine Echo brain functions)
These *should* keep "Echo" — they're the intelligence layer.

| Current | Keep | Why |
|---------|------|-----|
| **EchoAi³** | ✅ keep | The umbrella product name / brand |
| **Echo Command Bar** (⌘K) | ✅ keep | The sentient entry point |
| **Echo Solve** (⌘J) | ✅ keep | The "no-look" LLM resolver |
| **Echo Activity** (right drawer) | ✅ keep | Live intelligence event feed |
| **EchoStratus** (forecasting) | ✅ keep | Pattern/forecast brain |
| **EchoAurium** (GM hero) | ✅ keep | Composite health intelligence |
| **ZARO Guardian** | ✅ keep | Security/policy guardian (distinct from Echo, intentional) |

### 🟡 Rename (functional tools currently Echo-prefixed)

| Current UI label | Suggested UI label | Rationale |
|------------------|-------------------|-----------|
| **Echo Concierge · OS** | **Concierge Desk** (or **Concierge OS** if you want gravitas) | It's a working surface, not AI — people "use" it |
| **Echo Canvas Studio** | **Food Canvas Studio** (or **AI Food Studio**) | The "AI" matters but "Echo Canvas" reads generic |
| **Echo Events** | **Events Board** (or **Catering Board**) | It's a module, not a brain |
| **Echo Tape** → already renamed to **Echo Activity** | ✅ done iter164 | good |
| **Echo Connect** | **Integration Hub** (already exists as alt) | Unify with existing "Integration Hub" |
| **EchoCoder** | **Golden Seed Studio** (or **Plant-a-Seed**) | User already used this name — matches the "seed" metaphor better |
| **EchoLayout** | **Floor Plan Studio** | Functional, clearer |
| **EchoCommandBar** (file name) | leave code as-is; UI reads **"Command Bar"** | No code refactor required |
| **FOH Concierge Hub** | **Local Guide** (or **Neighborhood Hub**) | "Concierge Hub" collides with "Concierge Desk" |
| **Daily Standup (Sailing Yacht)** | **Sailing Yacht · Morning Brief** | Your internal name becomes the primary |

### 🔵 Phase-1 new modules (already named cleanly — no change)

| Label | Status |
|-------|--------|
| **Daily Standup · Sailing Yacht** | ✅ clear |
| **People & Operations** | ✅ clear |
| **Lifestyle Command** | ✅ clear |
| **Alice · Tickets** | ✅ persona name works, keeps it distinct from Concierge |

### ⚠️ Potential confusion points today

1. **"Concierge" appears in 3 places**: Echo Concierge (orchestration), FOH Concierge Hub (local guide), Concierge (sidebar group). Proposed: keep **Concierge Desk** (orchestration), rename Local Guide, keep sidebar group label.
2. **"Echo" appears in 14+ distinct panel keys** — most don't earn the brain-prefix.
3. **"Sailing Yacht"** is lovely but currently parenthetical. Lead with it: "The Sailing Yacht · Morning Brief."
4. **"EchoAi³ / EchoAi3 / Echo AI³"** — three spellings float around. Lock one: **EchoAi³**.

---

## Recommended rollout (low-risk, UI-only)

- **Week 1**: Update `panel-metadata.ts` labels only (sidebar labels + panel headers).
- **Week 2**: Update marketing site (the one you're building on Emergent too) to match.
- **Week 3**: Rename data-testids in lock-step only if tests break (most won't — testids stay stable).
- **Don't refactor** Python route prefixes (`/api/echo-concierge-v2`, etc.) — they're stable URLs for integration partners.

## Quick-win: a single `NAMING.md` contract for future modules

Before adding a new module, the builder answers three questions:

1. Is this **new intelligence** that watches/learns across modules? → "Echo*"
2. Is this a **tool** a person uses to do a job? → name the job
3. Is this a **dashboard for a specific role**? → name the role

This prevents future Echo-sprawl.

---

*Generated iter173. Not yet applied. Review + pick which renames to ship in iter174.*
