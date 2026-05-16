import type { CapacitorConfig } from "@capacitor/cli";

/**
 * iter190 · Build 1 — Capacitor native shell configuration.
 *
 * Two production bundles share this codebase:
 *   - `com.luccca.guest`   — Luccca Guest (guest-facing mobile app)
 *   - `com.luccca.staff`   — Luccca Staff (role-gated staff app: general staff get limited schedule/PTO/benefits/concierge; salary gets full command centre)
 *
 * Switch bundle identity + app name per build via the APP_VARIANT env var:
 *     APP_VARIANT=guest npx cap sync
 *     APP_VARIANT=staff npx cap sync
 *
 * Until Build 4 wires Fastlane, `npx cap copy` + `npx cap sync` + `npx cap open ios|android`
 * happens on your local Mac per `memory/mobile_build_runbook.md`.
 */

const variant = (process.env.APP_VARIANT || "guest").toLowerCase();

const manifests: Record<string, { appId: string; appName: string; scheme: string; startUrl: string }> = {
  guest: {
    appId: "com.luccca.guest",
    appName: "Luccca Guest",
    scheme: "luccca",
    startUrl: "/guest",
  },
  staff: {
    appId: "com.luccca.staff",
    appName: "Luccca Staff",
    scheme: "lucccastaff",
    startUrl: "/m/staff",
  },
};

const m = manifests[variant] || manifests.guest;

const config: CapacitorConfig = {
  appId: m.appId,
  appName: m.appName,
  // Capacitor bundles the Vite `dist/spa` output into the native shell.
  webDir: "dist/spa",
  // Deep-link scheme for push/SMS/email magic links (e.g. luccca://guest?room=1208&last=Reed).
  android: {
    webContentsDebuggingEnabled: true,
    allowMixedContent: false,
    backgroundColor: "#050812",
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#050812",
    preferredContentMode: "mobile",
  },
  server: {
    // In production, set CAPACITOR_SERVER_URL to your hosted preview/production URL so the
    // native shell stays in sync with OTA-delivered Vite builds without waiting for store review.
    url: process.env.CAPACITOR_SERVER_URL || undefined,
    androidScheme: "https",
    iosScheme: "https",
    // Local dev: run `yarn dev:frontend` on your Mac, then `CAPACITOR_SERVER_URL=http://<mac-ip>:3000 npx cap run ios`
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#050812",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#050812",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
