import { telemetryClient } from "./telemetryClient";

let perfStarted = false;

export function startPerfMonitoring() {
  if (typeof window === "undefined" || perfStarted) return () => {};
  perfStarted = true;

  let rafId = 0;
  let lastTime = performance.now();
  let memoryInterval: number | undefined;
  let longTaskObserver: PerformanceObserver | null = null;

  const loop = () => {
    const now = performance.now();
    const frameMs = now - lastTime;
    lastTime = now;
    telemetryClient.recordFrame(frameMs);
    rafId = window.requestAnimationFrame(loop);
  };

  rafId = window.requestAnimationFrame(loop);

  // Long task observer (if supported)
  if (
    "PerformanceObserver" in window &&
    "PerformanceLongTaskTiming" in window
  ) {
    try {
      longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const duration = entry.duration;
          telemetryClient.recordFrame(duration, true);
        });
      });
      longTaskObserver.observe({ entryTypes: ["longtask"] as any });
    } catch (err) {
      console.debug("[perfHooks] Long task observer not available", err);
    }
  }

  // Memory sampling (best-effort)
  if ((performance as any).memory) {
    memoryInterval = window.setInterval(() => {
      try {
        const mem = (performance as any).memory;
        const usedMB = mem.usedJSHeapSize
          ? Math.round(mem.usedJSHeapSize / 1024 / 1024)
          : undefined;
        const totalMB = mem.totalJSHeapSize
          ? Math.round(mem.totalJSHeapSize / 1024 / 1024)
          : undefined;
        telemetryClient.recordMemory({ usedMB, totalMB });
      } catch (err) {
        console.debug("[perfHooks] Memory sampling failed", err);
      }
    }, 4000);
  } else {
    telemetryClient.recordMemory({ unavailable: true, timestamp: Date.now() });
  }

  return () => {
    window.cancelAnimationFrame(rafId);
    if (memoryInterval) {
      window.clearInterval(memoryInterval);
    }
    if (longTaskObserver) {
      longTaskObserver.disconnect();
    }
    perfStarted = false;
  };
}
