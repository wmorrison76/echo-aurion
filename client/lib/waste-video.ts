/**
 * iter215 · Client-side video → frame extraction for EchoWaste MOT
 *
 * The mobile camera records a short video (native camera UI via
 * `<input type="file" accept="video/*" capture="environment">`). We decode it
 * in-browser, pull N evenly-spaced keyframes as JPEG base64, and POST them to
 * `/api/waste/capture/video-mot`. No mocks — this path uses the real Claude
 * Sonnet 4.5 vision LLM via the backend.
 *
 * Why not live streaming? iOS Safari blocks getUserMedia in saved-to-homescreen
 * PWAs + requires HTTPS + user gesture. File-picker with capture=environment
 * works on every phone we care about for the operator test.
 */
export type ExtractedFrame = {
  frame_index: number;
  timestamp_ms: number;
  image_base64: string;       // data:image/jpeg;base64,...
};

export type FrameExtractOptions = {
  targetFrames?: number;       // default 6 (will cap at video length)
  maxWidth?: number;           // downscale — default 1280
  jpegQuality?: number;        // default 0.82
  onProgress?: (pct: number, msg: string) => void;
};

export async function extractFrames(
  file: File,
  opts: FrameExtractOptions = {},
): Promise<{ frames: ExtractedFrame[]; duration_ms: number; width: number; height: number }> {
  // iter223 · Raised default 6 → 10 for higher frame coverage at faster pans
  // (William: "increase frame rate detect at higher speeds")
  const targetFrames = opts.targetFrames ?? 10;
  const maxWidth = opts.maxWidth ?? 1280;
  const quality = opts.jpegQuality ?? 0.82;
  const progress = opts.onProgress ?? (() => undefined);

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  // iOS quirk — must be attached to DOM for some versions to decode
  video.style.position = "fixed";
  video.style.left = "-9999px";
  document.body.appendChild(video);

  try {
    progress(5, "Loading video…");
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("video load failed"));
      setTimeout(() => reject(new Error("video load timeout")), 20000);
    });

    const duration = (video.duration || 0) * 1000;        // ms
    const w0 = video.videoWidth || 640;
    const h0 = video.videoHeight || 480;
    const scale = w0 > maxWidth ? maxWidth / w0 : 1;
    const W = Math.round(w0 * scale);
    const H = Math.round(h0 * scale);

    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d not supported");

    // Evenly spaced timestamps; include first + last
    const times = [] as number[];
    if (duration > 250 && targetFrames > 1) {
      for (let i = 0; i < targetFrames; i++) {
        // Avoid t=0 (many devices return a black frame) — start at 5%
        const t = (duration * (0.05 + (0.90 * i) / (targetFrames - 1))) / 1000;
        times.push(Math.max(0.1, t));
      }
    } else {
      times.push(0.1);
    }

    const frames: ExtractedFrame[] = [];
    let idx = 0;
    for (const t of times) {
      progress(10 + (idx / times.length) * 80, `Sampling frame ${idx + 1}/${times.length}`);
      await seekTo(video, t);
      ctx.drawImage(video, 0, 0, W, H);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      frames.push({
        frame_index: idx,
        timestamp_ms: Math.round(t * 1000),
        image_base64: dataUrl,
      });
      idx += 1;
    }
    progress(95, "Packaging frames");
    return { frames, duration_ms: Math.round(duration), width: W, height: H };
  } finally {
    video.src = "";
    try { document.body.removeChild(video); } catch { /* already gone */ }
    URL.revokeObjectURL(url);
  }
}

function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`seek timeout @${t.toFixed(2)}s`)), 5000);
    const done = () => { clearTimeout(timer); video.removeEventListener("seeked", done); resolve(); };
    video.addEventListener("seeked", done, { once: true });
    // iOS needs a tiny play/pause kick on some versions to prime the decoder
    try { video.currentTime = t; } catch (e) { clearTimeout(timer); reject(e); }
  });
}


// ═══════════════════════ iter217 · LIVE CAMERA + IMU GUIDANCE ═══════════════
/**
 * Live-camera capture (getUserMedia) with IMU pan-speed guidance.
 *
 * Why: the strategic direction (CLAUDE_STRATEGIC_DIRECTION.md) wants
 *      "too fast / too slow / out of frame" real-time coaching. Native file
 *      picker doesn't give us live frames. getUserMedia does.
 *
 * Graceful degrade: if getUserMedia is unavailable (iOS PWA, insecure origin,
 * denied permission), callers fall back to the existing file-picker path.
 */
export type LiveCameraHandle = {
  stream: MediaStream;
  video: HTMLVideoElement;
  stop: () => void;
  captureFrame: (opts?: { maxWidth?: number; jpegQuality?: number }) => string;
  attachPanGuidance: (cb: PanGuidanceCallback) => () => void;
};

export type PanSpeedLevel = "still" | "good" | "too_fast";
export type MotionSource = "imu" | "optical_flow" | "none";
/** iter223 · MediaPipe-derived framing signal.
 *   "unknown" = detector still loading or unavailable (iOS Safari without
 *   ObjectDetector support). UI should treat unknown as "don't block". */
export type FramingLevel = "too_far" | "good" | "too_close" | "nothing" | "unknown";
export type FrameQuality = {
  in_frame: boolean;              // approximate — based on brightness variance
  pan_speed: PanSpeedLevel;
  pan_speed_dps: number;          // approximate (deg/s when IMU, frame-diff-score when optical flow)
  too_dark: boolean;
  source: MotionSource;           // iter220 · tells UI whether IMU or optical-flow is driving the badge
  raw_score?: number;             // iter220 · optical-flow mean-abs-diff (0..1) for debug
  framing?: FramingLevel;         // iter223 · MediaPipe ObjectDetector framing cue
  framing_coverage?: number;      // iter223 · bbox area / frame area (0..1)
  framing_object?: string | null; // iter223 · top detected category (debug)
};
export type PanGuidanceCallback = (q: FrameQuality) => void;

export async function openLiveCamera(opts: {
  facingMode?: "environment" | "user";
  maxWidth?: number;
} = {}): Promise<LiveCameraHandle> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("getUserMedia not supported");
  }
  const facingMode = opts.facingMode ?? "environment";
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: facingMode },
             width: { ideal: opts.maxWidth ?? 1280 } },
    audio: false,
  });
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  await video.play();

  let stopped = false;
  const motionHandlers: Array<(e: DeviceMotionEvent) => void> = [];

  function stop() {
    if (stopped) return;
    stopped = true;
    stream.getTracks().forEach(t => t.stop());
    motionHandlers.forEach(h => window.removeEventListener("devicemotion", h));
    motionHandlers.length = 0;
    try { video.pause(); video.srcObject = null; } catch { /* noop */ }
  }

  function captureFrame(co: { maxWidth?: number; jpegQuality?: number } = {}): string {
    const maxW = co.maxWidth ?? 1280;
    const q = co.jpegQuality ?? 0.82;
    const w0 = video.videoWidth || 640;
    const h0 = video.videoHeight || 480;
    const scale = w0 > maxW ? maxW / w0 : 1;
    const W = Math.round(w0 * scale);
    const H = Math.round(h0 * scale);
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, W, H);
    return canvas.toDataURL("image/jpeg", q);
  }

  function attachPanGuidance(cb: PanGuidanceCallback): () => void {
    // iter220 · Two parallel motion sources:
    //   1. IMU (DeviceMotionEvent.rotationRate)  — mobile with motion sensor
    //   2. Optical flow (frame-diff)             — any device with a camera
    // iter223 · Third signal layered on top:
    //   3. MediaPipe ObjectDetector (2Hz)        — too_far / too_close / nothing
    // Optical flow ALWAYS runs (so desktop + iOS-without-permission still work).
    let lastIMU_ts = 0;
    let lastIMU_dps = 0;
    let opticalPrev: Uint8ClampedArray | null = null;
    let framing: FramingLevel = "unknown";
    let framing_coverage = 0;
    let framing_object: string | null = null;
    let detector: any = null;
    let detectorBusy = false;
    let lastDetTs = 0;
    let lastEmit: FrameQuality = {
      in_frame: true, pan_speed: "good", pan_speed_dps: 0,
      too_dark: false, source: "none", framing: "unknown",
    };

    // iter223 · Lazy-load MediaPipe detector. On iOS Safari or any device
    // without ObjectDetector support this will resolve to null — the framing
    // signal stays "unknown" and the UI treats it as "don't block".
    loadObjectDetector().then((d) => { detector = d; });

    // IMU binding — non-blocking, may fail silently
    try {
      const DME: any = (globalThis as any).DeviceMotionEvent;
      const onMotion = (e: DeviceMotionEvent) => {
        const rr: any = (e as any).rotationRate || {};
        const alpha = Math.abs(rr.alpha || 0);
        const beta = Math.abs(rr.beta || 0);
        const gamma = Math.abs(rr.gamma || 0);
        const dps = Math.max(alpha, beta, gamma);
        // Ignore phantom events that never change
        if (dps === 0 && lastIMU_dps === 0 && lastIMU_ts > 0) return;
        lastIMU_ts = Date.now();
        lastIMU_dps = dps;
      };
      const bind = () => {
        window.addEventListener("devicemotion", onMotion);
        motionHandlers.push(onMotion);
      };
      if (DME && typeof DME.requestPermission === "function") {
        // iOS 13+ — fire-and-forget; if granted, it'll bind
        DME.requestPermission().then((perm: string) => {
          if (perm === "granted") bind();
        }).catch(() => { /* optical flow keeps going */ });
      } else if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
        bind();
      }
    } catch { /* optical flow path unaffected */ }

    // Optical-flow RAF loop — runs on every browser
    const flowCanvas = document.createElement("canvas");
    flowCanvas.width = 64; flowCanvas.height = 48;
    const flowCtx = flowCanvas.getContext("2d", { willReadFrequently: true } as any);
    let rafId: number | null = null;
    let lastFlowSample = 0;

    function tick() {
      if (stopped) return;
      rafId = requestAnimationFrame(tick);
      const now = performance.now();
      if (now - lastFlowSample < 140) return;    // ~7 Hz
      lastFlowSample = now;
      if (!flowCtx || !video.videoWidth) return;

      try {
        flowCtx.drawImage(video, 0, 0, 64, 48);
        const cur = flowCtx.getImageData(0, 0, 64, 48).data;
        let score = 0;
        if (opticalPrev && opticalPrev.length === cur.length) {
          let sum = 0;
          for (let i = 0; i < cur.length; i += 4) {
            const l0 = 0.299 * opticalPrev[i] + 0.587 * opticalPrev[i + 1] + 0.114 * opticalPrev[i + 2];
            const l1 = 0.299 * cur[i] + 0.587 * cur[i + 1] + 0.114 * cur[i + 2];
            sum += Math.abs(l1 - l0);
          }
          const n = cur.length / 4;
          score = sum / (n * 255);         // 0..1
        }
        // Save current for next frame
        opticalPrev = new Uint8ClampedArray(cur);

        // Decide source
        const imuFresh = (Date.now() - lastIMU_ts) < 1500 && lastIMU_ts > 0;
        let source: MotionSource;
        let dps: number;
        let level: PanSpeedLevel;
        if (imuFresh) {
          source = "imu";
          dps = lastIMU_dps;
          level = dps < 4 ? "still" : dps > 30 ? "too_fast" : "good";
        } else {
          source = opticalPrev ? "optical_flow" : "none";
          // Empirically-tuned thresholds: mean-abs-diff < 0.005 = still,
          //   0.005..0.04 = good, > 0.04 = too fast. (Measured on a typical
          //   1080p phone camera at 64×48 downsample.)
          level = score < 0.005 ? "still" : score > 0.04 ? "too_fast" : "good";
          dps = Math.round(score * 1000);   // exposed as "arbitrary unit" for debug
        }
        const q = quickFrameQuality(video);

        // iter223 · MediaPipe framing probe at ~2Hz (expensive — don't run
        // on every tick; only when detector loaded + not already running)
        if (detector && !detectorBusy && (now - lastDetTs) > 500 && video.videoWidth > 0) {
          lastDetTs = now;
          detectorBusy = true;
          // Detector expects an HTMLVideoElement — fire-and-forget, resolve
          // to cached values on next emit cycle
          try {
            const res = detector.detect(video);
            const f = classifyFraming(res, video.videoWidth, video.videoHeight);
            framing = f.level;
            framing_coverage = f.coverage;
            framing_object = f.top_object;
          } catch { /* keep last */ }
          detectorBusy = false;
        }

        lastEmit = {
          in_frame: q.in_frame, too_dark: q.too_dark,
          pan_speed: level, pan_speed_dps: dps, source,
          raw_score: Number(score.toFixed(4)),
          framing, framing_coverage, framing_object,
        };
        cb(lastEmit);
      } catch { /* non-fatal — keep trying */ }
    }
    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      motionHandlers.forEach(h => window.removeEventListener("devicemotion", h as any));
      motionHandlers.length = 0;
    };
  }

  return { stream, video, stop, captureFrame, attachPanGuidance };
}

/** Fast sample of a few pixels to compute mean brightness.
 *  Returns brightness 0..255 and in_frame bool (heuristic: variance > 8). */
function quickFrameQuality(video: HTMLVideoElement): { in_frame: boolean; too_dark: boolean } {
  try {
    const W = 32, H = 24;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true } as any);
    if (!ctx || !video.videoWidth) return { in_frame: true, too_dark: false };
    ctx.drawImage(video, 0, 0, W, H);
    const data = ctx.getImageData(0, 0, W, H).data;
    let sum = 0, sumSq = 0, n = 0;
    for (let i = 0; i < data.length; i += 16) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += lum; sumSq += lum * lum; n += 1;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    return {
      in_frame: variance > 40,    // near-uniform frame = camera blocked / pointed at wall
      too_dark: mean < 35,
    };
  } catch {
    return { in_frame: true, too_dark: false };
  }
}

/** iter217 · MediaPipe Object Detector lazy-loader.
 *  Loads MediaPipe Tasks Vision from CDN so it's 0KB until used. Returns a
 *  detector that can score "too close / too far / out-of-frame" by counting
 *  detected food-tray-sized objects and their relative bbox area. */
export async function loadObjectDetector(): Promise<any | null> {
  try {
    // @ts-expect-error dynamic ESM import from CDN
    const vision = await import(
      /* @vite-ignore */
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/vision_bundle.mjs"
    );
    const filesetResolver = await vision.FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
    );
    const detector = await vision.ObjectDetector.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
        delegate: "GPU",
      },
      scoreThreshold: 0.35,
      runningMode: "IMAGE",
    });
    return detector;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[waste-video] MediaPipe ObjectDetector unavailable:", e);
    return null;
  }
}

/** Classify framing based on the largest detected object's bbox area. */
export type FramingLevel = "too_far" | "good" | "too_close" | "nothing";
export function classifyFraming(result: any, frameW: number, frameH: number): {
  level: FramingLevel; top_object: string | null; coverage: number;
} {
  const dets = result?.detections || [];
  if (dets.length === 0) return { level: "nothing", top_object: null, coverage: 0 };
  let best: any = null; let bestArea = 0;
  for (const d of dets) {
    const bb = d.boundingBox;
    if (!bb) continue;
    const area = (bb.width || 0) * (bb.height || 0);
    if (area > bestArea) { bestArea = area; best = d; }
  }
  const coverage = bestArea / (frameW * frameH);
  const name = best?.categories?.[0]?.categoryName || null;
  let level: FramingLevel = "good";
  if (coverage < 0.08) level = "too_far";
  else if (coverage > 0.70) level = "too_close";
  return { level, top_object: name, coverage: Math.round(coverage * 1000) / 1000 };
}

