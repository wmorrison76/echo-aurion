import React, { ReactNode, Suspense, lazy, useEffect } from "react";

interface PageLoaderProps {
  pageId: string;
  fallback?: ReactNode;
}

const DashboardPage = lazy(() => import("./client/pages/Dashboard"));
const FinancialReportsPage = lazy(() =>
  import("./client/modules/aurum/components/FinancialReportsDashboard").then(
    (m) => ({ default: m.FinancialReportsDashboard }),
  ),
);

function DefaultFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-aurum-500 mx-auto" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

function ConsoleWithFocus({ focusId }: { focusId?: string }) {
  useEffect(() => {
    if (!focusId) return;
    let cancelled = false;
    const start = Date.now();
    const attemptScroll = () => {
      if (cancelled) return;
      const el = document.getElementById(focusId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (Date.now() - start < 4000) {
        requestAnimationFrame(attemptScroll);
      }
    };
    requestAnimationFrame(attemptScroll);
    return () => {
      cancelled = true;
    };
  }, [focusId]);
  return (
    <div className="p-6 text-sm text-muted-foreground">
      Section "{focusId}" is currently unavailable.
    </div>
  );
}

const PAGE_COMPONENTS: Record<string, React.ElementType> = {
  dashboard: DashboardPage,
  gl: DashboardPage,
  ap: DashboardPage,
  purchasing: DashboardPage,
  reports: FinancialReportsPage,
  "financial-reports": FinancialReportsPage,
  audit: DashboardPage,
  admin: DashboardPage,
  console: DashboardPage,
  approvals: () => <ConsoleWithFocus focusId="approvals" />,
  reconciliation: () => <ConsoleWithFocus focusId="reconciliation" />,
  guardian: () => <ConsoleWithFocus focusId="guardian" />,
  "pnl-drivers": () => <ConsoleWithFocus focusId="pnl-drivers" />,
};

const SafePageLoader: React.FC<PageLoaderProps> = ({ pageId, fallback }) => {
  const Component = PAGE_COMPONENTS[pageId] ?? DashboardPage;
  return (
    <Suspense fallback={fallback ?? <DefaultFallback />}>
      <Component />
    </Suspense>
  );
};

export default SafePageLoader;
