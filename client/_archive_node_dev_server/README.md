# Archive · Legacy Node Express Dev-Server Routes

**Archived:** 2026-05-11 (iter 5.5)
**Reason:** preview-server.mjs + FastAPI backend now serve production. These
express routes belonged to the legacy LUCCCA Node dev-server runtime that
was retired when supervisor was swapped to `node preview-server.mjs` and
`/api/*` was rerouted to the FastAPI backend.

## What's here

Nine modules' worth of `server/` directories (~454 `.ts` files):

| module | route count | what it did |
|--------|------------:|-------------|
| `Culinary` | many | recipes / inventory / elevenlabs / crawler |
| `EchoAurum` | many | P&L / forecasting |
| `EchoCanvasStudio` | a few | canvas studio backend |
| `EchoEventStudio` | many | event studio / supabase / camera bookmarks / BEO export |
| `EchoLayout` | a few | layout backend |
| `MixologySommelier` | a few | mixology backend |
| `Pastry` | many | pastry-specific routes |
| `PurchasingReceiving` | many | invoices / vendors / white-label |
| `Schedule` | a few | schedule backend |

## How they used to work

The legacy LUCCCA monorepo shipped a Vite dev-server that booted these
express routes alongside the React app. Production now goes through:

```
preview-server.mjs   (Node static SPA + /api/* proxy)
  └── /api/*  →  FastAPI backend (port 8001)
                   └── /app/backend/routes/*.py
```

No client code imports any of these `.ts` files in production builds —
verified by `grep -rn "from.*server/routes"` returning zero hits in
the production tree.

## Restoring a route

If a route is genuinely needed in production:
1. Port it to a FastAPI router under `/app/backend/routes/`
2. Register in `/app/backend/server.py`
3. Add a frontend fetch call to the new `/api/...` URL

**Do not** re-introduce the Node express runtime — it would conflict with
preview-server.mjs's port 3000 binding.

## Why we archived instead of deleting

- Git history is preserved.
- Code is still discoverable for porting reference.
- A grep across `_archive_node_dev_server/` won't pollute IDE search of
  active code paths.
