# EchoCoder (SaaS Studio)

Professional SaaS-style React + Vite + Tailwind app with a live design studio, draggable canvas, 3D Echo Orb, and embeddable widget.

## Key features
- Studio with tabs: Design, Interact, Code, Seed
- Left chat/history panel with task buttons (Planner, Coder, Reviewer, Integrator, Historian, Scorecard)
- Draggable design canvas to place blocks/tools in real time
- 3D Echo Orb with settings dialog and iframe embed generator (/embed/echo)
- Language selector (EN/ES/FR/PT/IT)
- Light/dark themes

## Global navigation
- Header + Menu bar with links to Home, Blueprint, Studio, and quick task links

## Running locally
- npm i
- npm run dev

## Deploy (Netlify or Vercel via MCP)
This project is designed to deploy through Builder.io MCP integrations (no local secrets committed).

1) Connect hosting
- Netlify: Click [Open MCP popover](#open-mcp-popover) and Connect Netlify MCP.
- Vercel: Click [Open MCP popover](#open-mcp-popover) and Connect Vercel MCP.

2) Deploy
- Netlify MCP: use the Netlify tools to create a site and trigger a deploy (build runs on Netlify; local build optional).
- Vercel MCP: use the Vercel tools to import and deploy.

3) Custom domain
- Set your domain in the hosting provider.
- The public embed URL becomes: https://YOUR_DOMAIN/embed/echo

Notes
- Do not put secrets in code. If environment variables are needed, set them in your host dashboard or via DevServerControl set_env_variable.

## Embedding the Echo Orb
- In Studio, copy the iframe from "Embed this orb".
- Or manually:
  <iframe src="https://YOUR_HOST/embed/echo?radius=2.2&rings=8&ringParticles=900&ringSpeed=0.6&ringRand=0.35&glow=1200&glowSpeed=1.4&omni=1" width="640" height="360" style="border:0" loading="lazy"></iframe>

## Language Control Center
- Header -> globe icon. Persists to localStorage. Add keys in client/i18n.tsx.

## MCP integrations to consider
- Builder CMS: content models and assets
- Neon: Postgres database (serverless)
- Supabase: auth + DB + realtime
- Sentry: error monitoring
- Linear / Notion: project docs and backlog
- Zapier: automation
- Context7: docs lookup
- Semgrep: security scanning
- Prisma Postgres: ORM
Connect any via [Open MCP popover](#open-mcp-popover).

## Code pointers
- Studio layout: client/pages/Studio.tsx (tabs, chat, canvas, settings dialog, embed)
- Menu bar: client/components/site/MenuBar.tsx
- Echo orb: client/components/echo/EchoOrb.tsx
- Public embed page: client/pages/EmbedEcho.tsx
- i18n: client/i18n.tsx
- Theme toggle: client/components/site/ThemeToggle.tsx

## Styling & UX
- Tailwind tokens are defined in client/global.css (light/dark)
- SaaS layout: sticky header + sticky menu bar, responsive grids, clear panels

## FAQ
- Buttons "Planner/Coder/..." update the current task in Studio and log to history. Wire them to automations later with MCP or server routes.
- The embed route is static and safe by default.
