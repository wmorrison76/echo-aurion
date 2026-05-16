# Luccca · Mobile Native Build Runbook (Build 1 → Build 4)

> This runbook tells you exactly what to run on your **Mac** (Capacitor requires Xcode + Android Studio locally — neither can run inside this cloud preview).
> Each phase is self-contained; do Build 1 end-to-end before moving to Build 2.

---

## ✅ Prerequisites (one-time)

- **macOS** (required for iOS builds)
- **Xcode 15+** — free on the Mac App Store. After install, run `sudo xcode-select --install` for command-line tools.
- **CocoaPods** — `sudo gem install cocoapods`
- **Android Studio** — <https://developer.android.com/studio> (install default SDKs, accept licenses).
- **Java 17** (ships with Android Studio now).
- **Node 20+** and **Yarn** (you already use these).
- **Apple Developer account** ($99/yr) — required before Build 4 store submission. Sign up: <https://developer.apple.com/programs/>
- **Google Play Console** (one-time $25) — <https://play.google.com/console>
- Physical iPhone and Android device for real-world testing (simulators are fine for early builds).

Clone the repo onto your Mac (from Emergent's "Save to GitHub" export) and `cd` into it.

---

## 🟢 Build 1 — Foundation (Guest app installable on real phones)

### 1. Install dependencies (already done in preview — re-run locally)
```bash
yarn install --ignore-engines
```

### 2. Build the web bundle
```bash
yarn build:client
# produces dist/spa/ which Capacitor will package
```

### 3. Initialize native shells (only first time)
```bash
# Guest app
APP_VARIANT=guest npx cap add ios
APP_VARIANT=guest npx cap add android
```

> You'll see `ios/App/App.xcworkspace` and `android/` folders appear at repo root. **Commit these to git once** — Capacitor treats them as editable native projects.

### 4. Sync web → native
```bash
APP_VARIANT=guest npx cap sync
```

### 5. Generate launcher icons + splash (one-liner via `@capacitor/assets`)
```bash
yarn add -D @capacitor/assets
# Drop a 1024×1024 PNG of your Luccca gold-on-navy logo at resources/icon.png
# and a 2732×2732 splash at resources/splash.png
npx capacitor-assets generate
```

### 6. Open in the IDE and run on a device
```bash
npx cap open ios      # Xcode — select your phone → ▶ Run
npx cap open android  # Android Studio — select your phone → Run
```

The app will boot to `/guest`, auto-authenticate any room+lastname query param, and work exactly like the web PWA — but natively.

### 7. Testing deep-links (Build 1 acceptance)
Send yourself a test SMS with `luccca://guest?room=1208&last=Reed` — tapping should open the app directly into the authenticated guest home.

---

## 🟡 Build 2 — Staff companion (role-gated)

**Prerequisite:** Build 1 running on a real phone.

### 1. Rebuild as the staff variant
```bash
APP_VARIANT=staff npx cap add ios      # only first time
APP_VARIANT=staff npx cap add android  # only first time
APP_VARIANT=staff npx cap sync
npx cap open ios
```

### 2. Push notifications setup

**iOS** (in Xcode):
- Target → Signing & Capabilities → **+ Capability** → Push Notifications
- Target → Signing & Capabilities → **+ Capability** → Background Modes → check *Remote notifications*
- Apple Developer portal → Certificates → create **APNs Auth Key** (.p8) — you'll upload this to your backend in Build 4.

**Android** (Firebase console):
- <https://console.firebase.google.com> → create project "Luccca Staff" → Android app → download `google-services.json` → drop into `android/app/`
- Project settings → Cloud Messaging → copy the **Server key** — this goes into `/app/backend/.env` as `FCM_SERVER_KEY`.

### 3. Biometric unlock
```bash
yarn add -E @capacitor-community/biometric-auth
npx cap sync
```

(Code is already wired on the `/m/staff/:token` route — kicks in automatically when the plugin is present.)

---

## 🟠 Build 3 — Concierge ops tools & offline

**Prerequisite:** Build 2 staff app installed.

### 1. Add offline storage plugins
```bash
yarn add -E @capacitor/filesystem @capacitor/network
npx cap sync
```

### 2. Calendar integration for Group Events
```bash
yarn add -E capacitor-calendar
npx cap sync
```

This enables the "Add to my Calendar" button on the `/g/event/:code` attendee page — native calendar dialog on iOS/Android.

### 3. Deep-link registration
iOS: already handled by `CFBundleURLSchemes` generated in step 4 of Build 1.

Android: verify `android/app/src/main/AndroidManifest.xml` has:
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="luccca" />
</intent-filter>
```

---

## 🔴 Build 4 — CI/CD + Store submission

**Prerequisite:** Builds 1-3 all running on real phones.

### 1. Fastlane (one-time setup)
```bash
sudo gem install fastlane
cd ios/App
fastlane init        # choose "Automate iOS builds"
cd ../../android
fastlane init        # choose "Automate Android builds"
```

Copy `fastlane/Fastfile` templates from <https://docs.fastlane.tools/actions/gym/> and <https://docs.fastlane.tools/actions/supply/>.

### 2. App Store Connect
- Log into <https://appstoreconnect.apple.com>
- **My Apps → +** → create two apps:
  - "Luccca Guest" · bundle `com.luccca.guest` · category Travel
  - "Luccca Staff" · bundle `com.luccca.staff` · category Business (or keep internal via TestFlight only)
- Fill in App Privacy (iOS 17+ requires the "Privacy Nutrition Label" — we collect: contact info (email, phone, name, room), location (if user allows), identifiers (device ID for push), usage data)
- Write App Review Information (login credentials for reviewer): provide a demo guest (`Room: 1208, Last: Reed`) and demo staff token

### 3. Google Play Console
- <https://play.google.com/console> → **Create app** (×2)
- Fill Data Safety form, Target audience (18+), Content rating
- **Internal testing track** → upload `.aab` via Fastlane → add your testers' Google accounts

### 4. OTA updates (Capacitor Live Updates)
```bash
npm install -g @capacitor/live-updates-cli
capgo init          # creates capgo account + keys
```

Then after any UI change (no native code touched):
```bash
yarn build:client && capgo bundle upload
```
Your deployed apps pick up the new UI within 60 seconds.

### 5. Sentry native SDK
```bash
yarn add -E @sentry/capacitor @sentry/react
```
Wire in `client/index.tsx` using the existing `SENTRY_DSN` from `.env`.

---

## 🔐 Required credentials (gather before Build 4)

Add these to the appropriate config files (NOT to git):

```
# /app/backend/.env
APNS_KEY_ID=
APNS_TEAM_ID=
APNS_AUTH_KEY_P8=          # paste contents of AuthKey_XXX.p8 (multi-line)
FCM_SERVER_KEY=            # from Firebase console

# ios/App/App.xcconfig  (created on first build)
DEVELOPMENT_TEAM=<your 10-char Apple team ID>

# android/gradle.properties
KEYSTORE_PASSWORD=
KEY_ALIAS=luccca-upload
KEY_PASSWORD=
```

---

## 🆘 When things break

- **`pod install` fails** → `cd ios/App && pod repo update && pod install`
- **Android gradle sync fails** → Android Studio → File → Sync Project with Gradle Files, accept licenses via `yes | sdkmanager --licenses`
- **"Cannot find module @capacitor/ios"** → `yarn install --ignore-engines` (our repo pins Node 20, a few deps want 22 — `--ignore-engines` keeps peace)
- **White screen on launch** → check Xcode/Logcat console for the Vite `webDir`: should be `dist/spa`. Rebuild with `yarn build:client && npx cap sync`.
- **Deep link not opening** → verify Info.plist (iOS) or AndroidManifest.xml (Android) has the `luccca://` scheme registered.

---

## 📋 What I can do for you in the preview environment

Because this cloud container has no Xcode / Android Studio / real devices, I've delivered:
- ✅ Capacitor config + dependencies
- ✅ PWA manifest (so "Add to Home Screen" from Safari/Chrome already works as a native-feeling app)
- ✅ Module-by-module audit of what fits mobile (`/app/memory/mobile_module_audit.md`)
- ✅ Role-based backend split (general staff vs salary — see next iter)
- ✅ Deep-link handlers inside the React app (web + native)
- ✅ This runbook

You take the runbook to your Mac and execute the native-build steps. Everything the app does once installed — API calls, auth, data sync — already works because the same Vite bundle powers the web and native shells.
