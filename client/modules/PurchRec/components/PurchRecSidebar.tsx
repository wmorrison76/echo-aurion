import React from "react";
import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  ListChecks,
  QrCode,
  Settings,
  FileText,
  GraduationCap,
  Zap,
  Truck,
  CheckCircle2,
  ScanLine,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { Role } from "@shared/auth";

export type SidebarPage = "dashboard" | "orders" | "receiving" | "dock-scanner" | "inventory" | "ledger" | "categorization" | "invoices" | "advanced-ordering" | "training" | "walk-in" | "approvals" | "vendor-intel";

interface NavItem {
  id: SidebarPage;
  label: string;
  icon: React.ReactNode;
  roles: readonly Role[];
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  expanded?: boolean;
  collapsible?: boolean;
}

const PURCHASING_ROLES: readonly Role[] = ["Admin", "Manager"];
const RECEIVING_ROLES: readonly Role[] = ["Admin", "Manager", "Receiver"];
const INVENTORY_ROLES: readonly Role[] = ["Admin", "Manager", "Chef", "Finance"];
const LEDGER_ROLES: readonly Role[] = ["Admin", "Manager", "Finance"];
const CONFIGURATION_ROLES: readonly Role[] = ["Admin", "Manager"];

const NAV_GROUPS: NavGroup[] = [
  {
    label: "OPERATIONS",
    collapsible: false,
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-5 w-5" />,
        roles: [...PURCHASING_ROLES, ...RECEIVING_ROLES],
        badge: "Live",
      },
      {
        id: "receiving",
        label: "Receiving",
        icon: <Package className="h-5 w-5" />,
        roles: RECEIVING_ROLES,
      },
      {
        id: "dock-scanner",
        label: "Dock Scanner",
        icon: <QrCode className="h-5 w-5" />,
        roles: RECEIVING_ROLES,
      },
      {
        id: "walk-in",
        label: "Walk-in Vendors",
        icon: <Truck className="h-5 w-5" />,
        roles: RECEIVING_ROLES,
      },
    ],
  },
  {
    label: "ORDERING & PURCHASING",
    collapsible: true,
    expanded: true,
    items: [
      {
        id: "orders",
        label: "Quick Orders",
        icon: <ShoppingCart className="h-5 w-5" />,
        roles: PURCHASING_ROLES,
      },
      {
        id: "advanced-ordering",
        label: "Advanced Ordering",
        icon: <Zap className="h-5 w-5" />,
        roles: PURCHASING_ROLES,
      },
    ],
  },
  {
    label: "INVOICE MANAGEMENT",
    collapsible: true,
    expanded: false,
    items: [
      {
        id: "invoices",
        label: "Invoice Intelligence",
        icon: <FileText className="h-5 w-5" />,
        roles: PURCHASING_ROLES,
        badge: "3",
      },
      {
        id: "approvals",
        label: "Approval Hierarchy",
        icon: <CheckCircle2 className="h-5 w-5" />,
        roles: PURCHASING_ROLES,
      },
    ],
  },
  {
    label: "INVENTORY & VENDORS",
    collapsible: true,
    expanded: true,
    items: [
      {
        id: "inventory",
        label: "Inventory Receiving",
        icon: <Package className="h-5 w-5" />,
        roles: PURCHASING_ROLES,
      },
      {
        id: "vendor-intel",
        label: "Vendor & Supplier Intel",
        icon: <ScanLine className="h-5 w-5" />,
        roles: PURCHASING_ROLES,
      },
    ],
  },
  {
    label: "INVENTORY & ANALYTICS",
    collapsible: true,
    expanded: false,
    items: [
      {
        id: "inventory",
        label: "Inventory Lots",
        icon: <ListChecks className="h-5 w-5" />,
        roles: INVENTORY_ROLES,
      },
      {
        id: "ledger",
        label: "Stock Ledger",
        icon: <BarChart3 className="h-5 w-5" />,
        roles: LEDGER_ROLES,
      },
    ],
  },
  {
    label: "TRAINING & COMPLIANCE",
    collapsible: true,
    expanded: false,
    items: [
      {
        id: "training",
        label: "Training Materials",
        icon: <GraduationCap className="h-5 w-5" />,
        roles: CONFIGURATION_ROLES,
      },
      {
        id: "categorization",
        label: "Ingredient Setup",
        icon: <Settings className="h-5 w-5" />,
        roles: CONFIGURATION_ROLES,
      },
    ],
  },
];

interface PurchRecSidebarProps {
  currentPage: SidebarPage;
  onPageChange: (page: SidebarPage) => void;
}

export function PurchRecSidebar({
  currentPage,
  onPageChange,
}: PurchRecSidebarProps) {
  let user = null;
  let role = null;

  try {
    const authContext = useAuth();
    user = authContext?.user ?? null;
    role = user?.role ?? null;
  } catch (err) {
    console.warn("[PurchRecSidebar] AuthContext not available:", err);
    role = null;
  }

  const { state, isMobile, setOpen, setOpenMobile } = useSidebar();

  const handlePageChange = useCallback(
    (page: SidebarPage) => {
      onPageChange(page);
      if (isMobile) {
        setOpenMobile(false);
      } else {
        setOpen(false);
      }
    },
    [isMobile, onPageChange, setOpen, setOpenMobile],
  );

  const hasAccessToPage = (pageRoles: readonly Role[]): boolean => {
    // Allow demo access if no role is set
    return !role || pageRoles.includes(role);
  };

  const allAccessiblePages = NAV_GROUPS.flatMap((group) =>
    group.items
      .filter((item) => hasAccessToPage(item.roles))
      .map((item) => item.id)
  );

  // Default to first accessible page if current page is not accessible
  const activePage = allAccessiblePages.includes(currentPage)
    ? currentPage
    : allAccessiblePages[0];

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/5" />

      <SidebarContent className="overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) =>
            hasAccessToPage(item.roles)
          );

          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label}>
              {state === "expanded" && (
                <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-widest text-white/45 hover:text-white/65">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => handlePageChange(item.id)}
                        isActive={activePage === item.id}
                        className={cn(
                          "transition-all border backdrop-blur-xl",
                          activePage === item.id
                            ? "border-white/15 bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)] dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-100"
                            : "border-transparent bg-white/5 text-slate-200 hover:border-white/10 hover:bg-white/10 hover:text-white dark:text-slate-100 dark:hover:border-cyan-300/15 dark:hover:bg-white/10 dark:hover:text-cyan-100"
                        )}
                        title={state === "collapsed" ? item.label : undefined}
                      >
                        <span className="flex-shrink-0 h-4 w-4">
                          {item.icon}
                        </span>
                        {state === "expanded" && (
                          <>
                            <span className="flex-1 text-left text-xs">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-slate-700/60 text-slate-200 text-xs font-semibold">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      {state === "expanded" && role && (
        <div className="border-t border-slate-700/40 p-3">
          <p className="text-xs text-slate-400">
            <span className="font-semibold">{role}</span>
          </p>
        </div>
      )}
    </Sidebar>
  );
}
