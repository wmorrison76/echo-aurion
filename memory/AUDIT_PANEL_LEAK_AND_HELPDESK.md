# Recovered-branch audit · 2026-05-11

Audit of `chore/preview-swap-and-shell-integration` in the running `/app/` pod, covering the two William-reported gaps:

1. Panels from the previous profile show up after switching users
2. Help-file + icon work from prior sessions not visible

## TL;DR

| Gap | Status | What I did |
|---|---|---|
| Profile-switch panel leak | ✅ **FIXED** (commit `7bd5c05e2`) | Reconstructed `clearAllPanelPersistence()` + wired it into `switchTo()` / `handleLogout()` |
| HelpDesk pill missing from shell | ✅ **FIXED** (same commit) | Mounted `LazyHelpDesk` in `AppFull.tsx` at top:24/right:270 |
| GuideOverlay never triggers | ✅ **FIXED indirectly** | HelpDesk's "Start guided steps" button dispatches `guide:start` event that GuideOverlay already listens for |
| `EchoHelpOrb` orphaned | ⚠ deferred | Only referenced by `echo-help.register.ts` which itself has zero imports |
| `ContextHelpTooltip` orphaned | ⚠ deferred | Same as above |
| `echo-help.register.ts` orphaned | ⚠ deferred | Zero imports anywhere — never gets executed |
| `assets/help_desk.png` (underscore) | ⚠ deferred | 0 refs vs the hyphen variant `help-desk.png` (14 refs) — duplicate, awaiting William's OK to delete |

## Detail: the panel-leak fix

**Root cause:** Neither `clearAllPanelPersistence()` nor any call to it existed in the local working tree. The MCP-pushed commits described in the previous handoff hadn't been replayed into this pod. `panel-persistence.ts` had only `clearPersistedPanelState()` (synchronous, localStorage-only) and `UserAvatarMenu.tsx`'s `switchTo()` + `handleLogout()` reloaded without calling any clear.

**What was added:**

```ts
// client/lib/panel-persistence.ts
export async function clearAllPanelPersistence(): Promise<void> {
  // Layer 1 — localStorage (panel-host-state, sticky-notes-positions,
  //   plus the three legacy open/positions/sizes keys).
  clearPersistedPanelState();
  try { localStorage.removeItem("sticky-notes-positions"); } catch {}

  // Layer 2 — IndexedDB "luccca-panel-storage"
  //   object stores "panel-state" + "sticky-notes-positions" cleared.
  // Bounded by a 1.5s timeout so the caller redirect/reload never hangs.
  await new Promise<void>((resolve) => { /* IDB clear + timeout */ });
}
```

```ts
// client/components/site/UserAvatarMenu.tsx
import { clearAllPanelPersistence } from "@/lib/panel-persistence";

// switchTo() dev path
await clearAllPanelPersistence();
window.location.reload();

// switchTo() JWT path
await clearAllPanelPersistence();
window.location.reload();

// handleLogout()
await clearAllPanelPersistence();
window.location.href = "/login";
```

**How to verify (William, in the preview URL):**
1. Sign in as user A → open 4-5 panels → reload (panels persist — expected).
2. Avatar menu → switch profile to user B → after reload, **zero panels**.
3. DevTools → Application → IndexedDB → `luccca-panel-storage` → `panel-state` → should be empty.
4. DevTools → Application → Local Storage → `panel-host-state` should not exist.

**Tradeoff:** A's layout does not survive a switch to B. Per-profile persistence (scoping every key by user id) is a separate, larger change.

## Detail: HelpDesk recovery

**Root cause:** `HelpDesk.tsx` was only imported by `client/components/site/Header.tsx` which is the EchoCoder/developer route. `client/AppFull.tsx` (the LUCCCA shell) doesn't render `Header`. Result: end users never saw the 💡 pill, the search rail, or the "Start guided steps" trigger.

**What was added in `AppFull.tsx`:**

```tsx
const LazyHelpDesk = safeLazy(() => import("@/components/site/HelpDesk"), "HelpDesk");

// Mounted just left of the theme toggle:
<div style={{ position: "fixed", top: 24, right: 270, zIndex: 2147483647 }}
     data-testid="helpdesk-mount">
  <Suspense fallback={null}>
    <LazyHelpDesk />
  </Suspense>
</div>
```

**Verified:**
- 💡 pill renders at top:24 / right:270 with a clickable button (Playwright probe).
- Click → Radix Dialog opens with: `Help & Support · Ask Echo AI · Start guided steps · Select a help article on the left. · Role: viewer. Developer-only articles are hidden from end users. · Close`
- Built bundle ships the `clearAllPanelPersistence` export in two chunks: `panel-persistence-DaJXEuvi.js` (export) + `UserAvatarMenu-CarWJkaF.js` (caller).

**GuideOverlay bonus:** It was already wired in `AppFull.tsx:306` listening for window event `guide:start`. With HelpDesk now mounted, the "Start guided steps" button inside HelpDesk dispatches that event and triggers the overlay. The pair are now functionally connected.

Screenshots: `/app/test_reports/screenshots/70-shell-with-helpdesk.png` and `71-helpdesk-dialog.png`.

## Detail: still-orphaned components (deferred, awaiting William's call)

### 1. `client/builder/components/EchoHelpOrb.tsx`
- 0 user-facing renders. Only file-internal usage. Lives under `client/builder/`, suggesting a developer-tool surface, not LUCCCA shell.

### 2. `client/builder/components/ContextHelpTooltip.tsx`
- Same: only referenced inside `client/builder/echo-help.register.ts`.

### 3. `client/builder/echo-help.register.ts`
- Zero imports anywhere in `client/`. The file declares help-registration logic but is never executed. Likely intended to be imported on app boot.

**Recommendation:** Read the file's commit message (William can do this), then either (a) import it from `AppFull.tsx` boot so it executes, or (b) accept that the builder/help-register pattern is for the developer route and delete the file. Don't ship to production users blind.

### 4. `assets/help_desk.png` vs `assets/help-desk.png`
- `help-desk.png` (hyphen): 14 references — actively used.
- `help_desk.png` (underscore): 0 references — duplicate.
- Safe to delete, but waiting on William's OK because the asset folder structure suggests it might be referenced by a non-`client/` path (build script, public folder, brand kit).

## Sidebar icons — current state

`client/components/site/Sidebar.tsx:101` has a load-bearing comment:

> `// No external icon URLs (builder.io removed) – use Lucide icons only so panels load reliably.`

Every nav item uses a Lucide icon today. If William sees specific sidebar entries missing icons, **paste the entry IDs** and I'll wire the closest Lucide replacement. The PNG assets in `assets/*` are for non-sidebar surfaces (currency, nutrition, R&D, help-desk pill, branding).

## Files referenced

| File | Status |
|---|---|
| `client/lib/panel-persistence.ts` | ✅ extended with `clearAllPanelPersistence()` |
| `client/components/site/UserAvatarMenu.tsx` | ✅ wired (3 call sites) |
| `client/AppFull.tsx` | ✅ `LazyHelpDesk` mounted |
| `client/components/site/HelpDesk.tsx` | ✅ unchanged, now reachable |
| `client/components/echo/GuideOverlay.tsx` | ✅ unchanged, now triggerable via HelpDesk |
| `client/builder/components/EchoHelpOrb.tsx` | ⚠ still orphan |
| `client/builder/components/ContextHelpTooltip.tsx` | ⚠ still orphan |
| `client/builder/echo-help.register.ts` | ⚠ still orphan |
| `assets/help_desk.png` (underscore variant) | ⚠ still orphan |

## Commit

`7bd5c05e2` on branch `chore/preview-swap-and-shell-integration`. Push via "Save to GitHub" to land on PR #71.
