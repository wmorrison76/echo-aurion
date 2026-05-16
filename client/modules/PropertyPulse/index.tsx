import { useState } from "react";
import LiveDashboard from "./LiveDashboard";
import OutletCaptureDeepDive from "./OutletCaptureDeepDive";
import PeriodCloseDeepDive from "./PeriodCloseDeepDive";
import ComingSoon from "./ComingSoon";
import { DEMO_PROPERTY, type ComingSoonKind, type PulseView } from "./api";
import "./PropertyPulse.css";

/**
 * PropertyPulse — the integrated home for the Pier Sixty-Six live dashboard
 * and its deep-dives. Ported from the standalone preview at /app/frontend/
 * into the LUCCCA app shell as a panel module.
 *
 * LUCCCA panels mount inside a floating shell with no route of their own, so
 * navigation between the live tile grid, the outlet deep-dive, the period-
 * close deep-dive, and the §1.1 coming-soon placeholders is driven by
 * internal state instead of react-router URLs.
 */

const COMING_SOON_META: Record<
  ComingSoonKind,
  { title: string; eyebrow: string; endpoints: string[]; doctrineNote?: string }
> = {
  pace: {
    title: "Pace · Month-to-Date",
    eyebrow: "MTD revenue · vs budget · P10/P50/P90 finish projection",
    endpoints: [
      "/api/pace/property/{property_id}",
      "/api/pace/outlet/{outlet_id}",
    ],
    doctrineNote:
      "The pace tile on the live dashboard already renders the same data via the property endpoint. The full pace deep-dive will add per-outlet breakdown, rolling weekly view, and the variance attribution panel.",
  },
  "cash-runway": {
    title: "Cash Runway",
    eyebrow: "P75 worst-quartile burn · 7d/30d trend · acceleration",
    endpoints: ["/api/cash-runway/{property_id}"],
    doctrineNote:
      "The runway tile on the live dashboard surfaces the headline number. The deep-dive will add the largest-outflows ledger, restricted vs unrestricted breakdown, and the burn-acceleration trace.",
  },
  "forecast-21": {
    title: "21-Day Living Forecast",
    eyebrow: "Daily Monte Carlo · per-outlet flow · labor schedule",
    endpoints: [
      "/api/forecast-21/forecast",
      "/api/forecast-21/forecast/day/{date}",
      "/api/forecast-21/notes",
      "/api/forecast-21/coverage/{outlet}/{date}",
      "/api/forecast-21/accuracy/report",
      "/api/forecast-21/accuracy/trend",
    ],
    doctrineNote:
      "The sparkline on the live dashboard summarizes the 21-day total. The full deep-dive will add the calendar day-grid, per-outlet hourly flow, AI directives notes, and the accuracy SMAPE trend report.",
  },
  lifecycle: {
    title: "Lifecycle Engine",
    eyebrow:
      "8 hospitality templates · Renovation, Property Opening, F&B Menu Rollout, Training, SOC 2, BEO, CapEx, Marketing",
    endpoints: [
      "/api/lifecycles/digest/{property_id}",
      "/api/lifecycles/runs/property/{property_id}",
      "/api/lifecycles/runs/{run_id}",
      "/api/lifecycles/audit/{run_id}",
      "/api/lifecycles/templates",
      "/api/lifecycles/project-types",
    ],
    doctrineNote:
      "The May 2026 P&L Close run is already viewable as a deep-dive. The general lifecycle UI will add multi-template launching, step transitions, and the cross-run portfolio view.",
  },
  exceptions: {
    title: "Exception Review",
    eyebrow: "Daily anomaly screening · red/amber/green severity",
    endpoints: ["/api/exception-review/{property_id}"],
    doctrineNote:
      "The exception tile on the live dashboard shows today's count + narrative. The deep-dive will add historical exception ledger, severity-trend view, and exception → audit-event chain.",
  },
  "menu-engineering": {
    title: "Menu Engineering",
    eyebrow:
      "Star · Plowhorse · Puzzle · Dog matrix · contribution-margin classification",
    endpoints: [
      "/api/menu-engineering/{property_id}",
      "/api/menu-engineering/recipe/{recipe_id}",
      "/api/menu-eng-matrix/{property_id}",
    ],
    doctrineNote:
      "Audit events tied to menu-item entities surface here. The menu engineering matrix UI is still under construction; the underlying classification engine is live.",
  },
  "tip-audit": {
    title: "Tip Audit",
    eyebrow: "Tip-share configuration audit · pool integrity · distribution validation",
    endpoints: [
      "/api/tip-audit/{property_id}",
      "/api/tip-audit/{property_id}/runs",
      "/api/tip-audit/runs/{run_id}",
    ],
    doctrineNote:
      "Audit events tied to tip-share-config entities surface here. The tip audit reconciliation UI is still under construction; the validator engine is live.",
  },
};

export default function PropertyPulse() {
  // Property is fixed to the seeded demo property for now. Multi-property
  // selection can later wire through the LUCCCA property picker.
  const propertyId = DEMO_PROPERTY;
  const [view, setView] = useState<PulseView>({ kind: "live" });

  const back = () => setView({ kind: "live" });

  let content: JSX.Element;
  if (view.kind === "live") {
    content = <LiveDashboard propertyId={propertyId} onNavigate={setView} />;
  } else if (view.kind === "outlet") {
    content = (
      <OutletCaptureDeepDive
        propertyId={propertyId}
        outletId={view.outletId}
        onBack={back}
      />
    );
  } else if (view.kind === "period-close") {
    content = (
      <PeriodCloseDeepDive
        propertyId={propertyId}
        onBack={back}
        onNavigate={setView}
      />
    );
  } else {
    const meta = COMING_SOON_META[view.module];
    content = (
      <ComingSoon
        title={meta.title}
        eyebrow={meta.eyebrow}
        endpoints={meta.endpoints}
        doctrineNote={meta.doctrineNote}
        onBack={back}
      />
    );
  }

  return (
    <div className="property-pulse-root" data-testid="property-pulse-root">
      {/* Replay-tour pill — wipes the tour-seen flag and forces a re-mount so a
          presenter mid-pitch can resummon the §2.4 walkthrough on demand. */}
      <button
        type="button"
        data-testid="property-pulse-replay-tour"
        onClick={() => {
          try { window.localStorage.removeItem("luccca.property_pulse.tour.seen.v1"); } catch {}
          // Bounce the view to force GuidedTour to remount with a fresh selector check.
          const current = view;
          setView({ kind: "live" });
          if (current.kind !== "live") {
            window.setTimeout(() => setView(current), 0);
          } else {
            // Hack: nudge the state with a no-op transition so GuidedTour effect re-runs.
            window.setTimeout(() => {
              window.dispatchEvent(new Event("resize"));
            }, 100);
            window.location.reload();
          }
        }}
        style={{
          position: "absolute",
          top: 14,
          right: 18,
          zIndex: 50,
          padding: "6px 12px",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "Inter, sans-serif",
          fontWeight: 600,
          color: "#c8a97e",
          background: "transparent",
          border: "1px solid rgba(200, 169, 126, 0.35)",
          borderRadius: 2,
          cursor: "pointer",
          transition: "background 0.3s, color 0.3s",
        }}
        onMouseOver={(e) => {
          (e.currentTarget.style as any).background = "rgba(200,169,126,0.12)";
        }}
        onMouseOut={(e) => {
          (e.currentTarget.style as any).background = "transparent";
        }}
        title="Re-run the §2.4 walkthrough"
      >
        ↻ Replay tour
      </button>
      {content}
    </div>
  );
}
