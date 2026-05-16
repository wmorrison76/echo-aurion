import { Routes, Route, Navigate } from "react-router-dom";
import LiveDashboard from "./LiveDashboard";
import OutletCaptureDeepDive from "./OutletCaptureDeepDive";
import PeriodCloseDeepDive from "./PeriodCloseDeepDive";
import ComingSoon from "./ComingSoon";
import { DEMO_PROPERTY } from "./api";

// Placeholder pages for tiles whose deep-dives are not yet built
const PaceComingSoon = () => (
  <ComingSoon
    title="Pace · Month-to-Date"
    eyebrow="MTD revenue · vs budget · P10/P50/P90 finish projection"
    endpoints={[
      "/api/pace/property/{property_id}",
      "/api/pace/outlet/{outlet_id}",
    ]}
    doctrineNote="The pace tile on the live dashboard already renders the same data via the property endpoint. The full pace deep-dive will add per-outlet breakdown, rolling weekly view, and the variance attribution panel."
  />
);
const CashRunwayComingSoon = () => (
  <ComingSoon
    title="Cash Runway"
    eyebrow="P75 worst-quartile burn · 7d/30d trend · acceleration"
    endpoints={["/api/cash-runway/{property_id}"]}
    doctrineNote="The runway tile on the live dashboard surfaces the headline number. The deep-dive will add the largest-outflows ledger, restricted vs unrestricted breakdown, and the burn-acceleration trace."
  />
);
const Forecast21ComingSoon = () => (
  <ComingSoon
    title="21-Day Living Forecast"
    eyebrow="Daily Monte Carlo · per-outlet flow · labor schedule"
    endpoints={[
      "/api/forecast-21/forecast",
      "/api/forecast-21/forecast/day/{date}",
      "/api/forecast-21/notes",
      "/api/forecast-21/coverage/{outlet}/{date}",
      "/api/forecast-21/accuracy/report",
      "/api/forecast-21/accuracy/trend",
    ]}
    doctrineNote="The sparkline on the live dashboard summarizes the 21-day total. The full deep-dive will add the calendar day-grid, per-outlet hourly flow, AI directives notes, and the accuracy SMAPE trend report."
  />
);
const LifecycleComingSoon = () => (
  <ComingSoon
    title="Lifecycle Engine"
    eyebrow="8 hospitality templates · Renovation, Property Opening, F&B Menu Rollout, Training, SOC 2, BEO, CapEx, Marketing"
    endpoints={[
      "/api/lifecycles/digest/{property_id}",
      "/api/lifecycles/runs/property/{property_id}",
      "/api/lifecycles/runs/{run_id}",
      "/api/lifecycles/audit/{run_id}",
      "/api/lifecycles/templates",
      "/api/lifecycles/project-types",
    ]}
    doctrineNote="The May 2026 P&L Close run is already viewable as a deep-dive. The general lifecycle UI will add multi-template launching, step transitions, and the cross-run portfolio view."
  />
);
const ExceptionComingSoon = () => (
  <ComingSoon
    title="Exception Review"
    eyebrow="Daily anomaly screening · red/amber/green severity"
    endpoints={["/api/exception-review/{property_id}"]}
    doctrineNote="The exception tile on the live dashboard shows today's count + narrative. The deep-dive will add historical exception ledger, severity-trend view, and exception → audit-event chain."
  />
);
const MenuEngineeringComingSoon = () => (
  <ComingSoon
    title="Menu Engineering"
    eyebrow="Star · Plowhorse · Puzzle · Dog matrix · contribution-margin classification"
    endpoints={[
      "/api/menu-engineering/{property_id}",
      "/api/menu-engineering/recipe/{recipe_id}",
      "/api/menu-eng-matrix/{property_id}",
    ]}
    doctrineNote="Audit events tied to menu-item entities surface here. The menu engineering matrix UI is still under construction; the underlying classification engine is live."
  />
);
const TipAuditComingSoon = () => (
  <ComingSoon
    title="Tip Audit"
    eyebrow="Tip-share configuration audit · pool integrity · distribution validation"
    endpoints={[
      "/api/tip-audit/{property_id}",
      "/api/tip-audit/{property_id}/runs",
      "/api/tip-audit/runs/{run_id}",
    ]}
    doctrineNote="Audit events tied to tip-share-config entities surface here. The tip audit reconciliation UI is still under construction; the validator engine is live."
  />
);

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={`/dashboard/live/${DEMO_PROPERTY}`} replace />}
      />
      <Route path="/dashboard/live/:propertyId" element={<LiveDashboard />} />
      <Route
        path="/dashboard/outlet/:propertyId/:outletId"
        element={<OutletCaptureDeepDive />}
      />
      <Route
        path="/dashboard/period-close/:propertyId"
        element={<PeriodCloseDeepDive />}
      />
      <Route path="/dashboard/pace/:propertyId" element={<PaceComingSoon />} />
      <Route
        path="/dashboard/cash-runway/:propertyId"
        element={<CashRunwayComingSoon />}
      />
      <Route
        path="/dashboard/forecast-21/:propertyId"
        element={<Forecast21ComingSoon />}
      />
      <Route
        path="/dashboard/lifecycle/:propertyId"
        element={<LifecycleComingSoon />}
      />
      <Route
        path="/dashboard/exceptions/:propertyId"
        element={<ExceptionComingSoon />}
      />
      <Route
        path="/dashboard/menu-engineering/:propertyId"
        element={<MenuEngineeringComingSoon />}
      />
      <Route
        path="/dashboard/tip-audit/:propertyId"
        element={<TipAuditComingSoon />}
      />
      <Route
        path="*"
        element={<Navigate to={`/dashboard/live/${DEMO_PROPERTY}`} replace />}
      />
    </Routes>
  );
}
