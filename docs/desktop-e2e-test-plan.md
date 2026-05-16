# Electron Desktop · End-to-End Test Plan

> **Audience:** Developer running on a personal Mac / Windows / Linux dev
> machine. The Emergent preview sandbox **cannot** run Electron — these
> tests must be executed locally.
>
> **Scope:** Every IPC bridge handler wired in iter265 + the existing D14
> panel detach plumbing.
>
> **Estimated time:** 35–45 minutes to walk the full sheet.

---

## Prerequisites

| Item | Version | Notes |
|---|---|---|
| Node.js | ≥ 20.x | `node -v` |
| pnpm | ≥ 9.x | `pnpm -v` |
| Electron | already pinned in `electron/package.json` | runs via `pnpm electron:dev` |
| Test machine | macOS 14+ · Windows 11 · Ubuntu 22.04 | record which OS each result is for |

```bash
# Clean install at the monorepo root
cd /path/to/Echo_Aurion-LUCCCA_Framework
pnpm install --frozen-lockfile
```

---

## Phase 1 — Boot the desktop shell

| # | Step | Pass criteria | Pass / fail |
|---|---|---|---|
| 1.1 | `pnpm electron:dev` | Native window opens, splash shows brand mark, no console errors | |
| 1.2 | Window title bar | Says "LUCCCA" with brand chrome (not "Vite") | |
| 1.3 | DevTools open (`Cmd/Ctrl+Shift+I`) | No CSP / preload errors. `window.__LUCCCA_NATIVE__.isElectron === true` | |
| 1.4 | Network panel | No requests to the preview host — all assets served locally | |
| 1.5 | Reload (`Cmd/Ctrl+R`) | Reloads without losing brand, returns to home dashboard | |

---

## Phase 2 — Native notifications (`os:notify`)

Trigger from DevTools console:
```js
await window.__LUCCCA_NATIVE__.notify({
  title: "Severe Weather Alert",
  body: "Tornado Warning · expires 18:45",
  urgency: "critical",
});
```

| # | Step | Pass criteria | Pass / fail |
|---|---|---|---|
| 2.1 | First call | OS-level notification appears (not in-app toast) | |
| 2.2 | macOS — Click notification | App window foregrounds | |
| 2.3 | Windows — `urgency: "critical"` | Shows in Notification Center, persists | |
| 2.4 | Linux — verify `notify-send` works | Falls back to libnotify if Electron Notification unsupported | |
| 2.5 | Real-world trigger: Fire alarm webhook | `curl -X POST /api/fire-safety/webhook ... severity: "critical"` → OS notification fires | |

---

## Phase 3 — Native printing (`os:print`)

```js
await window.__LUCCCA_NATIVE__.print(
  "<html><body><h1>BEO 1234</h1><table>…</table></body></html>",
  { silent: false, copies: 1 }
);
```

| # | Step | Pass criteria | Pass / fail |
|---|---|---|---|
| 3.1 | `silent: false` | OS print dialog opens with the HTML laid out | |
| 3.2 | `silent: true, copies: 2` | Prints 2 copies to default printer without dialog | |
| 3.3 | Chef Daily Report panel | Click "Print" → goes directly to kitchen thermal printer (if mapped) | |
| 3.4 | BEO panel | Click "Print BEO" → 2-up landscape, brand watermark | |

---

## Phase 4 — File-system actions

```js
// Open Finder/Explorer at a file
await window.__LUCCCA_NATIVE__.openFile("/Users/me/Documents/invoice.pdf");

// Save dialog
const path = await window.__LUCCCA_NATIVE__.showSaveDialog({
  defaultPath: "gm-flash-2026-05-11.pdf",
  filters: [{ name: "PDF", extensions: ["pdf"] }]
});
```

| # | Step | Pass criteria | Pass / fail |
|---|---|---|---|
| 4.1 | `openFile` to a known PDF | OS file manager opens at the file | |
| 4.2 | `openFile` to a non-existent path | Returns `{ ok: false }` gracefully, no crash | |
| 4.3 | `showSaveDialog` Cancel | Returns `null` | |
| 4.4 | `showSaveDialog` Save | Returns the chosen path | |

---

## Phase 5 — Folder watcher (`folder:watch`)

This is the killer feature for D54 invoice auto-OCR.

```js
const unsubscribe = window.__LUCCCA_NATIVE__.watchFolder(
  "/Users/me/Downloads/invoices",
  (filePath) => console.log("New invoice:", filePath)
);
```

| # | Step | Pass criteria | Pass / fail |
|---|---|---|---|
| 5.1 | Drop a PDF into the watched folder | Callback fires with full path within ≤ 2 s | |
| 5.2 | Drop 5 PDFs at once | All 5 callbacks fire | |
| 5.3 | Delete a file from watched folder | Callback does NOT fire (we only emit on add) | |
| 5.4 | Watch a non-existent folder | Returns `{ ok: false, error: ... }`, no crash | |
| 5.5 | Call `unsubscribe()` | Subsequent drops do not fire callback | |
| 5.6 | Stress: 100 files in 5 s | No memory leak, no missed events (check DevTools) | |

---

## Phase 6 — Global hotkeys (`hotkey:register`)

```js
const off = window.__LUCCCA_NATIVE__.registerHotkey(
  "CommandOrControl+Shift+E",
  () => alert("Echo summoned!")
);
```

| # | Step | Pass criteria | Pass / fail |
|---|---|---|---|
| 6.1 | Register `Cmd/Ctrl+Shift+E` | Returns `{ ok: true }` | |
| 6.2 | Press the hotkey while LUCCCA in background | Callback fires (proves OS-level capture) | |
| 6.3 | Press in another app (e.g., browser) | Callback fires AND LUCCCA window foregrounds | |
| 6.4 | Register a conflicting hotkey | Returns `{ ok: false }`, no crash | |
| 6.5 | Call `off()` | Hotkey no longer fires | |
| 6.6 | Quit the app | `globalShortcut.unregisterAll()` runs on `will-quit` (verify in logs) | |

---

## Phase 7 — Multi-monitor / display info

```js
const displays = await window.__LUCCCA_NATIVE__.getDisplays();
console.table(displays);
```

| # | Step | Pass criteria | Pass / fail |
|---|---|---|---|
| 7.1 | Single monitor | Returns `[{ primary: true, ... }]` | |
| 7.2 | Dual monitor | Returns 2 entries with `bounds` non-overlapping | |
| 7.3 | Includes `scaleFactor` | Numeric value (1 on stock, 2 on Retina, etc.) | |

---

## Phase 8 — D14 panel detach

| # | Step | Pass criteria | Pass / fail |
|---|---|---|---|
| 8.1 | Right-click a panel header → "Detach" | New native window opens with only that panel | |
| 8.2 | Drag detached window to second monitor | Stays on monitor 2 across reload | |
| 8.3 | Close detached window | Re-docks into main | |
| 8.4 | Detach 3 panels at once | All 3 windows opened, no z-index war | |

---

## Phase 9 — `useDesktop()` hook in the React app

Open `/app/client/lib/desktop/useDesktop.ts` and exercise from a component:

```tsx
const desktop = useDesktop();
if (desktop.isDesktop) {
  await desktop.notify({ title: "Hi", body: "from Electron" });
}
```

| # | Step | Pass criteria | Pass / fail |
|---|---|---|---|
| 9.1 | `desktop.isDesktop === true` in Electron | | |
| 9.2 | `desktop.isDesktop === false` in browser preview | Methods are no-ops, no errors | |
| 9.3 | `desktop.platform` | `darwin` / `win32` / `linux` | |
| 9.4 | `desktop.notify` in browser | Falls back to web Notification API | |
| 9.5 | `desktop.print` in browser | Falls back to hidden-iframe print | |

---

## Phase 10 — Auto-update (deferred)

> Auto-update via `electron-updater` is **not yet wired**. Listed here so we
> remember to test once shipped. Probable channels: GitHub Releases for
> dev, an Emergent-hosted feed for production.

---

## Production packaging smoke

```bash
# macOS
pnpm electron:pack:mac

# Windows
pnpm electron:pack:win

# Linux
pnpm electron:pack:linux
```

| # | Step | Pass criteria | Pass / fail |
|---|---|---|---|
| P.1 | mac `.dmg` artifact | < 200 MB, opens, drags to Applications | |
| P.2 | Win `.exe` artifact | NSIS installer runs, creates Start Menu entry | |
| P.3 | Linux `.AppImage` | Runs without install | |
| P.4 | First-launch UX | No firewall prompt that blocks the app | |
| P.5 | Backend connectivity | App points at `REACT_APP_BACKEND_URL` from production env | |

---

## After running the sheet

1. File a GitHub issue summarising any **failed** rows.
2. Tag with `desktop-e2e-iter265` for traceability.
3. Send the filled-out sheet back to Emergent so we can prioritize fix-ups for the next desktop release.

Last reviewed: iter265 · 2026-05-11.
