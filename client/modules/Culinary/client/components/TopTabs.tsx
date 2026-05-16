import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  ChefHat,
  ChevronLeft,
  ChevronDown,
  ListChecks,
  DollarSign,
  Warehouse,
  FileText,
  ImageIcon,
  PencilLine,
  Shield,
  Leaf,
  Save,
  ShoppingCart,
  Trash,
  UtensilsCrossed,
  Beaker,
  Atom,
  Palette,
  Cake,
  Wind,
  Zap,
  Smartphone,
  ArrowRightLeft,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/context/LanguageContext";

type NavShortcut = {
  key: string;
  display: string;
};

type NavItemConfig = {
  to: string;
  labelKey: string;
  fallback: string;
  icon: LucideIcon;
  shortcut?: NavShortcut;
};

type NavItem = NavItemConfig & { label: string };

type NavGroup = {
  id: string;
  labelKey: string;
  fallback: string;
  items: NavItemConfig[];
};

const navGroups: NavGroup[] = [
  {
    id: "training",
    labelKey: "nav.group.training",
    fallback: "ECHO TRAINING",
    items: [
      {
        to: "/?tab=echo-training",
        labelKey: "nav.echoTraining",
        fallback: "ECHO TRAINING CENTER",
        icon: Zap,
      },
    ],
  },
  {
    id: "recipes-design",
    labelKey: "nav.group.recipesDesign",
    fallback: "RECIPES & DESIGN",
    items: [
      {
        to: "/?tab=search",
        labelKey: "nav.recipes",
        fallback: "RECIPES",
        icon: BookMarked,
        shortcut: { key: "Digit1", display: "1" },
      },
      {
        to: "/?tab=add-recipe",
        labelKey: "nav.addRecipe",
        fallback: "ADD RECIPE",
        icon: PencilLine,
        shortcut: { key: "Digit2", display: "2" },
      },
      {
        to: "/?tab=menu-design",
        labelKey: "nav.menuDesignStudio",
        fallback: "MENU DESIGN STUDIO",
        icon: ChefHat,
        shortcut: { key: "KeyM", display: "M" },
      },
      {
        to: "/?tab=gallery",
        labelKey: "nav.gallery",
        fallback: "GALLERY",
        icon: ImageIcon,
        shortcut: { key: "Digit9", display: "9" },
      },
      {
        to: "/?tab=dish-assembly",
        labelKey: "nav.dishAssembly",
        fallback: "DISH ASSEMBLY",
        icon: UtensilsCrossed,
        shortcut: { key: "KeyD", display: "D" },
      },
    ],
  },
  {
    id: "innovation",
    labelKey: "nav.group.innovation",
    fallback: "INNOVATION & R&D",
    items: [
      {
        to: "/?tab=rdlabs",
        labelKey: "nav.rdlabs",
        fallback: "R&D LABS",
        icon: Atom,
      },
    ],
  },
  {
    id: "operations",
    labelKey: "nav.group.operations",
    fallback: "OPERATIONS",
    items: [
      {
        to: "/?tab=production",
        labelKey: "nav.production",
        fallback: "PRODUCTION",
        icon: Warehouse,
        shortcut: { key: "Digit4", display: "4" },
      },
      {
        to: "/?tab=server-notes",
        labelKey: "nav.serverNotes",
        fallback: "SERVER NOTES",
        icon: ListChecks,
        shortcut: { key: "Digit3", display: "3" },
      },
      {
        to: "/?tab=operations-docs",
        labelKey: "nav.operationsDocs",
        fallback: "OPERATIONS DOCS",
        icon: FileText,
        shortcut: { key: "KeyO", display: "O" },
      },
      {
        to: "/tablet/waste",
        labelKey: "nav.tabletWaste",
        fallback: "TABLET WASTE",
        icon: Smartphone,
      },
      {
        to: "/tablet/transfers",
        labelKey: "nav.tabletTransfers",
        fallback: "TABLET TRANSFERS",
        icon: Smartphone,
      },
    ],
  },
  {
    id: "supply-chain",
    labelKey: "nav.group.supplyChain",
    fallback: "SUPPLY CHAIN",
    items: [
      {
        to: "/?tab=purch-rec",
        labelKey: "nav.purchasingReceiving",
        fallback: "PURCH/REC",
        icon: ShoppingCart,
        shortcut: { key: "Digit0", display: "0" },
      },
      {
        to: "/?tab=inventory-transfers",
        labelKey: "nav.inventoryTransfers",
        fallback: "INVENTORY TRANSFERS",
        icon: ArrowRightLeft,
      },
    ],
  },
  {
    id: "analysis-compliance",
    labelKey: "nav.group.analysisCompliance",
    fallback: "ANALYSIS & COMPLIANCE",
    items: [
      {
        to: "/?tab=plate-costing",
        labelKey: "nav.plateCosting",
        fallback: "COSTING",
        icon: DollarSign,
      },
      {
        to: "/?tab=haccp",
        labelKey: "nav.haccpCompliance",
        fallback: "HACCP/COMPLIANCE",
        icon: Shield,
        shortcut: { key: "Digit8", display: "8" },
      },
      {
        to: "/?tab=waste-tracking",
        labelKey: "nav.wasteTracking",
        fallback: "WASTE TRACKING",
        icon: Trash,
      },
      {
        to: "/?tab=nutrition",
        labelKey: "nav.nutritionAllergens",
        fallback: "NUTRITION/ALLERGENS",
        icon: Leaf,
        shortcut: { key: "Digit7", display: "7" },
      },
    ],
  },
];

type DissolvingTextProps = {
  collapsed: boolean;
  children: ReactNode;
  className?: string;
  ariaHidden?: boolean;
  expandedMaxWidthClass?: string;
  expandedWrapperClassName?: string;
  collapsedWrapperClassName?: string;
  expandedClassName?: string;
  collapsedClassName?: string;
};

function DissolvingText({
  collapsed,
  children,
  className,
  ariaHidden,
  expandedMaxWidthClass = "max-w-full",
  expandedWrapperClassName,
  collapsedWrapperClassName,
  expandedClassName,
  collapsedClassName,
}: DissolvingTextProps) {
  return (
    <span
      aria-hidden={ariaHidden}
      className={cn(
        "relative block overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out",
        collapsed
          ? cn("max-w-0", collapsedWrapperClassName)
          : cn(expandedMaxWidthClass, expandedWrapperClassName),
      )}
    >
      <span
        className={cn(
          "block transition-all duration-300 ease-out",
          collapsed
            ? cn("opacity-0 blur-sm translate-y-[2px]", collapsedClassName)
            : cn("opacity-100 blur-0 translate-y-0", expandedClassName),
          className,
        )}
      >
        {children}
      </span>
    </span>
  );
}

type TabLinkProps = {
  to: string;
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
  shortcutDisplay?: string;
  onNavigate?: () => void;
};

function TabLink({
  to,
  label,
  icon: Icon,
  collapsed,
  shortcutDisplay,
  onNavigate,
}: TabLinkProps) {
  const loc = useLocation();
  const active = new URLSearchParams(loc.search).get("tab") ?? "search";
  const value = new URLSearchParams(to.split("?")[1] || "").get("tab") || "";
  const isActive = active === value;

  const link = (
    <Link
      to={to}
      aria-label={label}
      className={cn(
        "group flex w-full items-center text-sm font-medium transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring relative",
        "hover:bg-white/10 dark:hover:bg-white/5 rounded-lg",
        collapsed
          ? "justify-center gap-0 px-1.5 py-1.5"
          : "gap-1.5 px-2.5 py-1.5",
        isActive ? "text-primary" : "text-foreground/60 hover:text-foreground",
      )}
      onClick={onNavigate}
    >
      <Icon
        className={cn(
          "h-4 w-4 flex-shrink-0 transition-all duration-500",
          isActive
            ? "scale-110"
            : "group-hover:scale-110 group-hover:translate-y-[-2px]",
        )}
        aria-hidden
      />
      <DissolvingText
        collapsed={collapsed}
        ariaHidden={collapsed}
        className="text-ellipsis"
        expandedClassName="ml-2"
        collapsedClassName="ml-0"
        expandedMaxWidthClass="max-w-[180px]"
      >
        {label}
      </DissolvingText>
    </Link>
  );

  if (!collapsed) {
    return link;
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        className="text-xs font-medium z-[9999]"
        style={{ zIndex: 9999 }}
      >
        <div className="flex flex-col items-start">
          <span>{label}</span>
          {shortcutDisplay ? (
            <span className="mt-1 text-[10px] font-normal uppercase tracking-[0.12em] text-muted-foreground">
              {shortcutDisplay}
            </span>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

type GroupHeaderProps = {
  label: string;
  collapsed: boolean;
  isExpanded: boolean;
  onToggle: () => void;
};

function GroupHeader({
  label,
  collapsed,
  isExpanded,
  onToggle,
}: GroupHeaderProps) {
  if (collapsed) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center justify-between px-2.5 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-foreground/50 hover:text-foreground/70 transition-colors duration-300",
        "hover:bg-white/5 dark:hover:bg-white/5 rounded-lg",
      )}
    >
      <DissolvingText collapsed={collapsed} ariaHidden={collapsed}>
        {label}
      </DissolvingText>
      <ChevronDown
        className={cn(
          "h-3 w-3 transition-transform duration-300",
          isExpanded ? "rotate-0" : "-rotate-90",
        )}
      />
    </button>
  );
}

export default function TopTabs() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const storedPreferenceRef = useRef(false);
  const collapseTimerRef = useRef<number | null>(null);
  const asideRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const stored = window.sessionStorage.getItem("nav:collapsed");
    if (stored === "true" || stored === "false") {
      storedPreferenceRef.current = true;
      return stored === "true";
    }
    return false;
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["recipes-design", "innovation"]),
  );

  const shortcutLabel = useMemo(() => {
    if (typeof navigator === "undefined") {
      return "Ctrl";
    }
    return /(mac|iphone|ipad|ipod)/i.test(navigator.platform) ? "⌘" : "Ctrl";
  }, []);

  useEffect(() => {
    if (storedPreferenceRef.current) {
      return;
    }

    collapseTimerRef.current = window.setTimeout(() => {
      setCollapsed((prev) => {
        if (prev) return prev;
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("nav:collapsed", "true");
        }
        return true;
      });
    }, 425);

    return () => {
      if (collapseTimerRef.current !== null) {
        window.clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // No sidebar offset needed - module fills panel naturally
  }, []);

  const navToggleShortcut = `${shortcutLabel}+Shift+N`;

  const translatedGroups: (NavGroup & { label: string; items: NavItem[] })[] =
    useMemo(
      () =>
        navGroups.map((group) => ({
          ...group,
          label: t(group.labelKey, group.fallback),
          items: group.items.map((item) => ({
            ...item,
            label: t(item.labelKey, item.fallback),
          })),
        })),
      [t],
    );

  const navShortcutMap = useMemo(() => {
    const map: Record<string, string> = {};
    navGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.shortcut) {
          map[item.shortcut.key] = item.to;
        }
      });
    });
    return map;
  }, []);

  const setCollapsedManual = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      storedPreferenceRef.current = true;
      if (collapseTimerRef.current !== null) {
        window.clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
      setCollapsed((prev) => {
        const next =
          typeof value === "function"
            ? (value as (state: boolean) => boolean)(prev)
            : value;
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("nav:collapsed", String(next));
        }
        return next;
      });
    },
    [],
  );

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isMac = shortcutLabel === "⌘";

    const handleKeydown = (event: KeyboardEvent) => {
      const modifier = isMac ? event.metaKey : event.ctrlKey;
      if (!modifier || !event.shiftKey) return;
      if (event.key.toLowerCase() !== "n") return;
      event.preventDefault();
      setCollapsedManual((prev) => !prev);
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [setCollapsedManual, shortcutLabel]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isMac = shortcutLabel === "⌘";

    const handleNavShortcut = (event: KeyboardEvent) => {
      const modifier = isMac ? event.metaKey : event.ctrlKey;
      if (!modifier || event.repeat) return;
      const target = navShortcutMap[event.code];
      if (!target) return;
      event.preventDefault();
      navigate(target);
    };

    window.addEventListener("keydown", handleNavShortcut);
    return () => window.removeEventListener("keydown", handleNavShortcut);
  }, [navigate, navShortcutMap, shortcutLabel]);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!asideRef.current) return;
      const target = event.target as Node;

      // Check if click is outside the sidebar
      if (!asideRef.current.contains(target)) {
        // Only close if sidebar is expanded
        if (!collapsed) {
          setCollapsedManual(true);
        }
      }
    };

    // Only attach listener if sidebar is expanded
    if (!collapsed) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [collapsed, setCollapsedManual]);

  return (
    <>
      <TooltipProvider delayDuration={collapsed ? 0 : 200}>
        <aside
          ref={asideRef}
          className={cn(
            "pointer-events-auto absolute left-0 top-20 z-[3200] flex flex-col overflow-hidden rounded-3xl transition-all duration-1000 group",
            "backdrop-blur-2xl ",
            collapsed ? "w-14 space-y-2 p-2" : "w-60 space-y-2 p-4",
          )}
          style={{
            maxHeight: "calc(100% - 80px)",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderWidth: "1.5px",
            borderColor: document.documentElement.classList.contains("dark")
              ? "rgba(200, 169, 126, 0.25)"
              : "rgba(0, 0, 0, 0.1)",
            boxShadow: document.documentElement.classList.contains("dark")
              ? "0 8px 32px 0 rgba(31, 38, 135, 0.02), 0 0 0 1.5px rgba(200, 169, 126, 0.25), 0 0 24px rgba(200, 169, 126, 0.12)"
              : "0 8px 32px 0 rgba(31, 38, 135, 0.02), 0 0 0 1.5px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.08)",
          }}
          onMouseEnter={(e) => {
            const isDark = document.documentElement.classList.contains("dark");
            if (isDark) {
              e.currentTarget.style.borderColor = "#c8a97e";
              e.currentTarget.style.boxShadow =
                "0 8px 32px 0 rgba(31, 38, 135, 0.08), 0 0 0 1.5px rgba(200, 169, 126, 0.5), 0 0 32px rgba(200, 169, 126, 0.25), 0 0 20px rgba(200, 169, 126, 0.15)";
            } else {
              e.currentTarget.style.borderColor = "#000000";
              e.currentTarget.style.boxShadow =
                "0 8px 32px 0 rgba(31, 38, 135, 0.12), 0 0 0 1.5px rgba(0, 0, 0, 0.25), 0 8px 20px rgba(0, 0, 0, 0.12)";
            }
          }}
          onMouseLeave={(e) => {
            const isDark = document.documentElement.classList.contains("dark");
            if (isDark) {
              e.currentTarget.style.borderColor = "rgba(200, 169, 126, 0.25)";
              e.currentTarget.style.boxShadow =
                "0 8px 32px 0 rgba(31, 38, 135, 0.02), 0 0 0 1.5px rgba(200, 169, 126, 0.25), 0 0 24px rgba(200, 169, 126, 0.12)";
            } else {
              e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.1)";
              e.currentTarget.style.boxShadow =
                "0 8px 32px 0 rgba(31, 38, 135, 0.02), 0 0 0 1.5px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.08)";
            }
          }}
        >
          <div className="relative flex h-full flex-col">
            {!collapsed ? (
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground/50 px-2.5 py-0.5">
                Navigation
              </span>
            ) : null}

            <nav
              className={cn(
                "max-h-[70vh] space-y-2 overflow-y-auto pr-1 transition-all duration-700",
                collapsed && "pr-0",
              )}
            >
              {translatedGroups.map((group) => (
                <div key={group.id} className="space-y-1">
                  <GroupHeader
                    label={group.label}
                    collapsed={collapsed}
                    isExpanded={expandedGroups.has(group.id)}
                    onToggle={() => toggleGroup(group.id)}
                  />

                  {(collapsed || expandedGroups.has(group.id)) && (
                    <div className={cn(collapsed ? "space-y-1" : "space-y-1")}>
                      {group.items.map((item) => (
                        <TabLink
                          key={item.to}
                          to={item.to}
                          label={item.label}
                          icon={item.icon}
                          collapsed={collapsed}
                          shortcutDisplay={
                            item.shortcut
                              ? `${shortcutLabel}+${item.shortcut.display}`
                              : undefined
                          }
                          onNavigate={() => setCollapsedManual(true)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>


            <button
              type="button"
              onClick={() => setCollapsedManual((prev) => !prev)}
              className="group absolute right-[-18px] top-1/2 z-10 -translate-y-1/2 select-none rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              style={{
                background: document.documentElement.classList.contains("dark")
                  ? "rgba(255, 255, 255, 0.15)"
                  : "rgba(0, 0, 0, 0.12)",
                backdropFilter: "blur(20px)",
                border: document.documentElement.classList.contains("dark")
                  ? "1px solid #c8a97e"
                  : "1px solid rgba(0, 0, 0, 0.3)",
                boxShadow: document.documentElement.classList.contains("dark")
                  ? "0 8px 32px 0 rgba(31, 38, 135, 0.1)"
                  : "0 8px 32px 0 rgba(0, 0, 0, 0.08)",
                padding: "10px 6px",
              }}
              onMouseEnter={(e) => {
                const isDark =
                  document.documentElement.classList.contains("dark");
                if (isDark) {
                  e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.25)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 32px 0 rgba(31, 38, 135, 0.2)";
                } else {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.18)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 32px 0 rgba(0, 0, 0, 0.15), 0 0 0 1.5px rgba(0, 0, 0, 0.2)";
                }
              }}
              onMouseLeave={(e) => {
                const isDark =
                  document.documentElement.classList.contains("dark");
                if (isDark) {
                  e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.15)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 32px 0 rgba(31, 38, 135, 0.1)";
                } else {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.12)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 32px 0 rgba(0, 0, 0, 0.08)";
                }
              }}
              aria-label={
                collapsed ? "Expand navigation" : "Collapse navigation"
              }
              aria-pressed={!collapsed}
              aria-expanded={!collapsed}
              title={`${collapsed ? "Expand navigation" : "Collapse navigation"} (${navToggleShortcut})`}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className={cn(
                    "block h-4 w-0.5 rounded-full bg-primary/80 transition-all duration-300 dark:bg-[#c8a97e]",
                    collapsed
                      ? "translate-y-0 rotate-0"
                      : "-translate-y-[3px] rotate-45",
                  )}
                />
                <span
                  className={cn(
                    "block h-4 w-0.5 rounded-full bg-primary/80 transition-all duration-300 dark:bg-[#c8a97e]",
                    collapsed
                      ? "opacity-100 scale-y-100"
                      : "opacity-0 scale-y-0",
                  )}
                />
                <span
                  className={cn(
                    "block h-4 w-0.5 rounded-full bg-primary/80 transition-all duration-300 dark:bg-[#c8a97e]",
                    collapsed
                      ? "translate-y-0 rotate-0"
                      : "translate-y-[3px] -rotate-45",
                  )}
                />
              </div>
            </button>
          </div>
        </aside>
      </TooltipProvider>
    </>
  );
}
