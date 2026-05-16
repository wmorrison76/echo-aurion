import { logger } from "./logger";
let getCLS: any, getFID: any, getFCP: any, getLCP: any, getTTFB: any;
async function initializeWebVitalsImports() {
  try {
    const webVitals = await import("web-vitals");
    getCLS = webVitals.getCLS;
    getFID = webVitals.getFID;
    getFCP = webVitals.getFCP;
    getLCP = webVitals.getLCP;
    getTTFB = webVitals.getTTFB;
  } catch (error) {
    logger.warn("Failed to import web-vitals, tracking disabled:", error);
  }
}
interface VitalMetric {
  metric: string;
  value: number;
  timestamp: number;
  url: string;
  rating?: "good" | "needs-improvement" | "poor";
}
function reportMetric(metric: VitalMetric) {
  logger.info(`Web Vital: ${metric.metric}`, {
    value: metric.value,
    rating: metric.rating,
    url: metric.url,
  });
  try {
    fetch("/api/analytics/vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metric),
      keepalive: true,
    }).catch((err) => {
      logger.error(`Failed to report ${metric.metric}:`, err);
    });
  } catch (err) {
    logger.error(`Failed to report metric ${metric.metric}:`, err);
  }
}
function getRating(
  metric: string,
  value: number,
): "good" | "needs-improvement" | "poor" {
  switch (metric) {
    case "CLS":
      return value <= 0.1
        ? "good"
        : value <= 0.25
          ? "needs-improvement"
          : "poor";
    case "FID":
      return value <= 100
        ? "good"
        : value <= 300
          ? "needs-improvement"
          : "poor";
    case "FCP":
      return value <= 1800
        ? "good"
        : value <= 3000
          ? "needs-improvement"
          : "poor";
    case "LCP":
      return value <= 2500
        ? "good"
        : value <= 4000
          ? "needs-improvement"
          : "poor";
    case "TTFB":
      return value <= 600
        ? "good"
        : value <= 1800
          ? "needs-improvement"
          : "poor";
    case "INP":
      return value <= 200
        ? "good"
        : value <= 500
          ? "needs-improvement"
          : "poor";
    default:
      return "needs-improvement";
  }
}
export async function initWebVitals() {
  if (typeof window === "undefined") return;
  await initializeWebVitalsImports();
  if (!getCLS || !getFID || !getFCP || !getLCP || !getTTFB) {
    logger.warn("Web Vitals functions not available, skipping initialization");
    return;
  }
  try {
    getCLS((metric: any) => {
      reportMetric({
        metric: "CLS",
        value: metric.value,
        timestamp: metric.startTime,
        url: window.location.href,
        rating: getRating("CLS", metric.value),
      });
    });
    getFID((metric: any) => {
      reportMetric({
        metric: "FID",
        value: metric.value,
        timestamp: metric.startTime,
        url: window.location.href,
        rating: getRating("FID", metric.value),
      });
    });
    getFCP((metric: any) => {
      reportMetric({
        metric: "FCP",
        value: metric.value,
        timestamp: metric.startTime,
        url: window.location.href,
        rating: getRating("FCP", metric.value),
      });
    });
    getLCP((metric: any) => {
      reportMetric({
        metric: "LCP",
        value: metric.value,
        timestamp: metric.startTime,
        url: window.location.href,
        rating: getRating("LCP", metric.value),
      });
    });
    getTTFB((metric: any) => {
      reportMetric({
        metric: "TTFB",
        value: metric.value,
        timestamp: metric.startTime,
        url: window.location.href,
        rating: getRating("TTFB", metric.value),
      });
    });
    logger.info("Web Vitals tracking initialized");
  } catch (error) {
    logger.error("Failed to initialize Web Vitals:", error);
  }
}
