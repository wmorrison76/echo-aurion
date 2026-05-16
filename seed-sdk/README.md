# EchoAi³ Golden Seed SDK

> Your platform-building platform. Clone the architecture, ship a custom OS.

## What this is

The Golden Seed is a curated, battle-tested starter kit extracted from the Luccca / EchoAi³
framework. Every pattern in here was proven in production across 13 Luccca modules
(Pastry, BEO, Cake Viewer, Inventory, Stratus, etc.) before being packaged for re-use.

Walk away with this kit → come back → build your own custom OS-style platform in days,
not months.

## The seven pillars

1. **EchoAi Brain** — multi-LLM orchestration (Claude, Gemini, GPT, fal.ai, Whisper, Sora)
   via Emergent Universal Key. One key, many models, graceful fallback.
2. **EchoBus Spine** — client-side nervous system. Any module can open, insert into,
   highlight, or act on any other module. Turns AI from "answer" into "operate."
3. **Sidebar + Panel System** — group-based navigation, role-filtered menus,
   lazy-loaded panels, deep-link-able. 8-group chef-first template included.
4. **Stripe Standalone Pattern** — productize any module in <500 lines. Includes Pastry
   (bakeries, $49/mo) and BEO (venues, $79/mo) as reference implementations.
5. **Admin Auth Gate** — constant-time token guard, fail-closed if unset.
   Works for dashboards + scheduler triggers + gated dev tools.
6. **Observability Stack** — Sentry, rate limiting (slowapi), dismissal audit,
   SLA escalation, email outbox with graceful fallback.
7. **Cognition + OPA Guardrails** (from EchoCoder) — AI plans, policy validates,
   orchestrator executes. Nothing ships that violates your rules.

## Quick start

```bash
# 1. Clone the seed
./scripts/spawn-platform.sh --name "MyCustomOS" --domain "app.example.com"

# 2. Pick your modules
./scripts/add-module.sh --template "stripe-standalone"   # → $X/mo SaaS
./scripts/add-module.sh --template "ai-studio"           # → AI-powered creator
./scripts/add-module.sh --template "admin-dashboard"     # → revenue + KPIs
./scripts/add-module.sh --template "public-share-link"   # → client-approval loop

# 3. Wire Echo into your new modules
echo.register("my-panel", { onOpen, onInsert, onAction })

# 4. Ship
./scripts/publish.sh --target netlify   # or k8s, vercel, custom-docker
```

## File map

```
seed-sdk/
├── manifest.json              # template catalog + versions
├── templates/
│   ├── stripe-standalone/     # Pastry / BEO pattern (public landing + Stripe + admin)
│   ├── ai-studio/             # fal.ai + LLM + gallery pattern
│   ├── admin-dashboard/       # KPIs + subscriber table + billing
│   ├── public-share-link/     # client-approval pattern
│   ├── notifications-panel/   # assigned + dismissal audit + SLA
│   └── cake-viewer-3d/        # R3F + PBR + HDRI (ready-to-adapt 3D shell)
├── brain/                     # EchoAi orchestration
├── spine/                     # EchoBus client library
├── sidebar/                   # navigation + role filters
├── auth/                      # admin-token gate
├── observability/             # Sentry + rate limit + email outbox
├── cognition/                 # plan → OPA validate → orchestrator
├── scripts/                   # spawn-platform, add-module, publish
└── docs/                      # architecture, conventions, gotchas
```

## Philosophy

- **Don't rebuild what's proven.** Every pattern here survived real users.
- **Echo operates, doesn't chat.** The AI should press buttons, not emit walls of text.
- **Security is a feature, not a bolt-on.** Admin-gate by default. Fail closed.
- **Productize by default.** Every module ships as standalone-ready.
- **Observable from day one.** If Echo does something, the tape shows it.

## What you get vs. starting from scratch

| Capability | From scratch | With Golden Seed |
|-----------|--------------|------------------|
| Multi-LLM AI orchestration | 2 weeks | `import { askEcho } from './brain'` |
| Stripe subscription SaaS | 1 week | `./add-module.sh stripe-standalone` |
| Admin dashboard + billing | 1 week | included |
| Panel-to-panel control bus | 3 days | included |
| AI writes to UI | 2 weeks | `echo.insertBlock()` |
| Client share-approval | 3 days | included |
| Security hardening | 1 week | admin-gate + Sentry + rate limit |
| **Total** | **~7 weeks** | **~1 day to custom-brand** |

## Who this is for

You, Jay. This is your toolkit for walking into a client meeting, taking their pain point,
and walking out 4 hours later with a production-ready SaaS that solves exactly their
problem. No 16-hour kitchen shifts. Build for a living.

## Next evolution (roadmap)

- `./scripts/intake.sh` — client intake form → auto-generated module spec
- `./scripts/co-present.sh` — live-share session where the client watches you build
- `./scripts/publish.sh --as-standalone` — one command, new subdomain, Stripe attached

These are real, they're in the backlog, and they unlock "sell during the first call."

---

Generated from the Luccca / EchoAi³ codebase. For the full architecture deep-dive see
`/app/memory/LUCCCA_DEEP_DIVE_ITER163.md`.
