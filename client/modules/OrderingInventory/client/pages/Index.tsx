import React, { Suspense, lazy, useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getAndClearModuleTab } from "@/lib/module-tab-manager";
import {
  ChevronDown,
  Package,
  ShoppingCart,
  Warehouse,
  Layout,
  FileText,
  ClipboardCheck,
  Trash2,
  TrendingUp,
  BarChart3,
  Scan,
  AlertCircle,
  Mic,
  Smartphone,
  Tablet,
  ArrowRightLeft,
  Barcode,
  Wine,
  Search,
  Truck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

// Role-based access control
const PURCHASING_RECEVING_ROLES = [
  "ADMIN",
  "PURCHASING_MANAGER",
  "RECEIVING_MANAGER",
  "INVENTORY_MANAGER",
  "STOREROOM_MANAGER",
  "COMMISSARY_MANAGER",
  "FINANCE_MANAGER",
  "GENERAL_MANAGER",
];

// Helper function for safe lazy loading with error handling
function safeLazyLoad(importer: () => Promise<any>, fallbackName: string) {
  return lazy(() =>
    importer().catch((error) => {
      console.error(`Failed to load ${fallbackName}:`, error);
      return {
        default: () => (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load</h3>
              <p className="text-sm text-muted-foreground">
                Could not load {fallbackName}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {error?.message || "Unknown error"}
              </p>
            </div>
          </div>
        ),
      };
    }),
  );
}

// Lazy load all sections with error handling
const GenesisOrderingHub = safeLazyLoad(
  () => import("@/modules/Genesis/desktop/GenesisOrderingHub"),
  "Genesis Ordering Hub",
);
const CommissaryOrdering = safeLazyLoad(
  () => import("./sections/wrappers/CommissaryOrderingWrapper"),
  "Commissary Ordering",
);
const InventoryByOutlet = safeLazyLoad(
  () => import("./sections/wrappers/InventoryWrapper"),
  "Inventory",
);
const OrderForm = safeLazyLoad(
  () => import("./sections/wrappers/OrderFormWrapper"),
  "Order Form",
);
const QuickCounts = safeLazyLoad(
  () => import("./sections/wrappers/QuickCountsWrapper"),
  "Quick Counts",
);
const WasteTrackers = safeLazyLoad(
  () => import("./sections/wrappers/WasteTrackersWrapper"),
  "Waste Trackers",
);
const StorageLayout = safeLazyLoad(
  () => import("./sections/StorageLayout"),
  "Storage Layout",
);
const CheckbookPanel = safeLazyLoad(
  () => import("./sections/Checkbook"),
  "Checkbook",
);
const InvoiceScan = safeLazyLoad(
  () => import("./sections/InvoiceScan"),
  "Invoice Scan",
);
const InboundDashboard = safeLazyLoad(
  () => import("./sections/InboundDashboard"),
  "Inbound Dashboard",
);
const InventoryLookup = safeLazyLoad(
  () => import("./sections/InventoryLookup"),
  "Inventory Lookup",
);
const PurchasingHub = safeLazyLoad(
  () => import("@/modules/PurchasingReceiving"),
  "Purchasing & Receiving Hub",
);
const PurchasingPage = safeLazyLoad(
  () => import("@/modules/PurchasingReceiving/client/pages/Purchasing"),
  "Purchasing",
);
const ReceivingPage = safeLazyLoad(
  () => import("@/modules/PurchasingReceiving/client/pages/ReceivingDashboard"),
  "Receiving",
);
const BarcodeReceiver = safeLazyLoad(
  () => import("@/modules/PurchasingReceiving/client/pages/BarcodeReceiver"),
  "Barcode Receiver",
);
const InventorySyncWorkflow = safeLazyLoad(
  () =>
    import("@/modules/PurchasingReceiving/client/pages/InventorySyncWorkflow"),
  "Multi-Outlet Inventory",
);
const InventoryVoiceCapture = safeLazyLoad(
  () =>
    import("@/modules/PurchasingReceiving/client/pages/InventoryVoiceCapture"),
  "Voice Inventory Capture",
);
const MobileInventoryOperations = safeLazyLoad(
  () =>
    import("@/modules/PurchasingReceiving/client/pages/MobileInventoryOperations"),
  "Mobile Inventory",
);
const TabletInventoryShelfToSheet = safeLazyLoad(
  () =>
    import("@/modules/Culinary/client/pages/sections/TabletInventoryShelfToSheet"),
  "Tablet Inventory",
);
const TabletReceivingCheckIn = safeLazyLoad(
  () =>
    import("@/modules/Culinary/client/pages/sections/TabletReceivingCheckIn"),
  "Tablet Receiving",
);
const TabletInventoryTransfer = safeLazyLoad(
  () =>
    import("@/modules/Culinary/client/pages/sections/TabletInventoryTransfer"),
  "Tablet Transfers",
);
const TabletLabels = safeLazyLoad(
  () => import("@/modules/Culinary/client/pages/sections/TabletLabels"),
  "Tablet Labels",
);
const TabletWasteTracking = safeLazyLoad(
  () => import("@/modules/Culinary/client/pages/sections/TabletWasteTracking"),
  "Tablet Waste",
);
const TableOrdering = safeLazyLoad(
  () => import("./sections/TableOrdering"),
  "Table Ordering",
);
const MobileOrdering = safeLazyLoad(
  () => import("./sections/MobileOrdering"),
  "Vendor Ordering",
);
const OnHandInventory = safeLazyLoad(
  () => import("./sections/OnHandInventory"),
  "On-Hand Inventory",
);
const LiquorInventory = safeLazyLoad(
  () => import("@/modules/MixologySommelier/client/pages/LiquorInventory"),
  "Liquor Inventory",
);

interface NavSection {
  title: string;
  items: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    component: React.ComponentType;
    requiredRoles?: string[];
    description?: string;
  }>;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "ORDERING",
    items: [
      {
        id: "ai-procurement",
        label: "AI PROCUREMENT",
        icon: TrendingUp,
        component: GenesisOrderingHub,
        description: "AI-first ordering with budget tracking",
      },
      {
        id: "order-form",
        label: "ORDER FORM",
        icon: FileText,
        component: OrderForm,
        description: "Create and manage purchase orders",
      },
      {
        id: "purchasing",
        label: "PURCHASING HUB",
        icon: ShoppingCart,
        component: PurchasingPage,
        description: "Vendor purchasing and PO workflows",
      },
      {
        id: "commissary",
        label: "COMMISSARY",
        icon: Warehouse,
        component: CommissaryOrdering,
        description: "Internal fulfillment ordering",
      },
      {
        id: "vendor-ordering",
        label: "VENDOR ORDERING",
        icon: Truck,
        component: MobileOrdering,
        description: "Place purchase orders from vendors",
      },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      {
        id: "on-hand",
        label: "ON-HAND INVENTORY",
        icon: Package,
        component: OnHandInventory,
        description: "Total on-hand stock levels and values",
      },
      {
        id: "inventory-outlet",
        label: "INVENTORY BY OUTLET",
        icon: Package,
        component: InventoryByOutlet,
        description: "Inventory by outlet (FOH/BOH)",
      },
      {
        id: "inventory-lookup",
        label: "INVENTORY LOOKUP",
        icon: Search,
        component: InventoryLookup,
        description: "Full item lookup across outlets",
      },
      {
        id: "inventory-sync",
        label: "OUTLET SYNC",
        icon: BarChart3,
        component: InventorySyncWorkflow,
        description: "Multi-outlet inventory, par levels, transfers",
      },
      {
        id: "liquor-inventory",
        label: "LIQUOR INVENTORY",
        icon: Wine,
        component: LiquorInventory,
        description: "Mixology bottle tracking & usage",
      },
      {
        id: "voice-capture",
        label: "VOICE CAPTURE",
        icon: Mic,
        component: InventoryVoiceCapture,
        description: "Hands-free inventory capture",
      },
      {
        id: "quick-counts",
        label: "QUICK COUNTS",
        icon: ClipboardCheck,
        component: QuickCounts,
        description: "Spot check inventory counts",
      },
      {
        id: "storage-layout",
        label: "STORAGE LAYOUT",
        icon: Layout,
        component: StorageLayout,
        description: "Visual storage area setup",
      },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      {
        id: "inbound-dashboard",
        label: "INBOUND DASHBOARD",
        icon: Truck,
        component: InboundDashboard,
        description: "Incoming deliveries + outlet check-in",
      },
      {
        id: "receiving",
        label: "RECEIVING",
        icon: Scan,
        component: ReceivingPage,
        description: "Receiving dashboards and workflows",
      },
      {
        id: "checkbook",
        label: "CHECKBOOK",
        icon: BarChart3,
        component: CheckbookPanel,
        description: "Real-time COGS vs sales and budget",
      },
      {
        id: "barcode-receiver",
        label: "BARCODE RECEIVER",
        icon: Barcode,
        component: BarcodeReceiver,
        description: "Scan and check-in received items",
      },
      {
        id: "invoice-scan",
        label: "INVOICE SCAN",
        icon: Scan,
        component: InvoiceScan,
        description: "Scan invoices to inventory (by outlet)",
        requiredRoles: PURCHASING_RECEVING_ROLES,
      },
      {
        id: "purchasing-receiving",
        label: "PURCHASING & RECEIVING",
        icon: ShoppingCart,
        component: PurchasingHub,
        description: "Full purchasing/receiving suite (legacy)",
      },
      {
        id: "waste-trackers",
        label: "WASTE TRACKERS",
        icon: Trash2,
        component: WasteTrackers,
        description: "Track and manage waste",
      },
    ],
  },
  {
    title: "MOBILE & TABLET",
    items: [
      {
        id: "mobile-inventory",
        label: "MOBILE INVENTORY",
        icon: Smartphone,
        component: MobileInventoryOperations,
        description: "Offline-first mobile inventory ops",
      },
      {
        id: "tablet-inventory",
        label: "TABLET INVENTORY",
        icon: Tablet,
        component: TabletInventoryShelfToSheet,
        description: "Tablet shelf counts and low stock",
      },
      {
        id: "tablet-receiving",
        label: "TABLET RECEIVING",
        icon: Scan,
        component: TabletReceivingCheckIn,
        description: "Tablet receiving check-in",
      },
      {
        id: "tablet-transfers",
        label: "TABLET TRANSFERS",
        icon: ArrowRightLeft,
        component: TabletInventoryTransfer,
        description: "Tablet inter-outlet transfers",
      },
      {
        id: "tablet-labels",
        label: "TABLET LABELS",
        icon: Package,
        component: TabletLabels,
        description: "Tablet label printing",
      },
      {
        id: "tablet-waste",
        label: "TABLET WASTE",
        icon: Trash2,
        component: TabletWasteTracking,
        description: "Tablet waste tracking",
      },
    ],
  },
];

const LoadingFallback = () => (
  <div className="flex items-center justify-center w-full h-full py-12">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
      <p className="text-sm text-muted-foreground">Loading section...</p>
    </div>
  </div>
);

function OrderingInventoryContent() {
  const { user } = useAuth();
  const { state } = useSidebar();

  const resolveInitialSection = () => {
    if (typeof window === "undefined") return "vendor-ordering";
    const tab = getAndClearModuleTab("inventory");
    if (tab) return tab;
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "vendor-ordering";
  };

  const [activeSection, setActiveSection] = useState(resolveInitialSection);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    ORDERING: true,
    INVENTORY: false,
    OPERATIONS: false,
    "MOBILE & TABLET": false,
  });

  // Check if user has required role for restricted sections
  const hasRequiredRole = (requiredRoles?: string[]): boolean => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (!user) return false;
    const userRole = String(
      (user as any).role || (user as any).userRole || "STAFF",
    ).toUpperCase();
    return requiredRoles.some((role) => role === userRole);
  };

  // Filter nav sections based on role
  const filteredNavSections = useMemo(() => {
    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => hasRequiredRole(item.requiredRoles)),
    })).filter((section) => section.items.length > 0);
  }, [user]);

  // Find active component
  const activeComponent = useMemo(() => {
    for (const section of filteredNavSections) {
      const item = section.items.find((i) => i.id === activeSection);
      if (item && hasRequiredRole(item.requiredRoles)) {
        return item.component;
      }
    }
    // If no component found, default to first available
    if (filteredNavSections.length > 0 && filteredNavSections[0]?.items[0]) {
      const firstItem = filteredNavSections[0].items[0];
      return firstItem.component;
    }
    return null;
  }, [activeSection, filteredNavSections]);

  // Set default active section only on first mount if no valid section is active
  useEffect(() => {
    const isValid = filteredNavSections.some((s) => s.items.some((i) => i.id === activeSection));
    if (!isValid && filteredNavSections.length > 0 && filteredNavSections[0]?.items[0]) {
      setActiveSection(filteredNavSections[0].items[0].id);
    }
  }, []);

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }));
  };

  const handleSelectSection = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  // Find current section title and description
  const currentItem = useMemo(() => {
    for (const section of filteredNavSections) {
      const item = section.items.find((i) => i.id === activeSection);
      if (item) {
        return { ...item, sectionTitle: section.title };
      }
    }
    return null;
  }, [activeSection, filteredNavSections]);

  const Component = activeComponent;

  return (
    <div className="flex h-full w-full bg-background">
      {/* Sidebar */}
      <Sidebar>
        <SidebarHeader>
          <h2 className="text-xs font-semibold truncate text-sidebar-foreground uppercase tracking-wide">
            Inventory
          </h2>
        </SidebarHeader>

        <SidebarContent>
          {filteredNavSections.map((section) => (
            <SidebarGroup key={section.title}>
              <SidebarGroupLabel asChild>
                <button
                  onClick={() => toggleSection(section.title)}
                  className={cn(
                    "w-full flex items-center gap-2 transition-colors",
                    "hover:text-sidebar-foreground/80 text-sidebar-foreground/70",
                  )}
                >
                  <span className="flex-1 text-left">{section.title}</span>
                  <ChevronDown
                    className={cn(
                      "w-3 h-3 transition-transform",
                      expandedSections[section.title] ? "" : "-rotate-90",
                    )}
                  />
                </button>
              </SidebarGroupLabel>

              {expandedSections[section.title] && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;
                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleSelectSection(item.id)}
                            isActive={isActive}
                            tooltip={item.label}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        {currentItem && (
          <div className="border-b border-border bg-background px-6 py-4">
            <h1 className="text-2xl font-bold">{currentItem.label}</h1>
            {currentItem.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {currentItem.description}
              </p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {Component ? (
            <Suspense fallback={<LoadingFallback />}>
              <Component />
            </Suspense>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Section Available</h3>
                <p className="text-sm text-muted-foreground">
                  Please select a section from the menu.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrderingInventoryIndex() {
  return (
    <SidebarProvider defaultOpen={false} panelMode>
      <div className="w-full h-full bg-background text-foreground overflow-hidden flex flex-col">
        <div className="absolute top-4 right-4 z-50">
          <ModuleChatButton
            moduleId="ordering-inventory"
            moduleName="Ordering & Inventory"
            variant="outline"
            size="md"
          />
        </div>
        <OrderingInventoryContent />
      </div>
    </SidebarProvider>
  );
}
