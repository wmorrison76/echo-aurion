# Claude Q&A Brief — EchoWaste Real-Time Camera Guidance + 3D + Self-Teaching

**Context:** EchoWaste is shipping a live-guided video capture UX for operator-test.
Today the chef records a short clip → we extract 6 keyframes → Claude vision returns items
per frame → best-of-N dedupe → one aggregated entry. **William wants an upgrade:**

1. **Real-time on-screen guidance** during recording: *"move closer", "slow down",
   *"pan left — I can't see the left edge"*.
2. **3D reconstruction** from the same video so the chef gets a volumetric view,
   not just 6 flat frames.
3. **Self-teaching loop**: every accepted/corrected capture feeds back into recipe
   fingerprints so EchoAi³ gets better without a manual training cycle.
4. **Hard constraint:** phone browser only (iOS Safari 16+ / Android Chrome). No
   native app shell for this test. No mocks — Claude vision is the model.

---

## Section A · Video → Frames (pipeline)

1. For a **10–30 second handheld pan** of a buffet tray, what's the optimal frame
   sampling strategy — fixed time-interval, motion-based keyframe extraction, or
   a hybrid? Give a concrete algorithm we can implement in-browser with
   `<video>` + `<canvas>`.
2. What's the best client-side signal for "this frame is blurry, skip it"?
   Laplacian variance? Tenengrad? FFT high-frequency ratio? Which one runs
   <30 ms on an iPhone 12 Safari?
3. When we have 8 candidate frames and want to pick the 6 most *diverse* (not
   just evenly spaced in time) — perceptual-hash distance? Embedding
   distance? Colour-histogram distance? Give a decision tree.
4. How should we handle **rolling-shutter distortion** on cheap Android
   cameras when the chef pans quickly? Detect + discard, or warp-correct?
5. What image resolution + JPEG quality is the lowest we can go without hurting
   Claude Sonnet 4.5 vision's ability to count small items (grapes, bagel halves)?
   We're at 1280px / 0.82 quality today — is that over-provisioned?

---

## Section B · Real-Time Camera Guidance (the big one)

**Goal:** while the chef is filming, we overlay cues on their viewfinder.
Examples: *"BACK UP — too close"*, *"HOLD STILL"*, *"PAN RIGHT"*.

6. What's the best **on-device (no server) signal** for "camera too close"
   vs "too far"? Apparent object size from a lightweight ONNX model? EXIF
   focus distance? Depth map from ARKit/WebXR if available? Rank by
   latency + accuracy on iOS Safari.
7. For **motion speed** (is the chef panning too fast?), compare:
   (a) consecutive-frame optical flow magnitude,
   (b) device IMU (`DeviceMotionEvent`),
   (c) inter-frame perceptual hash delta.
   Which is most reliable across iOS + Android browsers? What about
   users who don't grant motion-sensor permission?
8. For **out-of-frame detection** (chef's cropping a muffin out the edge),
   do we need full object-detection (YOLOv8-n WebGL?) or can we get away with
   a smaller model (MediaPipe Objectron, TFLite MobileNet-v3 SSD)? What
   model + lib combination loads in <2 MB + runs ≥10 fps on a 2021 phone?
9. Should we pipeline **every Nth frame to Claude during recording** for
   high-accuracy guidance (expensive but smart), or stay 100% on-device and
   only call Claude once at the end? Give a hybrid schedule.
10. What's the **UX priority order** when multiple guidance cues fire at
    once — e.g., chef is simultaneously too close AND moving too fast?
    Which cue interrupts first? Reference any known research on
    guided-capture UX (Scandit, Anyline, Google Lens).
11. How do we **calibrate "too close"** for different item sizes? The rule
    for a bagel (show at least 300 px of tray) is wrong for a grape (need
    closer). Can we bootstrap off `waste_suggested_recipes.portion_g`?

---

## Section C · On-Screen Overlay Design

12. Arrow indicators vs. textual prompts vs. viewfinder colour-shift vs.
    haptic pulse — which has the fastest chef-compliance in kitchen lighting
    with oily phone screens and gloved hands?
13. For the **out-of-frame** cue, is a red edge-glow (show the edge they
    cropped) more useful than a directional arrow? Any research?
14. We want the overlay to **never block the food itself**. Should we:
    (a) reserve safe zones at top + bottom,
    (b) dynamically find empty background regions,
    (c) draw in the corners with a translucent chip?
15. What's the accessible colour palette for guidance cues that reads in
    bright kitchen light AND dim walk-in freezer? We're locked to the
    EchoAi³ gold/purple brand.
16. Voice coaching layer — is *"move closer"* via `SpeechSynthesis`
    actually useful in a noisy kitchen, or distracting? Any A/B data?

---

## Section D · 3D Reconstruction from Handheld Video

17. For a 10-second handheld pan (≈30° of angular coverage), what's the
    realistic 3D output quality from:
    (a) COLMAP structure-from-motion (offline),
    (b) Gaussian Splatting (newer, needs more frames),
    (c) NeRF (heavy, probably overkill),
    (d) simple RGBD if ARKit/WebXR depth is available?
    Rank by (fidelity × speed × on-mobile feasibility).
18. Can we get usable depth from **single-camera iOS Safari** without ARKit
    native access? MediaPipe Depth? MiDaS-Lite ONNX? Real-world latency.
19. What's the **minimum** set of frames + angles needed for a "good enough"
    volumetric estimate of pan contents (for leftover-volume calculations)?
20. For the **leftover volume → cost** conversion, do we need absolute metric
    scale or just relative? If relative, what reference object in the
    frame can we auto-anchor (steam-table pan corner = known 12″×20″)?
21. Should 3D reconstruction be real-time or deferred (upload video →
    server reconstruction → async result)? Worst-case acceptable latency
    for chef workflow.

---

## Section E · Food Recognition + Self-Teaching Loop

22. Today Claude returns `recipe_id` from our catalog OR
    `suggested_recipes[]` for unknowns. To **self-teach** from every
    capture, what do we store per successful identification:
    multi-view embeddings (CLIP? DINOv2?), HSV histograms, texture
    signatures, volume estimates? What combination is smallest + most
    discriminative?
23. For the **embedding store**, HNSW in-memory vs. pgvector vs. a
    purpose-built index — given we're on MongoDB already, is Atlas Vector
    Search enough, or do we need to bolt on something?
24. How do we handle **recipe drift** (the "fruit salad" on Monday is
    different from Friday's)? Version the fingerprint? Sliding-window
    centroid?
25. When Claude says 95% confident and the chef corrects the item, that's
    gold training data. What's the right **delay before promoting** a
    correction to the live catalog — first correction, 3 corrections,
    chef-confirmed-twice? Research-backed threshold?
26. Can we train a **tiny on-device classifier** against the top-20
    recipes this outlet uses, run it before calling Claude, and short-
    circuit the vision round-trip when confidence is >0.9? TensorFlow
    Lite micro on WebGL?
27. How does the **self-teaching loop prevent cascading errors**? If
    Claude was wrong once and we auto-propagated, the error compounds.
    What's the best known pattern (human-in-the-loop gating, shadow
    mode, canary)?

---

## Section F · Production constraints

28. **Claude Sonnet 4.5 vision rate limits** + typical cost for a 6-frame
    capture at 1280px — what's realistic throughput in a 200-cover lunch
    with 5 stations? When do we hit rate limits?
29. Are there **lower-cost vision models** (Claude Haiku 4.5 vision,
    GPT-4o-mini, Gemini 3 Flash) good enough for the **guidance** path
    (fast, cheap, coarse) while we keep Sonnet 4.5 for the final scan?
30. Privacy: some phones surface employee faces. What's the cheapest on-
    device face-blur we can apply **before** uploading frames to Claude?
    MediaPipe FaceDetector?
31. Offline mode: if the chef's tablet drops off WiFi mid-service, how do
    we queue video blobs (not just frames) for later upload? IndexedDB
    can hold ~2 GB; is there a better pattern?

---

## Section G · Rollout / Evaluation

32. Design the **A/B framework** for "with guidance overlay" vs
    "without" — metrics: capture success rate, items-per-capture, chef
    time-per-capture, correction rate. Sample size for 95% CI?
33. What's the **failure mode we should monitor most** in the first 24 hours
    — frames uploaded with no items? Spurious objects (Claude hallucinating
    a plate that isn't there)? Count mismatches?
34. Recommend a **one-pager spec layout** for a chef training doc — what's
    in scope, out of scope, what the guidance cues mean in plain English.

---

## 🎯 Claude: the answer format we need

For each question, give us:
- **Bottom-line recommendation** (1 line)
- **Why** (3 lines max, with citations/links when they exist)
- **Implementation hint** (1 line — library, model, API signature)
- **Risks** we should track

Mark anything you're <70% confident about with `⚠`. If a question assumes
something wrong, push back. Batch related questions if it makes the answer
clearer. Total output ≤ 6,000 words.

---

*This brief is authored by E1 for William / EchoAi³, Feb 2026. Hand it to
Claude as a single prompt.*
