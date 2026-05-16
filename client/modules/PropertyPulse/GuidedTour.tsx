import { useEffect, useState } from "react";

// Different storage key from the standalone so opening the integrated panel
// fires its own first-visit tour even if a user has dismissed the standalone.
const STORAGE_KEY = "luccca.property_pulse.tour.seen.v1";

interface Step {
  selector: string;
  title: string;
  body: string;
  placement: "right" | "left" | "top" | "bottom";
}

const STEPS: Step[] = [
  {
    selector: ".property-pulse-root .gauge",
    title: "Property capture · live",
    body: "Eligible-capture % across all outlets. Click any outlet pill below to drill into its trial-level retrospective.",
    placement: "left",
  },
  {
    selector: '.property-pulse-root [data-testid="outlet-p66demo-galley"]',
    title: "The Galley · live outlet read",
    body: "Each outlet has a multi-horizon Monte Carlo forecast and active learning loop. Tap to open the deep-dive.",
    placement: "top",
  },
  {
    selector: '.property-pulse-root [data-testid="tile-forecast-21"]',
    title: "21-Day Living Forecast",
    body: "Real Monte Carlo reads from outlet_capture_forecasts. The data_source label on every panel is the §1.1 transparency rule made literal.",
    placement: "top",
  },
];

export default function GuidedTour() {
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (seen) return;
    const t = setTimeout(() => setActive(true), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!active) return;
    const sel = STEPS[stepIdx]?.selector;
    if (!sel) return;
    const el = document.querySelector(sel);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        setRect(r);
      }, 350);
    }
    const onResize = () => {
      const e2 = document.querySelector(sel);
      if (e2) setRect(e2.getBoundingClientRect());
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [active, stepIdx]);

  if (!active || !rect) return null;

  const current = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  const dismiss = (markSeen = true) => {
    if (markSeen) window.localStorage.setItem(STORAGE_KEY, "1");
    setActive(false);
  };

  const padding = 8;
  const tooltipW = 320;
  let tooltipTop = rect.top + window.scrollY;
  let tooltipLeft = rect.left + window.scrollX;
  if (current.placement === "right") {
    tooltipLeft = rect.right + window.scrollX + padding;
  } else if (current.placement === "left") {
    tooltipLeft = rect.left + window.scrollX - tooltipW - padding;
  } else if (current.placement === "top") {
    tooltipTop = rect.top + window.scrollY - 180;
    tooltipLeft = rect.left + window.scrollX + rect.width / 2 - tooltipW / 2;
  } else {
    tooltipTop = rect.bottom + window.scrollY + padding;
    tooltipLeft = rect.left + window.scrollX + rect.width / 2 - tooltipW / 2;
  }
  tooltipLeft = Math.max(16, Math.min(tooltipLeft, window.innerWidth - tooltipW - 16));
  tooltipTop = Math.max(16 + window.scrollY, tooltipTop);

  return (
    <>
      <div
        className="pulse-tour-overlay"
        onClick={() => dismiss()}
        data-testid="guided-tour-overlay"
      />
      <div
        className="pulse-tour-spotlight"
        style={{
          top: rect.top + window.scrollY - 6,
          left: rect.left + window.scrollX - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        }}
      />
      <div
        className="pulse-tour-arrow"
        style={{
          top:
            current.placement === "top"
              ? rect.top + window.scrollY - 22
              : rect.top + window.scrollY + rect.height / 2 - 8,
          left:
            current.placement === "left"
              ? rect.left + window.scrollX - 22
              : current.placement === "right"
              ? rect.right + window.scrollX + 6
              : rect.left + window.scrollX + rect.width / 2 - 8,
        }}
      />

      <div
        className="pulse-tour-card"
        style={{ top: tooltipTop, left: tooltipLeft, width: tooltipW }}
        data-testid="guided-tour-card"
      >
        <div className="pulse-tour-step">
          step {stepIdx + 1} of {STEPS.length}
        </div>
        <div className="pulse-tour-title">{current.title}</div>
        <div className="pulse-tour-body">{current.body}</div>
        <div className="pulse-tour-actions">
          <button
            type="button"
            className="pulse-tour-skip"
            onClick={() => dismiss()}
            data-testid="tour-skip"
          >
            skip tour
          </button>
          <button
            type="button"
            className="pulse-tour-btn"
            data-testid="tour-next"
            onClick={() => {
              if (isLast) {
                dismiss();
              } else {
                setStepIdx((i) => i + 1);
                setRect(null);
              }
            }}
          >
            {isLast ? "got it" : "next →"}
          </button>
        </div>
      </div>
    </>
  );
}
