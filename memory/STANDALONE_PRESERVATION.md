# Standalone Investor Dashboard · Preservation Plan

**Effective:** 2026-05-10 (D64 swap)
**Owner:** Emergent main agent
**Purpose:** Preserve the standalone "clean dashboard" experience while routing the primary preview URL to the integrated LUCCCA shell.

## What changed in this session

| Preview URL path | Before D64 swap | After D64 swap |
|---|---|---|
| `https://<preview>/` | `/app/frontend/` (Vite dev) → standalone | `/app/dist/spa/` (built LUCCCA shell) — **primary** |
| `https://<preview>/standalone/` | (not served) | `/app/frontend/dist-archive/` (built standalone) — **preserved** |
| `https://<preview>/standalone/dashboard/live/pier-sixty-six-demo` | (not served) | full standalone live dashboard with deep-dives |
| `https://<preview>/api/*` | (no proxy — returned SPA index.html, broke `fetch().json()` in panels) | **proxied** to `API_PROXY_TARGET` (default `http://localhost:8001`); per-prefix overrides via `API_PROXY_RULES` |

## How the swap works

The supervisor frontend config (`/etc/supervisor/conf.d/...conf` — read-only) still invokes `yarn start` in `/app/frontend/`. The `start` script was redirected from `vite --host` to a tiny static-file Node server (`/app/frontend/preview-server.mjs`) that serves both production builds with proper SPA fallback for each surface.

**Routing rules in `preview-server.mjs`:**

```
GET|POST|… /api/*         → proxied to API_PROXY_TARGET (default http://localhost:8001 — FastAPI)
                            optional per-prefix overrides via API_PROXY_RULES
GET|POST|… /ws/*          → proxied to the same upstream (websocket upgrade supported)
GET /standalone           → /app/frontend/dist-archive/index.html
GET /standalone/*         → resolves under /app/frontend/dist-archive/
                            falls back to /app/frontend/dist-archive/index.html (SPA)
GET /*                    → resolves under /app/dist/spa/
                            falls back to /app/dist/spa/index.html (SPA)
```

### Dual-backend setup (LUCCCA-specific)

LUCCCA runs two API backends in parallel:
* **FastAPI** on `:8001` — most `/api/*` routes (`/api/spa-ops/*`, `/api/menu-eng-matrix/*`, `/api/guest-intel/*`, `/api/my-schedule/*`, `/api/ops-forecast/*`, …).
* **Node/Express** (`server/node-build.ts`) on `:8080` — Maestro-specific routes (`/api/maestro/events`, `/api/maestro/banquets`, etc., the Supabase-backed surface).

Without the per-prefix override the maestro-dashboard panel hits FastAPI (which doesn't have `/api/maestro/events`) and falls back to a 404 / parse error. To split correctly, run the preview server with:

```bash
API_PROXY_TARGET="http://localhost:8001" \
API_PROXY_RULES="/api/maestro=http://localhost:8080" \
node frontend/preview-server.mjs
```

Multiple rules can be comma-separated. Longest-prefix wins. Anything unmatched falls through to `API_PROXY_TARGET`.

## Source tree (unchanged)

* **Standalone source** still lives at `/app/frontend/src/` (LiveDashboard.tsx, OutletCaptureDeepDive.tsx, etc.). **Do not modify** unless an explicit demo bug needs fixing — this is the investor walkthrough asset.
* **LUCCCA integrated source** lives at `/app/client/modules/PropertyPulse/` (`index.tsx`, `LiveDashboard.tsx`, `OutletCaptureDeepDive.tsx`, `PeriodCloseDeepDive.tsx`, `ComingSoon.tsx`, `GuidedTour.tsx`, `api.ts`, `PropertyPulse.css`).

When changes ship to either surface, run the corresponding rebuild from the table below.

## Rebuild commands

### Standalone (after editing `/app/frontend/src/*`)
```bash
cd /app/frontend
yarn build                      # outputs to /app/frontend/dist/
rm -rf /app/frontend/dist-archive
mv /app/frontend/dist /app/frontend/dist-archive
sudo supervisorctl restart frontend
```

### Integrated LUCCCA shell (after editing `/app/client/*`)
```bash
cd /app
corepack prepare pnpm@10 --activate
pnpm install --frozen-lockfile     # only if package.json/lockfile changed
pnpm run build:client              # outputs to /app/dist/spa/
sudo supervisorctl restart frontend
```

Build times on the current pod: standalone ~3s, LUCCCA shell ~1m 41s.

## Roll back the swap (if needed)

If the integrated shell needs to go offline and the standalone needs to be the primary again:

```bash
# Restore the standalone as primary
cd /app/frontend
# Switch start script back to vite dev
node -e '
const p = "/app/frontend/package.json";
const j = JSON.parse(require("fs").readFileSync(p, "utf8"));
j.scripts.start = "vite --host 0.0.0.0 --port 3000";
require("fs").writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
'
sudo supervisorctl restart frontend
```

`/app/frontend/preview-server.mjs` and the dist-archive can stay in place for re-swap later.

## Forward plan — when the integrated shell is the only thing we want to ship

After investor demos stabilize on the integrated experience, the standalone can be:

1. **Removed from preview routing** — drop the `/standalone/` route in `preview-server.mjs` (simple delete).
2. **Archived to git** — `git rm -r /app/frontend/src/` is the cleaner cut. The `dist-archive/` bundle stays as a one-line-restore fallback.
3. **Public backup URL** — if marketing still needs a "clean dashboard" link for VC follow-ups, deploy `/app/frontend/dist-archive/` to Netlify/Vercel under a stable URL (`pier-sixty-six.luccca.com` or similar).

## Verification commands

```bash
# Integrated shell renders
curl -sS http://localhost:3000/ | grep -q 'Echo AURION' && echo "✓ shell ok"

# Standalone preserved
curl -sS http://localhost:3000/standalone/ | grep -q 'Pier Sixty-Six' && echo "✓ standalone ok"

# Backend API still reachable
curl -sS http://localhost:8001/api/health | grep -q '"ok"' && echo "✓ backend ok"

# Smoke test (4 live-tile endpoints + 2 deep-dives)
cd /app && python -m pytest backend/tests/test_property_pulse_demo_smoke.py -v
```

## Files of reference

| File | Purpose |
|---|---|
| `/app/frontend/preview-server.mjs` | Static SPA router (production preview server) |
| `/app/frontend/package.json` | `start` script invokes `preview-server.mjs` |
| `/app/frontend/dist-archive/` | Built standalone investor dashboard |
| `/app/dist/spa/` | Built LUCCCA app shell (integrated) |
| `/app/client/modules/PropertyPulse/` | Integrated PropertyPulse module source |
| `/app/frontend/src/` | Standalone source (untouched, mirrors investor demo content) |
| `/app/backend/tests/test_property_pulse_demo_smoke.py` | 6-test regression suite (~5s) |
