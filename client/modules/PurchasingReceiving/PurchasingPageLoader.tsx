import React, { ReactNode, Suspense, lazy } from "react";
type PageComponent = React.ComponentType<any>;
type PageLoaderProps = { pageId: string; fallback?: ReactNode };
type ErrorBoundaryProps = {
  children: ReactNode;
  fallback: (error: unknown) => ReactNode;
};
type ErrorBoundaryState = { error: unknown | null };
class PageErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };
  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }
  componentDidCatch(error: unknown) {
    console.error("[PurchasingReceiving] Page render failed", error);
  }
  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}
const DEFAULT_FALLBACK = (
  <div className="w-full h-full flex items-center justify-center bg-background p-6">
    {" "}
    <div className="text-center space-y-4">
      {" "}
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />{" "}
      <p className="text-sm text-muted-foreground">Loading page...</p>{" "}
    </div>{" "}
  </div>
);
const PAGE_IMPORTS: Record<string, () => Promise<{ default: PageComponent }>> =
  {
    dashboard: () => import("./client/pages/Dashboard"),
    purchasing: () => import("./client/pages/Purchasing"),
    receiving: () => import("./client/pages/ReceivingDashboard"),
    invoices: () => import("./client/pages/Invoices"),
    vendors: () => import("./client/pages/VendorManagement"),
    commissary: () => import("./client/pages/CommissaryOrdering"),
    inventory: () => import("./client/pages/Inventory"),
    waste: () => import("./client/pages/WasteTracking"),
    finance: () => import("./client/pages/Accounting"),
    analytics: () => import("./client/pages/Analytics"),
    admin: () => import("./client/pages/AdminPanels"),
    dock: () => import("./client/pages/OnTheDock"),
    "scan-invoices": () => import("./client/pages/InvoiceDrop"),
    "barcode-receiver": () => import("./client/pages/BarcodeReceiver"),
    haccp: () => import("./client/pages/HACCP"),
    "storage-layout": () => import("./client/pages/InventoryLayout"),
    "physical-count": () => import("./client/pages/InventoryPhysicalCount"),
    "quick-counts": () => import("./client/pages/InventoryQuickCounts"),
  };
const PAGE_COMPONENTS: Record<
  string,
  React.LazyExoticComponent<PageComponent>
> = Object.fromEntries(
  Object.entries(PAGE_IMPORTS).map(([pageId, importer]) => [
    pageId,
    lazy(importer),
  ]),
);
const getFallbackComponent = (pageId: string) =>
  PAGE_COMPONENTS[pageId] ?? PAGE_COMPONENTS.dashboard;
export default function PurchasingPageLoader({
  pageId,
  fallback = DEFAULT_FALLBACK,
}: PageLoaderProps) {
  const Page = getFallbackComponent(pageId);
  return (
    <PageErrorBoundary
      fallback={(error) => (
        <div className="w-full h-full flex items-center justify-center bg-background p-6">
          {" "}
          <div className="max-w-lg w-full rounded-lg border border-red-500/20 bg-red-500/5 p-5">
            {" "}
            <div className="text-sm font-semibold text-red-200">
              {" "}
              This section failed to load{" "}
            </div>{" "}
            <div className="mt-2 text-xs text-muted-foreground break-words">
              {" "}
              {String(error)}{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}
    >
      {" "}
      <Suspense fallback={fallback}>
        {" "}
        <Page />{" "}
      </Suspense>{" "}
    </PageErrorBoundary>
  );
}
