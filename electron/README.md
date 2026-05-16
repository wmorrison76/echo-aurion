# LUCCCA ECW · Electron Desktop & White-Label Packaging

Ships the React/Vite client as a native desktop app (DMG on macOS, NSIS on
Windows, AppImage on Linux) with partner-swappable branding via `brand.json`.

Scope: MVP scaffolding · safe to re-brand and rebuild · no code signing yet.

## Dev

```bash
# Terminal 1 — Vite dev server on :3000 (already running in pod)
yarn dev

# Terminal 2 — Electron window pointing at dev server
yarn electron:dev
```

`yarn electron:start` runs the packaged build (after `yarn electron:pack`).

## Install build tooling (one-time on your workstation)

```bash
yarn add -D electron electron-builder
```

> These are intentionally **not** installed in the Kubernetes pod — they'd
> bloat the container. Install locally on your Mac/PC to produce installers.

## Package

```bash
yarn electron:pack            # current platform
yarn electron:pack:mac        # produce .dmg
yarn electron:pack:win        # produce .exe (nsis)
yarn electron:pack:linux      # produce .AppImage
```

Output lands in `/app/electron-dist/`.

## White-label (per-partner rebrand)

1. **Copy `electron/brand.json` → `electron/brand-{partner}.json`** and edit:

   ```json
   {
     "brand": "ACME",
     "productName": "ACME Kitchen OS",
     "tagline": "Smarter hospitality",
     "primaryColor": "#0ea5e9",
     "supportEmail": "support@acme.com",
     "aboutUrl": "https://acme.com"
   }
   ```

2. **Swap brand.json before packaging**:

   ```bash
   cp electron/brand-acme.json electron/brand.json
   # Also update electron-builder.json:
   #   "appId": "com.acme.kitchen-os"
   #   "productName": "ACME Kitchen OS"
   yarn electron:pack:mac
   ```

3. **Replace icon assets** under `electron/assets/`:
   - `icon.png` (512×512 app icon)
   - `logo.png` (used in splash + about)
   - `splash.png` (optional splash screen)

4. **Read brand in the React app**:

   ```tsx
   const brand = (window as any).__LUCCCA_NATIVE__?.brand;
   const productName = brand?.productName ?? "LUCCCA ECW";
   const primary = brand?.primaryColor ?? "#c8a97e";
   ```

   The `preload.js` script exposes `window.__LUCCCA_NATIVE__` safely to the
   renderer so the UI can re-style at runtime.

## Code-signing (future)

- **macOS**: `electron-builder.json` → `mac.identity` + notarize creds via
  env vars `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID`.
- **Windows**: pass `CSC_LINK` + `CSC_KEY_PASSWORD` for the `.pfx` cert.

## Auto-update (future)

Add `electron-updater` + set `publish.provider = "generic"` in
`electron-builder.json` pointing at a partner's CDN.

## iPhone native app (deferred)

Capacitor scaffold already present (`/app/client/capacitor.config.ts`).
Build IPA:

```bash
npx cap sync ios
open ios/App/App.xcworkspace
# Xcode → Archive → Distribute via TestFlight
```

Requires Apple Developer account ($99/yr) and Team ID.
