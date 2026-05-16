# Desktop + Offline Smoke Test

Last updated: D15 (this PR).

This is the manual smoke checklist before shipping a new desktop build
or after touching `electron/`, `public/service-worker.ts`, or
`shared/mobile/offline-data-queue.ts`. The first three sections are
verifiable in any browser; the fourth requires a packaged Electron
artifact.

## What's wired today

| Layer | Status | File |
|---|---|---|
| Electron shell (mac/win/linux) | scaffold, builds | `electron/main.js`, `electron-builder.json` |
| PWA manifest (`display: standalone`) | shipped | `public/manifest.json` |
| Service worker (network-first API, cache-first static) | shipped | `public/service-worker.ts` |
| Offline write queue (IndexedDB) | shipped | `shared/mobile/offline-data-queue.ts` |
| Online/offline auto-resync | shipped | `offline-data-queue.ts:357` |
| **Server sync drain** | **D15 — shipped this PR** | `backend/routes/mobile_sync.py` |
| Native multi-window detach | scaffold (D14 next) | `electron/main.js`, `FloatingPanel.tsx` |

Until D15 the client queued writes for `/api/mobile/sync` but the
endpoint did not exist — every offline write was silently lost on
reconnect. That's now closed.

## Smoke 1 — Server sync drain (CI-runnable)

```bash
# In one terminal, start the backend.
yarn dev:server

# In another, drive the queue end-to-end.
python3 scripts/smoke/mobile_sync_smoke.py
```

The script does what an offline client would do:
1. POSTs a batch with `create` / `update` / `delete` ops
2. Asserts the server applied them (collections updated)
3. Asserts conflicts are flagged when the server doc is newer
4. Asserts disallowed entity_types fail gracefully (allowlist works)

Six assertions, all green = sync drain is healthy.

## Smoke 2 — Service worker offline cache (browser, manual)

1. `yarn dev` and load the app in Chrome
2. DevTools → Application → Service Workers — confirm
   `service-worker.js` is **activated and running**
3. DevTools → Application → Cache Storage — confirm `luccca-v1.0.x`
   has the critical assets (`/`, `/index.html`, `/manifest.json`)
4. Network tab → check **Offline** → reload the page
5. App shell should still render. Static assets come from cache;
   API calls return cached responses where available, queued
   otherwise.
6. Uncheck **Offline** — within ~3 seconds the queue should drain
   to `/api/mobile/sync` (visible as one POST in the Network tab).

## Smoke 3 — IndexedDB queue persistence (browser, manual)

1. With service worker registered, perform an action that calls
   `OfflineDataQueue.enqueue(...)` — e.g. submit a PTO request from
   MyEcho while offline
2. DevTools → Application → IndexedDB → `hospitality-os` →
   `operations` — confirm the row appears with `status: "pending"`
3. Close the tab. Reopen. Confirm the row is still there.
4. Toggle network back online. Within ~3 seconds the row should
   transition to `status: "synced"` and `synced_at` is populated.

## Smoke 4 — Electron desktop build (CI artifact)

```bash
# Build the renderer + package
yarn build
yarn electron:pack:mac     # or :win / :linux
```

Manual checks on the packaged artifact:
1. Double-click the `.dmg` / `.exe` / `.AppImage` — app launches
   into its own OS window (not a browser tab)
2. Window title bar shows the brand from `electron/brand.json`
3. **Move to a second monitor** — the app moves with the window
   manager (this is OS-native multi-monitor; no special code needed)
4. Disconnect Wi-Fi. Submit a PTO request. App should accept and
   queue it (visible "saved offline" toast — UI work tracked in D14)
5. Reconnect. The queued PTO request should drain to the server
   within seconds; verify in the database

## Known gaps tracked in other items

- **D14** — Pop-out individual panels into separate native OS windows
  (not just one app window). Drag-to-second-monitor at the *panel*
  level. Requires Electron `BrowserWindow` IPC bridge + UI button on
  every floating panel.
- **D13** — Third-party module loader. Today's framework only toggles
  internal modules on/off; loading a partner-built module from a
  manifest URL is not yet supported.

## What "passing" means

- Smoke 1 must pass in CI (run the python script in `scripts/smoke/`)
- Smokes 2–3 are manual browser checks before each release
- Smoke 4 is run on each platform before publishing the desktop build
