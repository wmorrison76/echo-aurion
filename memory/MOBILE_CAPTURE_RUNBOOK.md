# How to launch the mobile waste capture

## The short version
1. On your desktop: open EchoWaste → **Capture Hub** tab
2. The **Launch on Mobile** card is at the top with a QR code
3. Scan it with your phone camera → opens `/m/waste?devAuth=1` with auth pre-unlocked
4. Tap the **🎬 Live guided** tile for real-time IMU + MediaPipe pan-speed coaching
5. (Optional) Add to Home Screen — iOS Safari: Share → Add to Home Screen; Android Chrome: menu → Install app

## Why can't I capture from desktop?
Desktop browsers don't have a real camera or motion sensor wired to the USB webcam in a way that benefits the pan-speed coaching pipeline. The 5 mobile-only tiles on the Capture Hub (🎬 Live guided, 🍽️ Buffet set, 🍴 Buffet close, 🏷️ Ground truth, 🧑‍🍳 New dish) scroll the Launch-on-Mobile card back into view on click as a gentle nudge — they're still fully operational once you're on the phone.

## Deep link URLs
- **Standalone waste capture (easiest)** — `https://cfo-toolkit-deploy.preview.emergentagent.com/m/waste`
  - Add `?devAuth=1` to skip the sign-in wall when you're testing
- **Full staff app with Waste tab** — `https://cfo-toolkit-deploy.preview.emergentagent.com/m/staff/<TOKEN>` (needs a briefing token minted via admin)
- **Floor station** — `/floor/<TOKEN>`
- **Route driver** — `/route/<TOKEN>`

## What to test for pan-speed feedback
Once in the Live guided mode, two badges appear at the top:

- **Pan speed badge** (e.g. `✓ Good pace · IMU · 18`)
  - `IMU` = phone's rotation sensor is firing (preferred; more accurate)
  - `FLOW` = falling back to optical flow (frame-diff) — works on any device with a camera, even desktop webcams
  - `—` = neither yet fired; wait a second
- **MediaPipe framing badge** (e.g. `✓ plate` or `⚠ Too close`)
  - Lazy-loads from a CDN on first use (~2MB)
  - Reports `Loading MP…` for the first second
  - If MediaPipe fails to load it shows `MP offline` and the capture still works — just no framing feedback

### Troubleshooting
- If the pan badge sticks at `Good pace · —` and never changes → the optical-flow RAF loop isn't sampling. Check that the `<video>` element is actually playing (you should see the live feed behind the badges).
- If IMU never kicks in on iOS Safari → iOS requires an explicit user gesture for `DeviceMotionEvent.requestPermission()`; the overlay will prompt on first open. If you miss the prompt, close + re-open.
- If the framing badge sticks at `Loading MP…` for >10s → MediaPipe CDN is blocked or offline; the capture itself is unaffected.

## What the capture actually does
Every snap flows through this pipeline:

```
capture                                               ≤1s preliminary (FP)
 ↓
/api/waste/capture/preliminary-from-image  ───────→  shows preview card
 ↓
/api/waste/capture/still          ┐
                                   ├─ Fingerprint-first match ≥0.94 → short-circuit (saves ~$0.02)
                                   ├─ else → Sonnet 4.5 vision (≤10s)
                                   ├─ Shadow-mode contribute a fingerprint
                                   └─ /api/waste/photo-intake (face-blur + OCR + consent snapshot)
 ↓
timeline event + waste entry + optional Forbes label + audit queue if unknown
```
