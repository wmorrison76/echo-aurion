# Porting Playbook · `/app/frontend/` → `/app/client/`

> Status: **READY TO EXECUTE.** Install diagnostic resolved the blocker — see `## CI Install Diagnostic Result` below. Once PR #69 is merged AND the lockfile commit lands, this playbook converts the standalone preview into routes inside the real LUCCCA app shell. **Estimated execution time: 60–90 minutes guided.**

---

## CI Install Diagnostic Result (2026-05-10)

**Root cause is NOT native-module compilation.** It's a lockfile-package.json drift:

```
ERR_PNPM_OUTDATED_LOCKFILE
Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with /package.json
Failure reason: specifiers in the lockfile don't match specs in package.json
Diff: package.json adds "decimal.js":"^10.4.3"; lockfile is missing it.
```

CI defaults to `--frozen-lockfile`, which fails before any compilation step ever runs. That's why earlier theories (isolated-vm / tesseract.js / @swc/core native compile) were red herrings — those steps never executed.

### Confirmed working install command

```bash
cd /app && pnpm install --no-frozen-lockfile --ignore-scripts
# Done in 40s using pnpm v9.15.9 — all packages resolved, no errors.
```

### Minimal CI fix (one commit)

The diff is tiny:

```
$ git diff --stat pnpm-lock.yaml
 pnpm-lock.yaml | 7 +++++--
 1 file changed, 5 insertions(+), 2 deletions(-)
```

**Action:** commit the regenerated `pnpm-lock.yaml` to `main`. CI's `Install dependencies` step will then succeed because the lockfile matches `package.json`. The `--ignore-scripts` already added in commit `035475d06` keeps native-module postinstall from running, so the original CI fix (which moved the failure forward) plus this lockfile commit should turn the `validate` job green.

If the team prefers belt-and-suspenders, also add this to the workflow before `pnpm install`:

```yaml
- name: Sync lockfile if drifted
  run: pnpm install --lockfile-only --ignore-scripts
```

That auto-syncs the lockfile in CI without committing — but it's an anti-pattern (CI should reflect what's in `main`), so committing the lockfile is the right call.

---

## Architecture decision

**Keep both surfaces alive. They serve different audiences.**

| Surface | Path | Audience | What lives there |
|---|---|---|---|
| Standalone preview | `/app/frontend/` (current) → `cfo-toolkit-deploy.preview.emergentagent.com` | Investor walkthroughs, sales demos, cold marketing URLs | Single-purpose Live Dashboard. No login. No chrome distractions. Shows the doctrine surfaces in their purest form. |
| Integrated LUCCCA | `/app/client/` → real LUCCCA app | Customer users, operators, EC, CFO, GM | Full sidebar, tab bar, ECHO assistant, command bar, theme toggle, auth, all 200+ existing modules. Live Dashboard becomes one entry under "Intelligence & Forecasting". |

Both consume the same backend at `localhost:8001` / production ingress. Zero backend changes required.

---

## Components to port (5 total)

All from `/app/frontend/src/`:

| Source file | Lines | Purpose |
|---|---|---|
| `LiveDashboard.tsx` | ~390 | 6-tile + banner unified dashboard |
| `OutletCaptureDeepDive.tsx` | ~310 | Per-outlet trial-level retrospective + Monte Carlo horizon detail |
| `PeriodCloseDeepDive.tsx` | ~330 | May P&L close run + Why-Changed §1.1 drill (clickable audit events back to source entities) |
| `ComingSoon.tsx` | ~115 | Doctrine-aligned placeholder (lists live curl-able endpoints) |
| `GuidedTour.tsx` | ~145 | 3-step pulsing-arrow first-visit tour |

Plus:
- `api.ts` (fetch wrapper + fmt helpers + `sourceTag()` + `DEMO_PROPERTY` constant) — port to a shared utils module under `client/lib/`
- `styles.css` — port the gold-on-black design tokens to a CSS module OR convert to Tailwind classes (LUCCCA already uses Tailwind, so this is the longer subtask)

---

## Step-by-step port

### 0. Pre-flight

```bash
cd /app
pnpm install --no-frozen-lockfile --ignore-scripts   # ensures node_modules are fresh
git status                                            # confirm clean (or expected diff)
pnpm dev:frontend                                     # OR: yarn start
# Verify LUCCCA app boots at localhost:3000 (or whichever port the dev script picks).
```

### 1. Identify the right module location

LUCCCA modules live under:
```
/app/client/modules/{ModuleName}/
```

Two existing modules use the same pattern this work fits:
- `/app/client/modules/Forecast21Day/index.tsx` — already consumes `/api/forecast-21/forecast`
- `/app/client/modules/AdminCommand/index.tsx`

**Create:** `/app/client/modules/PropertyPulse/` (the unifying name for the new dashboards).

```
/app/client/modules/PropertyPulse/
├── index.tsx                      # Default export → LiveDashboard
├── LiveDashboard.tsx              # ported from frontend
├── OutletCaptureDeepDive.tsx      # ported
├── PeriodCloseDeepDive.tsx        # ported
├── ComingSoon.tsx                 # ported
├── GuidedTour.tsx                 # ported
├── api.ts                         # port (or reuse client/lib/api equivalent)
└── PropertyPulse.css              # ported tokens (or rewrite as Tailwind)
```

### 2. Add to the route registry

Find LUCCCA's panel/route registry. Two candidates surfaced during exploration:
- `/app/client/lib/panel-registry.ts`
- `/app/client/lib/panel-types.ts`
- `/app/client/lib/panel-metadata.ts`

Read those first. The pattern likely is:
```ts
export const PANEL_REGISTRY = {
  property_pulse: {
    component: lazy(() => import("../modules/PropertyPulse")),
    title: "Property Pulse",
    sidebarSection: "intelligence_forecasting",
    icon: "activity",
  },
  // existing panels…
};
```

Sub-routes (deep-dives) likely register separately, OR the component handles internal routing. Read 2–3 existing modules first to match the convention.

### 3. Add the sidebar entry

Sidebar lives at `/app/client/components/site/Sidebar.tsx`. Find the "Intelligence & Forecasting" section and add the new entry. Pattern (verify against current code):

```tsx
{ id: "property_pulse", label: "Property Pulse", icon: "gauge-high" },
```

### 4. Replace the standalone HTML chrome

The standalone components currently include their own top banner (`.app-banner`). When wrapped by the LUCCCA `<AppShell>`, that banner is **redundant** — the LUCCCA shell already provides:
- Brand mark (LUCCCA logo)
- Top tab bar
- ECHO button
- Theme toggle
- Sync button

**Action in each ported component:** wrap the existing JSX in a fragment (`<>...</>`) and either:
- Remove the `.app-banner` block entirely, OR
- Convert it to an in-content sub-header (smaller, doesn't conflict with the global chrome)

The `.hero` block on LiveDashboard should stay (that's the doctrine framing — distinct from chrome). The `.drilldown` page-level sub-header on each deep-dive should also stay (it's the breadcrumb back to the live dashboard).

### 5. Migrate routing

The standalone uses `react-router-dom` v6 directly. LUCCCA likely has its own router or panel-controller. Two options:

**Option 5a — Nested route block (simplest).** Mount a `<Routes>` block inside `<PropertyPulse />` so the deep-dives are sub-routes of the panel:

```tsx
// /app/client/modules/PropertyPulse/index.tsx
import { Routes, Route, Navigate } from "react-router-dom";

export default function PropertyPulse() {
  return (
    <Routes>
      <Route index element={<LiveDashboard />} />
      <Route path="live/:propertyId" element={<LiveDashboard />} />
      <Route path="outlet/:propertyId/:outletId" element={<OutletCaptureDeepDive />} />
      <Route path="period-close/:propertyId" element={<PeriodCloseDeepDive />} />
      <Route path=":module/:propertyId" element={<ComingSoonRouter />} />
    </Routes>
  );
}
```

**Option 5b — Panel-controller native.** If LUCCCA's panel system handles its own navigation (via `panel-controller.ts`), wire each deep-dive as a separate panel and use `panel.navigate("outlet_deep_dive", { propertyId, outletId })` instead of `<Link>`. Read `client/lib/panel-controller.ts` first to decide.

**Recommended:** start with 5a. It's a small change and gets the screens visible fast. Migrate to 5b later if the team prefers the panel-native pattern.

### 6. Update internal links

In `LiveDashboard.tsx` etc., the `<Link to="...">` paths use the standalone routes:
- `/dashboard/live/${propertyId}`
- `/dashboard/outlet/${propertyId}/${outletId}`
- `/dashboard/period-close/${propertyId}`
- `/dashboard/{pace,cash-runway,exceptions,forecast-21,lifecycle,menu-engineering,tip-audit}/${propertyId}`

Inside the LUCCCA shell, these probably need a prefix (e.g., `/property-pulse/...`) OR conversion to relative paths (e.g., `live/...` resolves against the panel mount point).

Pattern:
```tsx
// Before
<Link to={`/dashboard/outlet/${propertyId}/${outletId}`}>

// After (relative)
<Link to={`outlet/${propertyId}/${outletId}`}>

// OR (panel-controller native)
<a onClick={() => panel.navigate("outlet_deep_dive", { propertyId, outletId })}>
```

A search-and-replace across the 5 files handles this.

### 7. CSS strategy

Two options:

**Option 7a — keep CSS-in-stylesheet.** Move `styles.css` to `/app/client/modules/PropertyPulse/PropertyPulse.css` and import it from `index.tsx`. Vite handles scoped imports. Risk: the CSS variables (`--bg-deep`, `--gold`, etc.) leak globally. Use a top-level wrapper class to scope:

```tsx
<div className="property-pulse-root">
  {/* dashboard content */}
</div>
```

```css
.property-pulse-root {
  --bg-deep: #0a0a0a;
  --gold: #c8a97e;
  /* …rest of tokens */
}
.property-pulse-root .tile { /* etc. */ }
```

**Option 7b — Tailwind conversion.** LUCCCA uses Tailwind. Rewriting the styles in Tailwind classes integrates better with the existing codebase but takes ~1.5 hours of mechanical work. Recommend this only as a follow-up cleanup, not as part of the initial port.

**Recommended:** option 7a for the initial port. Tailwind conversion as a later refactor.

### 8. Font loading

The standalone loads Fraunces, Inter, JetBrains Mono via Google Fonts CDN in `index.html`. LUCCCA's `index.html` may already load Inter; add Fraunces + JetBrains Mono to it (or to the global stylesheet via `@import`). One line change.

### 9. FontAwesome

The standalone loads FontAwesome via CDN in `index.html`. Check if LUCCCA already uses it (likely via `react-icons` or `lucide-react`). If LUCCCA uses `lucide-react`, replace the FontAwesome icon classes with lucide-react components:

| FontAwesome | lucide-react |
|---|---|
| `fa-gauge-high` | `<Gauge />` |
| `fa-coins` | `<Coins />` |
| `fa-circle-exclamation` | `<AlertTriangle />` |
| `fa-chart-line` | `<TrendingUp />` |
| `fa-list-check` | `<ListChecks />` |
| `fa-table-cells-large` | `<LayoutGrid />` |
| `fa-arrow-left` | `<ArrowLeft />` |

~20 minutes of mechanical replacement.

### 10. Test inside the LUCCCA shell

```bash
cd /app
pnpm dev:frontend  # or whatever the team uses
# Open localhost:3000 (the LUCCCA app)
# Click the new "Property Pulse" sidebar entry
# Verify:
#  - Dashboard renders with all 6 tiles populated
#  - Outlet pill click → deep-dive renders
#  - Lifecycle tile click → period-close deep-dive renders
#  - Audit-event link click → source entity deep-dive renders (the loop closure)
#  - Guided tour fires on first visit (clear localStorage to test)
#  - Going back via the sidebar / nav doesn't break state
```

### 11. Don't break the standalone

The standalone preview is preserved at `/app/frontend/`. Don't delete or modify it — it's the investor-walkthrough URL. The Emergent Vite dev server on port 3000 currently serves the standalone; if the LUCCCA dev server takes port 3000, we either:
- Move the standalone to a separate port (the supervisor config can be updated to give the LUCCCA build port 3000 and serve the standalone elsewhere), OR
- Build the LUCCCA app to a static bundle and serve both via separate paths

Recommended: leave the standalone preview deployed as-is for now. The integrated version takes precedence as the customer-facing route.

---

## Risk register

| Risk | Probability | Mitigation |
|---|---|---|
| LUCCCA's router conflicts with the standalone's `BrowserRouter` | High | Use option 5a (nested `<Routes>`). Tested pattern. |
| CSS-variable leakage breaks LUCCCA's existing Tailwind theme | Medium | Wrap in `.property-pulse-root` scope (option 7a). |
| Sidebar entry doesn't accept the right icon name | Low | Read existing entries first; reuse same icon system. |
| `BrowserRouter` mount conflict (if LUCCCA already wraps in a router) | High | Don't import `BrowserRouter` in the ported module. Just use `<Routes>` and `<Route>` directly. |
| Standalone `<Link to="/dashboard/...">` paths break inside LUCCCA | Medium | Search-and-replace to relative paths in step 6. |
| LUCCCA panel-controller pattern differs from react-router | Medium | Read 2–3 existing modules in `client/modules/` BEFORE writing code. Match conventions. |
| Backend URL / env-var resolution differs | Low | LUCCCA already calls `/api/...` via the same ingress; the existing api.ts layer should "just work". |

---

## Sequencing recommendation

If the team has 90 minutes today:

1. **15 min:** read `client/modules/Forecast21Day/index.tsx` + `client/lib/panel-registry.ts` + `client/components/site/Sidebar.tsx`. Confirm conventions.
2. **5 min:** create the `client/modules/PropertyPulse/` directory + copy the 5 source files (no edits yet).
3. **10 min:** add sidebar entry + register the panel in panel-registry.
4. **20 min:** edit imports, paths, scope the CSS variables. Make the LiveDashboard render inside the LUCCCA shell.
5. **15 min:** verify outlet click-through to deep-dive works.
6. **15 min:** verify period-close + Why-Changed audit-event navigation works.
7. **10 min:** smoke test guided tour, ComingSoon placeholders.

If something derails (e.g., the panel-registry pattern is more complex than assumed), fall back to Option 5b (panel-controller native) and budget another 60 minutes.

---

## Long-term cleanup (not blocking)

After the initial port lands and is verified:

1. Convert `PropertyPulse.css` to Tailwind classes (~1.5 hrs)
2. Replace FontAwesome with `lucide-react` (~20 min, mechanical)
3. Move `api.ts` helpers to `client/lib/api/` and consolidate with existing fetch wrappers (~30 min)
4. Build the remaining 7 deep-dives (Pace, Cash Runway, 21-Day Forecast full grid, Lifecycle full UI, Exception Review history, Menu Engineering matrix, Tip Audit reconciler) — replacing the ComingSoon placeholders one at a time

---

## What's done already (don't redo)

- ✅ Backend at 2,160 routes, 10 engines active, demo property seeded
- ✅ Forecast21Day frontend module already exists in `/app/client/modules/Forecast21Day/`
- ✅ Two D64 boot-fixes (`Dict` import, `Header` import) merged via PR #69
- ✅ Standalone preview live with 6 tiles + 2 deep-dives + ComingSoon + guided tour + clickable Why-Changed audit-event links
- ✅ CI install diagnosis complete — answer is the lockfile commit, not native modules

---

## Single-line CI fix to ship NEXT

```bash
cd /app && pnpm install --no-frozen-lockfile --ignore-scripts && \
  git add pnpm-lock.yaml && \
  git commit -m "fix: sync pnpm-lock.yaml with package.json (adds decimal.js)" && \
  git push origin main
```

After that lands, the next CI run on `main` should be green. Confirm by checking the Actions tab.
