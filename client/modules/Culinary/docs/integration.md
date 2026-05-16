# Integration Notes (for Builder.io Team)

You are building a **module inside LUCCCA**. Do **not** create GlowyDesk, global state containers, or your own auth.
Your deliverables are **panels + components** that plug into existing hooks and surfaces.

---

## What you implement

- Panels (exported React components):
  - `InvoiceTriagePanel`
  - `RecipeCostingPanel`
  - `ForecastPanel`
  - `WinePairingPanel`
  - `HelpCenterPanel` (RAG search UI)
- Optional UI bits:
  - Context cards, buttons that call Echo actions, small forms.

**Do not implement**: GlowyDesk shell, app-wide state, routing, auth, or workers. Those already exist elsewhere.

Panel placement is defined at `docs/placement_map.json`.

---

## Hooks you can use

These hooks are already available in the app environment:

```ts
// Open/minimize/dock any floating panel
const { open, minimize, dock } = usePanelManager();

// Call Echo tools (server actions) with RBAC + audit under the hood
const echo = useEchoActions();

// Read feature flags (TOTP/WebAuthn etc. are off in Builder dev)
const { AUTH_ENABLE_TOTP, AUTH_ENABLE_WEBAUTHN } = useFeatureFlags();

// Write an audit event for critical user actions
await useAudit().log({ action: 'PANEL_ACTION', entity: 'Recipe', entityId, data });
```

> Note: In this bundle we include light stubs of these hooks. In the full LUCCCA app they resolve to the production implementations.

---

## Minimal panel example

```tsx
// apps/web/src/panels/RecipeCostingPanel.tsx
import * as React from 'react';
const { useState } = React;

import { usePanelManager } from '../lib/panelManager'
import { useEchoActions } from '../echo/useEchoActions'

export default function RecipeCostingPanel(){
  const pm = usePanelManager()
  const echo = useEchoActions()
  const [recipeId, setRecipeId] = useState('')
  const [portions, setPortions] = useState(50)
  const [result, setResult] = useState<{ totalCost:number }|null>(null)

  async function handleCost(){
    const out = await echo.costRecipe?.({ recipeId, portions })
    if (out) setResult({ totalCost: Number(out.totalCost || 0) })
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">Recipe Costing</h2>
      <div className="flex gap-2 mt-2">
        <input placeholder="Recipe ID" value={recipeId} onChange={e=>setRecipeId(e.target.value)} />
        <input type="number" value={portions} onChange={e=>setPortions(Number(e.target.value))} />
        <button onClick={handleCost}>Cost</button>
        <button onClick={()=>pm.minimize('RecipeCosting')}>Minimize</button>
      </div>
      {result && <div className="mt-3">Total Cost: ${result.totalCost.toFixed(2)}</div>}
    </div>
  )
}
```

---

## Calling Echo actions (server tools)

Echo actions are typed functions that run server-side (queue or direct). Use them from panels:

```ts
const echo = useEchoActions()

await echo.explainCOGS?.('2025-09')                // CPA-style narrative (cited)
await echo.buildPrep?.('2025-10-06','outlet-main') // returns prep items
await echo.pairWine?.('menu-scallops')             // returns suggestions
await echo.costRecipe?.({ recipeId, portions: 40 })// returns { totalCost }
```

> All actions are RBAC-checked and audited by the app. Panels don’t need to add auth logic.

---

## Wiring buttons to panels via Command Palette

Panels should be discoverable from the global Command Palette (⌘K). Use panel names from `docs/placement_map.json`:

```ts
const pm = usePanelManager()
pm.open('InvoiceTriage')
pm.open('Forecast30')
pm.dock('HelpCenter')
```

---

## RAG search in HelpCenterPanel

Your Help Center panel can issue a semantic search and render results with source tags:

```tsx
const [q,setQ] = useState('')
const [hits,setHits] = useState<any[]>([])

async function run(){
  const res = await fetch('/api/rag/search?q='+encodeURIComponent(q))
  const json = await res.json()
  setHits(json.hits || [])
}
```

In production, `/api/rag/search` uses pgvector + source metadata (Builder CMS, Notion, PDFs).

---

## Data boundaries

- Read/write via published API routes (`/api/invoices/*`, `/api/forecast/*`, `/api/actions`).
- File uploads go to Supabase Storage and are processed by workers (OCR/normalize/journalize).
- No direct DB access from panels.

---

## Style and UX

- Panels are **floating**; they never reflow the canvas.
- Provide a compact header with: Title • Minimize • Dock (icons only).
- Respect light/dark theme; avoid hard-coded colors.
- Keep actions **idempotent**; show toasts/snackbars for async jobs.

---

## What happens at deployment time

- Feature flags may enable MFA, WebAuthn, and stricter RBAC.
- Workers are scaled; queues drain invoice batches automatically.
- Observability (Sentry/Semgrep) surfaces warnings in the Admin/Settings panel.

That’s it. If you keep to these boundaries, your panels will drop into LUCCCA with **no rework** when we merge with the full GlowyDesk shell.
