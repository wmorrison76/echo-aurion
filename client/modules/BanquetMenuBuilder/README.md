# Banquet Menu Builder

A LUCCCA Framework module for composing, reviewing, and publishing banquet menus with AI-assisted intelligence.

## Module Overview

The Banquet Menu Builder lives inside MaestroBqts and provides:

- **Composition Canvas** — Three-panel UX for browsing categories, selecting items, and building menus
- **Live Computation** — Per-guest pricing, dietary distribution, allergen mapping, operational load — calculated as you build
- **Echo AI³ Integration** — JARVIS-level menu intelligence: composes drafts, critiques in real time, generates marketing collateral
- **Network Intelligence** — Anonymized cross-property benchmarking for pricing, popularity, and seasonal patterns
- **Template System** — 15 brand-aware visual templates render the same menu across PDF, web, social, and signage
- **Workflow Integration** — Decision Clearance Algorithm gates, role-based approvals, BEO synchronization

## Who Uses It

- **Executive Chef of Banquets & Catering** — Owns the menu item library, recipe versioning, pricing
- **Banquet Sales** — Composes menus for events, presents to clients, manages BEOs
- **Marketing Executive** — Reviews finalized menus, approves marketing collateral
- **Senior Art & Media Director** — Authors and approves template visual treatments
- **Marketing Sales** — Distributes published menus across surfaces

## Build Status

This module is being built in five packages:

| Package | Status | Description |
|---|---|---|
| 1. Foundation | 🚧 Installing | Schema, MongoDB, repositories |
| 2. Library + Seed | ⏳ Pending | Real data, utilities, seed script |
| 3. Composition Canvas | ⏳ Pending | Three-panel UI, drag/drop, live calc |
| 4. Echo AI³ | ⏳ Pending | Compose/critique/generate modes |
| 5. Templates + Network | ⏳ Pending | Visual layer, network intelligence, workflows |

## Architecture

```
BanquetMenuBuilder/
├── index.tsx                    Module entry, panel registration
├── BanquetMenuBuilder.types.ts  Schema as TypeScript
├── BanquetMenuBuilder.constants Enums, role IDs
├── BanquetMenuBuilder.config    Env handling
├── data/                        MongoDB layer
│   ├── mongoClient.ts          Atlas connection
│   ├── repositories/           One per collection
│   ├── indexes/                Idempotent index creation
│   └── seeds/                  Demo data (Package 2)
├── components/                 React UI (Package 3)
├── hooks/                      React hooks (Package 3)
├── services/                   Business logic + Echo (Package 4)
├── workflows/                  DCA + approval flows (Package 5)
└── utils/                      Pure utilities
```

## Integration Points

- **MaestroBqts** — Registers as a sub-panel
- **Decision Clearance Algorithm** — Gates approvals
- **Operational Collision Detection** — Validates staffing/equipment loads
- **Echo AI³ Proxy** — LLM orchestration layer
- **Guardian AI** — Pricing anomaly detection
- **Prophet** — Demand forecasting

This module does not reimplement these systems — it consumes them.

## Database

- **MongoDB Atlas** (M0 free tier → M10 production)
- **Five collections:** `property_items`, `network_items`, `network_intelligence`, `menus`, `menu_drafts`
- **Atlas Search** for full-text item search
- **Atlas Vector Search** for semantic queries (Echo)

## Development

```bash
# Verify TypeScript compiles
npx tsc --noEmit

# Create indexes (idempotent — safe to re-run)
npx tsx src/modules/MaestroBqts/BanquetMenuBuilder/data/indexes/createIndexes.ts

# Run tests (when added)
npm test src/modules/MaestroBqts/BanquetMenuBuilder
```

## License

Internal — EchoAurum / LUCCCA Framework. Not for external distribution.
