/**
 * PurchasingReceiving Module - Floating Panel with Sidebar Navigation
 * Main entry point for the purchasing & receiving module
 * Used by both full-page and floating panel contexts
 * Supports mobile-responsive layout with bottom tabs
 */

import React, { lazy, Suspense, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { TurtleLoader } from "./components/TurtleLoader";
import ErrorBoundaryWrapper from "./components/ErrorBoundaryWrapper";
import { MobileResponsivePanels, useIsMobile } from "@/components/site/MobileResponsivePanels";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PurchRecSidebar, type SidebarPage } from "./components/PurchRecSidebar";
import type { Role } from "@shared/auth";
import { Lock, ShoppingCart, Package, FileText, LayoutDashboard, QrCode } from "lucide-react";
import type { OrderGuideRow } from "./services/orderGuide.service";

const PURCHASING_ROLES: readonly Role[] = ["Admin", "Manager"];
const RECEIVING_ROLES: readonly Role[] = ["Admin", "Manager", "Receiver"];
const INVENTORY_ROLES: readonly Role[] = [
  "Admin",
  "Manager",
  "Chef",
  "Finance",
];
const LEDGER_ROLES: readonly Role[] = ["Admin", "Manager", "Finance"];

// Lazy-loaded panel components
const DashboardPanel = lazy(() =>
  import("./components/DashboardPanel").then((mod) => ({
    default: mod.DashboardPanel,
  }))
);

const OrderGuidePanel = lazy(() =>
  import("./components/OrderGuidePanel").then((mod) => ({
    default: mod.OrderGuidePanel,
  }))
);

const OrderFormDrawer = lazy(() =>
  import("./components/OrderFormDrawer").then((mod) => ({
    default: mod.OrderFormDrawer,
  }))
);

const ReceivingPanel = lazy(() =>
  import("./components/ReceivingPanel").then((mod) => ({
    default: mod.ReceivingPanel,
  }))
);

const DockScannerPanel = lazy(() =>
  import("./components/DockScannerPanel").then((mod) => ({
    default: mod.DockScannerPanel,
  }))
);

const InventoryLotsPanel = lazy(() =>
  import("./components/InventoryLotsPanel").then((mod) => ({
    default: mod.InventoryLotsPanel,
  }))
);

const StockLedgerPanel = lazy(() =>
  import("./components/StockLedgerPanel").then((mod) => ({
    default: mod.StockLedgerPanel,
  }))
);

const IngredientCategorizationPanel = lazy(() =>
  import("./components/IngredientCategorizationPanel").then((mod) => ({
    default: mod.IngredientCategorizationPanel,
  }))
);

const InvoiceHandlingPanel = lazy(() =>
  import("./components/InvoiceHandlingPanel").then((mod) => ({
    default: mod.InvoiceHandlingPanel,
  }))
);

const AdvancedOrderingPanel = lazy(() =>
  import("./components/AdvancedOrderingPanel").then((mod) => ({
    default: mod.AdvancedOrderingPanel,
  }))
);

const TrainingPanel = lazy(() =>
  import("./components/TrainingPanel").then((mod) => ({
    default: mod.TrainingPanel,
  }))
);

const WalkInDesignPanel = lazy(() =>
  import("./components/WalkInDesignPanel").then((mod) => ({
    default: mod.WalkInDesignPanel,
  }))
);
const ApprovalHierarchyPanel = lazy(() =>
  import("./components/ApprovalHierarchyPanel")
);
const VendorIntelPanel = lazy(() =>
  import("./components/VendorIntelPanel")
);

function PanelLoader({
  message,
  note,
  compact = false,
}: {
  message: string;
  note: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "flex items-center justify-center p-6"
          : "flex h-full items-center justify-center"
      }
    >
      <TurtleLoader message={message} note={note} small={compact} />
    </div>
  );
}

function PermissionNotice({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  const classes = [
    "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-8 text-center text-slate-300",
    className,
  ]
    .filter(Boolean)
    .join("");

  return (
    <div className={classes}>
      <Lock className="mb-3 h-8 w-8 text-slate-400" />
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  );
}

export default function PurchasingReceivingModule() {
  // Safely extract auth context - handle case where AuthProvider might not be available
  let user = null;
  let role: Role | null = null;

  try {
    const authContext = useAuth();
    user = authContext?.user ?? null;
    role = user?.role ?? null;
  } catch (err) {
    console.warn(
      "[PurchRec] AuthContext not available, defaulting to null role:",
      err
    );
    role = null;
  }

  // Log initialization
  React.useEffect(() => {
    console.log("[PurchRec] Module initialized with role:", role);
  }, [role]);

  const [currentPage, setCurrentPage] = useState<SidebarPage>("dashboard");
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [orderFormSeedRows, setOrderFormSeedRows] = useState<
    OrderGuideRow[] | null
  >(null);

  // Role-based access
  const canUseOrderGuide =
    !role || PURCHASING_ROLES.includes(role);
  const canUseOrderForm = canUseOrderGuide;
  const canUseReceiving =
    !role || RECEIVING_ROLES.includes(role);
  const canUseInventory =
    !role || INVENTORY_ROLES.includes(role);
  const canUseLedger =
    !role || LEDGER_ROLES.includes(role);
  const canUseDockScanner =
    !role || RECEIVING_ROLES.includes(role);

  const handleSendToOrderForm = useCallback(
    (rows: OrderGuideRow[]) => {
      if (!rows.length || !canUseOrderForm) return;
      setOrderFormSeedRows(rows);
      setOrderFormOpen(true);
    },
    [canUseOrderForm]
  );

  // iter254 · Listen for external "open-panel" events that ask us to
  // switch to a specific page (e.g. ApprovalBanner → "approvals" tab).
  React.useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ id?: string; initialPage?: SidebarPage }>;
      if (ce?.detail?.id === "purchasing-receiving" && ce.detail.initialPage) {
        setCurrentPage(ce.detail.initialPage);
      }
    };
    window.addEventListener("open-panel", handler);
    return () => window.removeEventListener("open-panel", handler);
  }, []);

  const isMobile = useIsMobile();

  const renderMainContent = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <ErrorBoundaryWrapper section="Dashboard">
            <Suspense
              fallback={
                <PanelLoader
                  message="Loading dashboard"
                  note="Aggregating purchasing metrics and insights"
                />
              }
            >
              <DashboardPanel />
            </Suspense>
          </ErrorBoundaryWrapper>
        );

      case "orders":
        return canUseOrderGuide ? (
          <ErrorBoundaryWrapper section="Order Guide">
            <Suspense
              fallback={
                <PanelLoader
                  message="Loading order guide"
                  note="Preparing purchasing suggestions"
                  compact
                />
              }
            >
              <OrderGuidePanel
                panelId="ORD-1"
                onSendToOrderForm={handleSendToOrderForm}
              />
            </Suspense>
          </ErrorBoundaryWrapper>
        ) : (
          <PermissionNotice
            title="Purchasing access required"
            description="Switch to an Admin or Manager profile to access the order guide."
          />
        );

      case "receiving":
        return canUseReceiving ? (
          <ErrorBoundaryWrapper section="Receiving">
            <Suspense
              fallback={
                <PanelLoader
                  message="Loading receiving workspace"
                  note="Syncing inbound deliveries and QC checkpoints"
                />
              }
            >
              <ReceivingPanel panelId="RCV-1" />
            </Suspense>
          </ErrorBoundaryWrapper>
        ) : (
          <PermissionNotice
            title="Receiving access required"
            description="Switch to an Admin, Manager, or Receiver profile to post deliveries and record lots."
          />
        );

      case "dock-scanner":
        return canUseDockScanner ? (
          <ErrorBoundaryWrapper section="Dock Scanner">
            <Suspense
              fallback={
                <PanelLoader
                  message="Loading dock scanner"
                  note="Initializing barcode capture interface"
                />
              }
            >
              <DockScannerPanel panelId="DOCK-1" />
            </Suspense>
          </ErrorBoundaryWrapper>
        ) : (
          <PermissionNotice
            title="Scanner access required"
            description="Switch to an Admin, Manager, or Receiver profile to access the dock scanner."
          />
        );

      case "inventory":
        return canUseInventory ? (
          <ErrorBoundaryWrapper section="Inventory Lots">
            <Suspense
              fallback={
                <PanelLoader
                  message="Loading inventory lots"
                  note="Aggregating vendor batches and expirations"
                />
              }
            >
              <InventoryLotsPanel panelId="INV-1" />
            </Suspense>
          </ErrorBoundaryWrapper>
        ) : (
          <PermissionNotice
            title="Inventory visibility restricted"
            description="Switch to an Admin, Manager, Chef, or Finance profile to review lot positions and expirations."
          />
        );

      case "ledger":
        return canUseLedger ? (
          <ErrorBoundaryWrapper section="Stock Ledger">
            <Suspense
              fallback={
                <PanelLoader
                  message="Loading stock ledger"
                  note="Retrieving movement history and adjustments"
                />
              }
            >
              <StockLedgerPanel panelId="LED-1" />
            </Suspense>
          </ErrorBoundaryWrapper>
        ) : (
          <PermissionNotice
            title="Ledger access required"
            description="Switch to an Admin, Manager, or Finance profile to audit stock movements and adjustments."
          />
        );

      case "categorization":
        return canUseOrderGuide ? (
          <ErrorBoundaryWrapper section="Ingredient Categorization">
            <Suspense
              fallback={
                <PanelLoader
                  message="Loading ingredient setup"
                  note="Preparing ingredient categorization and configuration"
                />
              }
            >
              <IngredientCategorizationPanel panelId="CAT-1" />
            </Suspense>
          </ErrorBoundaryWrapper>
        ) : (
          <PermissionNotice
            title="Configuration access required"
            description="Switch to an Admin or Manager profile to configure ingredient categorization."
          />
        );

      case "invoices":
        return canUseOrderGuide ? (
          <ErrorBoundaryWrapper section="Invoice Management">
            <Suspense
              fallback={
                <PanelLoader
                  message="Loading invoice processing"
                  note="Retrieving pending invoices and payments"
                />
              }
            >
              <InvoiceHandlingPanel panelId="INV-1" />
            </Suspense>
          </ErrorBoundaryWrapper>
        ) : (
          <PermissionNotice
            title="Invoice access required"
            description="Switch to an Admin or Manager profile to process invoices."
          />
        );

      case "advanced-ordering":
        return canUseOrderGuide ? (
          <ErrorBoundaryWrapper section="Advanced Ordering">
            <Suspense
              fallback={
                <PanelLoader
                  message="Loading advanced ordering"
                  note="Preparing bulk orders and procurement planning"
                />
              }
            >
              <AdvancedOrderingPanel panelId="ADV-1" />
            </Suspense>
          </ErrorBoundaryWrapper>
        ) : (
          <PermissionNotice
            title="Purchasing access required"
            description="Switch to an Admin or Manager profile to use advanced ordering."
          />
        );

      case "training":
        return canUseOrderGuide ? (
          <ErrorBoundaryWrapper section="Training Materials">
            <Suspense
              fallback={
                <PanelLoader
                  message="Loading training materials"
                  note="Preparing compliance and procedure documents"
                />
              }
            >
              <TrainingPanel panelId="TRN-1" />
            </Suspense>
          </ErrorBoundaryWrapper>
        ) : (
          <PermissionNotice
            title="Configuration access required"
            description="Switch to an Admin or Manager profile to access training materials."
          />
        );

      case "walk-in":
        return canUseReceiving ? (
          <ErrorBoundaryWrapper section="Walk-in Vendors">
            <Suspense
              fallback={
                <PanelLoader
                  message="Loading walk-in interface"
                  note="Preparing vendor registration and receiving"
                />
              }
            >
              <WalkInDesignPanel panelId="WALK-1" />
            </Suspense>
          </ErrorBoundaryWrapper>
        ) : (
          <PermissionNotice
            title="Receiving access required"
            description="Switch to an Admin, Manager, or Receiver profile to handle walk-in vendors."
          />
        );

      case "approvals":
        return (
          <ErrorBoundaryWrapper section="Approval Hierarchy">
            <Suspense fallback={<PanelLoader message="Loading approval hierarchy" note="Fetching pending requests" compact />}>
              <ApprovalHierarchyPanel />
            </Suspense>
          </ErrorBoundaryWrapper>
        );

      case "vendor-intel":
        return (
          <ErrorBoundaryWrapper section="Vendor Intel">
            <Suspense fallback={<PanelLoader message="Loading vendor intel" note="Fetching vendor SKUs and price trends" compact />}>
              <VendorIntelPanel />
            </Suspense>
          </ErrorBoundaryWrapper>
        );

      default:
        return null;
    }
  };

  // Mobile tabs structure
  const mobileTabs = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      disabled: false,
      content: (
        <ErrorBoundaryWrapper section="Dashboard">
          <div className="p-4">
            <Suspense
              fallback={
                <PanelLoader
                  message="Loading dashboard"
                  note="Aggregating purchasing metrics and insights"
                  compact
                />
              }
            >
              <DashboardPanel />
            </Suspense>
          </div>
        </ErrorBoundaryWrapper>
      ),
    },
    {
      key: "order-guide",
      label: "Orders",
      icon: <ShoppingCart className="h-4 w-4" />,
      disabled: !canUseOrderGuide,
      content: (
        <ErrorBoundaryWrapper section="Order Guide">
          <div className="p-4">
            {canUseOrderGuide ? (
              <Suspense
                fallback={
                  <PanelLoader
                    message="Loading order guide"
                    note="Preparing purchasing suggestions"
                    compact
                  />
                }
              >
                <OrderGuidePanel
                  panelId="ORD-1"
                  onSendToOrderForm={handleSendToOrderForm}
                />
              </Suspense>
            ) : (
              <PermissionNotice
                title="Purchasing access required"
                description="Switch to an Admin or Manager profile to access the order guide."
              />
            )}
          </div>
        </ErrorBoundaryWrapper>
      ),
    },
    {
      key: "receiving",
      label: "Receiving",
      icon: <Package className="h-4 w-4" />,
      disabled: !canUseReceiving,
      content: (
        <ErrorBoundaryWrapper section="Receiving">
          <div className="p-4">
            {canUseReceiving ? (
              <Suspense
                fallback={
                  <PanelLoader
                    message="Loading receiving workspace"
                    note="Syncing inbound deliveries and QC checkpoints"
                    compact
                  />
                }
              >
                <ReceivingPanel panelId="RCV-1" />
              </Suspense>
            ) : (
              <PermissionNotice
                title="Receiving access required"
                description="Switch to an Admin, Manager, or Receiver profile to post deliveries and record lots."
              />
            )}
          </div>
        </ErrorBoundaryWrapper>
      ),
    },
    {
      key: "dock-scanner",
      label: "Dock Scanner",
      icon: <QrCode className="h-4 w-4" />,
      disabled: !canUseDockScanner,
      content: (
        <ErrorBoundaryWrapper section="Dock Scanner">
          <div className="p-4">
            {canUseDockScanner ? (
              <Suspense
                fallback={
                  <PanelLoader
                    message="Loading dock scanner"
                    note="Initializing barcode capture interface"
                    compact
                  />
                }
              >
                <DockScannerPanel panelId="DOCK-1" />
              </Suspense>
            ) : (
              <PermissionNotice
                title="Scanner access required"
                description="Switch to an Admin, Manager, or Receiver profile to access the dock scanner."
              />
            )}
          </div>
        </ErrorBoundaryWrapper>
      ),
    },
    {
      key: "inventory",
      label: "Inventory",
      icon: <Package className="h-4 w-4" />,
      disabled: !canUseInventory,
      content: (
        <ErrorBoundaryWrapper section="Inventory">
          <div className="p-4">
            {canUseInventory ? (
              <Suspense
                fallback={
                  <PanelLoader
                    message="Loading inventory lots"
                    note="Aggregating vendor batches and expirations"
                    compact
                  />
                }
              >
                <InventoryLotsPanel panelId="INV-1" />
              </Suspense>
            ) : (
              <PermissionNotice
                title="Inventory visibility restricted"
                description="Switch to an Admin, Manager, Chef, or Finance profile to review lot positions and expirations."
              />
            )}
          </div>
        </ErrorBoundaryWrapper>
      ),
    },
    {
      key: "ledger",
      label: "Ledger",
      icon: <FileText className="h-4 w-4" />,
      disabled: !canUseLedger,
      content: (
        <ErrorBoundaryWrapper section="Stock Ledger">
          <div className="p-4">
            {canUseLedger ? (
              <Suspense
                fallback={
                  <PanelLoader
                    message="Loading stock ledger"
                    note="Retrieving movement history and adjustments"
                    compact
                  />
                }
              >
                <StockLedgerPanel panelId="LED-1" />
              </Suspense>
            ) : (
              <PermissionNotice
                title="Ledger access required"
                description="Switch to an Admin, Manager, or Finance profile to audit stock movements and adjustments."
              />
            )}
          </div>
        </ErrorBoundaryWrapper>
      ),
    },
  ];

  // Mobile layout
  if (isMobile) {
    return (
      <ErrorBoundaryWrapper section="PurchasingReceiving">
        <div className="flex flex-col h-full w-full bg-background text-foreground">
          {/* Mobile header */}
          <div className="border-b border-border p-3 bg-background">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">P&R</h2>
              </div>
              {role && (
                <Badge variant="outline" className="text-xs py-0">
                  {role}
                </Badge>
              )}
            </div>
          </div>

          {/* Mobile tab layout */}
          <MobileResponsivePanels
            tabs={mobileTabs}
            defaultTab="dashboard"
            mobileBreakpoint={768}
          />

          {/* Order Form Drawer for mobile */}
          {orderFormOpen && (
            <ErrorBoundaryWrapper section="Order Form">
              <Suspense
                fallback={
                  <PanelLoader
                    message="Loading order form"
                    note="Preparing order entry"
                    compact
                  />
                }
              >
                <OrderFormDrawer
                  isOpen={orderFormOpen}
                  onClose={() => setOrderFormOpen(false)}
                  seedRows={orderFormSeedRows ?? undefined}
                />
              </Suspense>
            </ErrorBoundaryWrapper>
          )}
        </div>
      </ErrorBoundaryWrapper>
    );
  }

  // Desktop layout with sidebar
  return (
    <ErrorBoundaryWrapper section="PurchasingReceiving">
      <SidebarProvider defaultOpen={false} panelMode>
        <div className="flex h-full w-full bg-background text-foreground">
          {/* Sidebar Navigation */}
          <PurchRecSidebar
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden md:pl-[calc(var(--sidebar-width-icon)+1rem)] md:peer-data-[state=expanded]:pl-[calc(var(--sidebar-width)+1rem)]">
          {/* Top Header */}
          <div className="border-b border-border py-4 pl-4 pr-4 bg-background/95 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold capitalize">
                  {currentPage === "dashboard" && "Dashboard"}
                  {currentPage === "orders" && "Quick Orders"}
                  {currentPage === "receiving" && "Receiving"}
                  {currentPage === "dock-scanner" && "Dock Scanner"}
                  {currentPage === "inventory" && "Inventory Lots"}
                  {currentPage === "ledger" && "Stock Ledger"}
                  {currentPage === "categorization" && "Ingredient Setup"}
                  {currentPage === "invoices" && "Invoice Processing"}
                  {currentPage === "advanced-ordering" && "Advanced Ordering"}
                  {currentPage === "training" && "Training Materials"}
                  {currentPage === "walk-in" && "Walk-in Vendors"}
                  {currentPage === "approvals" && "Approval Hierarchy"}
                  {currentPage === "vendor-intel" && "Vendor & Supplier Intel"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {currentPage === "dashboard" && "Purchasing & Receiving Dashboard"}
                  {currentPage === "orders" && "Order guide and purchasing management"}
                  {currentPage === "receiving" && "Post deliveries and capture lot data"}
                  {currentPage === "dock-scanner" && "Scan invoices and purchase orders"}
                  {currentPage === "inventory" && "Monitor lots and expirations"}
                  {currentPage === "ledger" && "Audit stock movements and adjustments"}
                  {currentPage === "categorization" && "Configure ingredient categorization and portion types"}
                  {currentPage === "invoices" && "Process and manage vendor invoices"}
                  {currentPage === "advanced-ordering" && "Bulk ordering, recurring shipments, and forecasting"}
                  {currentPage === "training" && "Professional development and compliance materials"}
                  {currentPage === "walk-in" && "Manage walk-in vendors and emergency deliveries"}
                  {currentPage === "approvals" && "Spending authority, approval chain, and onboarding controls"}
                  {currentPage === "vendor-intel" && "Vendor catalog, SKU pricing, and supplier intelligence"}
                </p>
              </div>
              {role && (
                <Badge variant="outline">
                  {role}
                </Badge>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto py-4 pl-4 pr-4">
            {renderMainContent()}
          </div>
        </div>

          {/* Order Form Drawer */}
          {orderFormOpen && (
            <ErrorBoundaryWrapper section="Order Form">
              <Suspense
                fallback={
                  <PanelLoader
                    message="Loading order form"
                    note="Preparing order entry"
                    compact
                  />
                }
              >
                <OrderFormDrawer
                  isOpen={orderFormOpen}
                  onClose={() => setOrderFormOpen(false)}
                  seedRows={orderFormSeedRows ?? undefined}
                />
              </Suspense>
            </ErrorBoundaryWrapper>
          )}
        </div>
      </SidebarProvider>
    </ErrorBoundaryWrapper>
  );
}
