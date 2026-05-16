import { useState, useEffect, useMemo, useRef } from "react";
import {
  UtensilsCrossed,
  Cake,
  Calendar,
  Package,
  Truck,
  Wine,
  ShoppingCart,
  Plug,
  Eye,
  DollarSign,
  Cloud,
  TrendingUp,
  Star,
  Layout,
  Mail,
  MessageSquare,
  LifeBuoy,
  ChevronDown,
  Maximize2,
  ClipboardList,
  ChefHat,
  Shield,
  Bell,
  GitBranch,
  CreditCard,
  BarChart3,
  Activity,
  FileText,
  Users,
  Gauge,
  Palette,
  BrainCircuit,
  LayoutDashboard,
  ScanLine,
  Award,
  Edit3,
  Settings,
  Trash2,
  BookOpen,
  CloudSun,
  Boxes,
  Receipt,
  Network,
  Landmark,
  ChartNoAxesCombined,
  CalendarDays,
  Sparkles,
  LayoutPanelLeft,
  Building2,
  UserCog,
  ShieldCheck,
  BellRing,
  PenTool,
  Bolt,
  Workflow,
  Notebook,
  CircleDollarSign,
  Globe,
  FileUp,
  GitCompareArrows,
  Factory,
  Zap,
  ShoppingBag,
  Smartphone,
  Wrench,
  ArrowLeftRight,
  ImageIcon,
  Layers,
  FileBarChart,
  ChefHat,
  Flame,
  GlassWater,
  FlaskConical,
  Store,
  AlertTriangle,
  Search,
} from "lucide-react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import type { ComponentType } from "react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/glass";
import { openPanel } from "@/lib/open-panel";
import { usePanelStoreEnhanced } from "@/lib/stores/panel-store-enhanced";
import type { PanelId } from "@/lib/panel-types";
import {
  preloadModule,
  isValidPanelKey,
  type PanelKey,
} from "@/lib/panel-registry";
import { useAuth } from "@/hooks/useAuth";
import { useAuth as useJwtAuth } from "@/lib/auth-context";
import {
  useAccessStore,
  getModuleAccessForRole,
} from "@/components/admin/EcosystemControlPanel";
import { captureException, captureMessage } from "@/lib/sentry-init";
import { setModuleTab } from "@/lib/module-tab-manager";
import { AurionLogo } from "@/components/ui/AurionLogo";
import { getRecipeCostAlerts, saveRecipeCostAlerts } from "@/modules/Culinary/client/lib/recipe-cost-sync";
import { getBrandIcon } from "@/lib/brand-icon-registry";

// No external icon URLs (builder.io removed) – use Lucide icons only so panels load reliably.
// Hierarchical navigation structure supporting up to 5 levels
interface NavItem {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  iconImage?: string;
  panelId?: string;
  route?: string; // For routing instead of panels
  children?: NavItem[];
  isGroup?: boolean;
  groupDescription?: string;
}

// ═══════════════════════ ROLE-BASED SIDEBAR CATEGORIES ═══════════════════════
// Groups collapse/expand on click. Role filtering hides entire groups.
// iter266.10 · Added "beverage_ops" to every role that previously had
// "culinary_ops" since Beverage was split out into its own header.
const ROLE_SIDEBAR_ACCESS: Record<string, string[]> = {
  "owner": ["administration", "culinary_ops", "beverage_ops", "pastry_ops", "menu_engineering_grp", "daily", "intelligence", "events_catering", "financial", "hotel_ops", "guest_concierge", "admin_system"],
  "admin": ["administration", "culinary_ops", "beverage_ops", "pastry_ops", "menu_engineering_grp", "daily", "intelligence", "events_catering", "financial", "hotel_ops", "guest_concierge", "admin_system"],
  "regional-director": ["daily", "intelligence", "financial", "events_catering", "hotel_ops", "beverage_ops"],
  "director":          ["daily", "intelligence", "financial", "events_catering", "hotel_ops", "beverage_ops"],
  "exec-dir-finance":  ["daily", "intelligence", "financial", "admin_system"],
  "general-manager": ["daily", "intelligence", "culinary_ops", "beverage_ops", "pastry_ops", "menu_engineering_grp", "events_catering", "financial", "hotel_ops", "guest_concierge", "admin_system"],
  "dir-banquets": ["daily", "intelligence", "events_catering", "culinary_ops", "beverage_ops", "pastry_ops", "financial"],
  "sous-chef":           ["daily", "culinary_ops", "pastry_ops", "financial"],
  "dining-room-manager": ["daily", "intelligence", "culinary_ops", "beverage_ops", "guest_concierge"],
  "executive-chef": ["culinary_ops", "beverage_ops", "pastry_ops", "menu_engineering_grp", "daily", "events_catering", "financial", "intelligence"],
  "pastry-chef": ["pastry_ops", "menu_engineering_grp", "culinary_ops", "daily", "guest_concierge"],
  "fb-director": ["culinary_ops", "beverage_ops", "pastry_ops", "menu_engineering_grp", "daily", "financial", "events_catering", "intelligence", "hotel_ops"],
  "bar-manager":       ["beverage_ops", "daily", "intelligence", "financial"],
  "bar_manager":       ["beverage_ops", "daily", "intelligence", "financial"],
  "events-manager": ["events_catering", "daily", "culinary_ops", "pastry_ops", "menu_engineering_grp", "financial", "guest_concierge"],
  "spa-manager": ["hotel_ops", "daily", "guest_concierge", "admin_system"],
  "dir-engineering": ["hotel_ops", "daily", "admin_system"],
  "purchasing-manager": ["financial", "daily", "culinary_ops", "beverage_ops"],
  "controller": ["financial", "intelligence", "daily", "admin_system"],
  "default": ["culinary_ops", "beverage_ops", "pastry_ops", "menu_engineering_grp", "daily", "intelligence", "events_catering", "financial", "hotel_ops", "guest_concierge"],
};

const NAV_ITEMS: NavItem[] = [
  // iter263 · ADMINISTRATION — visible only to admin/owner. Surfaces the new
  // Admin Console + tech support connection at the top of the rail so IT /
  // platform administrators have one-click access to everything they run.
  // iter266 · ALL admin sub-items now open the single Admin Console panel and
  // jump to the corresponding tab (was: each opened its own panel and defaulted
  // to tab 1). Tab routing handled in handleOpenPanel via "admin-tab:*" itemIds.
  { id: "administration", label: "Administration", isGroup: true, children: [
    { id: "admin-tab:pulse", label: "Admin Console", icon: ShieldCheck, panelId: "admin-console" },
    { id: "admin-tab:users", label: "Onboarding & Users", icon: UserCog, panelId: "admin-console" },
    { id: "admin-tab:updates", label: "System Updates", icon: GitBranch, panelId: "admin-console" },
    { id: "admin-tab:installers", label: "Desktop Installers", icon: Smartphone, panelId: "admin-console" },
    { id: "admin-tab:it", label: "IT & Integrations", icon: Network, panelId: "admin-console" },
    { id: "admin-tab:audit", label: "Audit & Security", icon: Shield, panelId: "admin-console" },
    { id: "admin-tab:flags", label: "Feature Flags", icon: Zap, panelId: "admin-console" },
    { id: "admin-tab:support", label: "Echo AURION · Tech Support", icon: LifeBuoy, panelId: "admin-console" },
  ]},

  // ── 1) CULINARY — top priority for chefs ──
  { id: "culinary_ops", label: "Culinary", isGroup: true, children: [
    { id: "culinary", label: "nav.culinary", icon: UtensilsCrossed, panelId: "culinary" },
    { id: "kitchen-war-room", label: "Kitchen War Room", icon: Flame, panelId: "kitchen-war-room" },
    { id: "food-gallery", label: "Food Gallery", icon: ImageIcon, panelId: "food-gallery" },
    { id: "waste-sheet", label: "Waste Sheet", icon: Trash2, panelId: "waste-sheet" },
    { id: "beo-menu-builder", label: "BEO Menu Builder", icon: FileText, panelId: "beo-menu-builder" },
    { id: "outlet-menus", label: "Outlet Menu Manager", icon: Store, panelId: "outlet-menus" },
  ]},

  // iter266.10 · Beverage split out of Culinary per William — its own header
  // so Mixology / Sommelier / R&D / Beverage Ops have a first-class home.
  { id: "beverage_ops", label: "Beverage", isGroup: true, children: [
    { id: "mixology_sommelier", label: "sidebar.mixologySommelier", icon: Wine, panelId: "mixology-sommelier" },
    { id: "beverage-ops", label: "Beverage Operations", icon: GlassWater, panelId: "beverage-ops" },
    { id: "mixology-rd-lab", label: "Mixology R&D Lab", icon: FlaskConical, panelId: "mixology-rd-lab" },
  ]},

  { id: "pastry_ops", label: "Pastry", isGroup: true, children: [
    { id: "pastry", label: "nav.pastry", icon: Cake, panelId: "pastry" },
    { id: "chef-carissa-training", label: "Chef Carissa Training", icon: Cake, panelId: "chef-carissa-training" },
    { id: "cake-viewer", label: "Cake Viewer · 3D", icon: Cake, panelId: "cake-viewer" },
  ]},

  { id: "menu_engineering_grp", label: "Menu Engineering", isGroup: true, children: [
    { id: "menu-design-studio", label: "Menu Design Studio", icon: Palette, panelId: "menu-design-studio" },
    { id: "dish-assembly", label: "Dish Assembly", icon: Layers, panelId: "dish-assembly" },
    { id: "plate-costing", label: "Plate Costing", icon: CircleDollarSign, panelId: "plate-costing" },
    { id: "menu-engineering", label: "Menu Engineering", icon: ChartNoAxesCombined, panelId: "menu-engineering" },
    { id: "kds-expo", label: "KDS · Expo", icon: Flame, panelId: "kds-expo" },
    { id: "pos-menu-analytics", label: "Menu Performance", icon: TrendingUp, panelId: "pos-menu-analytics" },
  ]},
  // ── 2) QUICK DAILY — most-opened operational tools ──
  { id: "daily", label: "Quick Daily", isGroup: true, children: [
    { id: "chronos", label: "Chronos · Time Machine", icon: Globe, panelId: "chronos" },
    { id: "maestro-dashboard", label: "LUCCCA Dashboard", icon: LayoutDashboard, panelId: "maestro-dashboard" },
    { id: "gm-flash-report", label: "GM Daily Flash", icon: FileBarChart, panelId: "gm-flash-report" },
    { id: "chef-daily-report", label: "Chef Daily Report", icon: ClipboardList, panelId: "chef-daily-report" },
    { id: "chef-outlet-dashboard", label: "Chef Outlet Dashboard", icon: ChefHat, panelId: "chef-outlet-dashboard" },
    { id: "beo-timeline-ui", label: "BEO Timeline (MaestroBqt)", icon: CalendarDays, panelId: "beo-timeline-ui" },
    { id: "exception-review-daily", label: "Exception Review · Daily", icon: AlertTriangle, panelId: "exception-review-daily" },
    { id: "schedule", label: "Schedule · Employees", icon: Calendar, panelId: "schedule" },
    { id: "global-calendar", label: "Global Calendar", icon: CalendarDays, panelId: "global-calendar" },
    { id: "notification-center", label: "Notifications", icon: BellRing, panelId: "notification-center" },
    { id: "inventory", label: "Ordering & Inventory", icon: Package, panelId: "inventory" },
    // iter266.10 · Ingredient cost lookup surfaced as a first-class panel
    // per William ("you had built in a previous agent the ingredient
    // lookup … keep it under Ordering/Inventory"). Wraps the existing
    // useVendorSkuLookup hook against /api/vendor-skus/lookup.
    { id: "ingredient-cost-lookup", label: "Ingredient Cost Lookup", icon: Search, panelId: "ingredient-cost-lookup" },
  ]},
  // ── 3) INTELLIGENCE & FORECASTING ──
  { id: "intelligence", label: "Intelligence & Forecasting", isGroup: true, children: [
    { id: "property-pulse", label: "Property Pulse · Live", icon: Activity, panelId: "property-pulse" },
    { id: "cross-property-benchmark", label: "Cross-Property Benchmark", icon: BarChart3, panelId: "cross-property-benchmark" },
    { id: "reports-hub", label: "Reports Hub · One Source of Truth", icon: BarChart3, panelId: "reports-hub" },
    { id: "enterprise-bi-suite", label: "Enterprise BI Suite", icon: BarChart3, panelId: "enterprise-bi-suite" },
    { id: "executive-command", label: "Executive Command", icon: Activity, panelId: "executive-command" },
    { id: "aurium-gm", label: "EchoAurium GM", icon: Gauge, panelId: "aurium-gm" },
    { id: "stratus-forecast", label: "EchoStratus Forecast", icon: TrendingUp, panelId: "stratus-forecast" },
    { id: "forecast-21day", label: "21-Day Forecast", icon: Activity, panelId: "forecast-21day" },
    { id: "pattern-intelligence", label: "Pattern Intelligence", icon: AlertTriangle, panelId: "pattern-intelligence" },
    { id: "performance-intelligence", label: "Performance Intel", icon: Activity, panelId: "performance-intelligence" },
    { id: "weather-forecast", label: "Weather & Demand", icon: CloudSun, panelId: "weather-forecast" },
  ]},
  // ── 4) EVENTS & CATERING ──
  { id: "events_catering", label: "Events & Catering", isGroup: true, children: [
    { id: "maestro-bqt", label: "sidebar.maestroBQT", icon: Workflow, panelId: "maestro-bqt" },
    { id: "beo-planner", label: "BEO Auto-Planner (AI)", icon: Sparkles, panelId: "beo-planner" },
    { id: "chef-gio-training", label: "Chef Gio Training", icon: ChefHat, panelId: "chef-gio-training" },
    { id: "echo-events", label: "sidebar.echoEvents", icon: Sparkles, panelId: "echo-events" },
    { id: "echowaste", label: "ECW · Waste", icon: Trash2, panelId: "echowaste" },
    { id: "ecw-menu-builder", label: "ECW · Menu Builder", icon: UtensilsCrossed, panelId: "ecw-menu-builder" },
    { id: "ecw-procurement", label: "ECW · Procurement", icon: Truck, panelId: "ecw-procurement" },
    { id: "group-resume", label: "Group Resume Builder", icon: FileText, panelId: "group-resume" },
    { id: "layout", label: "sidebar.echoLayout", icon: Layout, panelId: "layout" },
  ]},
  // ── 5) FINANCIAL & PROCUREMENT (deduped: menu eng + retail moved out) ──
  // iter266.10 · Tip Audit removed from here — it now lives INSIDE the FOH
  // Schedule module per William ("everything together"). Sidebar entry kept
  // out so users go through Schedule → Tip Audit tab.
  { id: "financial", label: "Financial & Procurement", isGroup: true, children: [
    { id: "pace-mtd", label: "Pace · MTD Deep-Dive", icon: Gauge, panelId: "pace-mtd" },
    { id: "cash-runway-deep", label: "Cash Runway · Deep-Dive", icon: CircleDollarSign, panelId: "cash-runway-deep" },
    { id: "financial-ops", label: "Financial Operations", icon: CreditCard, panelId: "financial-ops" },
    { id: "budget-center", label: "Budget & Forecast", icon: TrendingUp, panelId: "budget-center" },
    { id: "manager-dashboard", label: "My Operations", icon: Gauge, panelId: "manager-dashboard" },
    { id: "stratus", label: "EchoStratus", icon: TrendingUp, panelId: "stratus" },
    { id: "purchasing-receiving", label: "Purchasing & Receiving", icon: ShoppingCart, panelId: "purchasing-receiving" },
    { id: "vendor-pareto", label: "Vendor Pareto · 80/20", icon: BarChart3, panelId: "vendor-pareto" },
    { id: "purchrec-sprint1", label: "PurchRec · 3-Way Match + Auto-PO", icon: ScanLine, panelId: "purchrec-sprint1" },
    { id: "vendor-scorecard", label: "Vendor Scorecard + Compliance", icon: Award, panelId: "vendor-scorecard" },
    { id: "pos-router", label: "POS Auto-Router", icon: Zap, panelId: "pos-router" },
  ]},
  // ── 6) HOTEL OPERATIONS (merged Resort + Spa + Engineering) ──
  { id: "hotel_ops", label: "Hotel Operations", isGroup: true, children: [
    { id: "foh-command", label: "FOH Command", icon: UtensilsCrossed, panelId: "foh-command" },
    { id: "foh-concierge-hub", label: "Local Guide", icon: UtensilsCrossed, panelId: "foh-concierge-hub" },
    { id: "echo-concierge", label: "Concierge Desk", icon: UtensilsCrossed, panelId: "echo-concierge" },
    { id: "relay", label: "Relay · Tickets", icon: UtensilsCrossed, panelId: "relay" },
    { id: "my-schedule", label: "My Schedule", icon: Calendar, panelId: "my-schedule" },
    { id: "schedule", label: "Schedule (Manager)", icon: Calendar, panelId: "schedule" },
    { id: "daily-standup", label: "Daily Standup (Sailing Yacht)", icon: UtensilsCrossed, panelId: "daily-standup" },
    { id: "hskp-command", label: "Housekeeping Command", icon: Package, panelId: "hskp-command" },
    { id: "ird-hub", label: "IRD & Minibar", icon: Store, panelId: "ird-hub" },
    { id: "ird-builder", label: "IRD Menu Builder · Web Ordering", icon: Edit3, panelId: "ird-builder" },
    { id: "retail-ops", label: "Retail Operations", icon: ShoppingBag, panelId: "retail-ops" },
    { id: "eng-command", label: "Engineering Command", icon: Zap, panelId: "eng-command" },
    { id: "engineering-ops", label: "Engineering Ops", icon: Wrench, panelId: "eng-work-tickets" },
    { id: "energy-tracking", label: "Energy Tracking", icon: Bolt, panelId: "energy-tracking" },
    { id: "spa-dashboard", label: "Spa Dashboard", icon: Sparkles, panelId: "spa-wellness" },
    { id: "spa-builder", label: "Spa Menu Builder · QR Booking", icon: Edit3, panelId: "spa-builder" },
    { id: "guest-booking", label: "Guest Booking", icon: Globe, panelId: "guest-booking" },
    { id: "dept-dashboard", label: "My Department", icon: LayoutDashboard, panelId: "dept-dashboard" },
    // iter253 · Productivity tools (relocated from topbar)
    { id: "outlook-mail", label: "Outlook Mail", icon: Mail, panelId: "outlook-mail" },
    { id: "gmail", label: "Gmail", icon: Mail, panelId: "gmail" },
    { id: "ms-teams", label: "Microsoft Teams", icon: Users, panelId: "ms-teams" },
    { id: "whiteboard", label: "Whiteboard", icon: Layout, panelId: "whiteboard" },
  ]},
  // ── 7) GUEST & CONCIERGE (split from old Dashboard, now a first-class citizen) ──
  { id: "guest_concierge", label: "Guest & Concierge", isGroup: true, children: [
    { id: "concierge-hub", label: "Concierge Messages", icon: MessageSquare, panelId: "concierge-hub" },
    { id: "guest360-hub", label: "Guest 360 Hub", icon: Users, panelId: "guest360-hub" },
    { id: "guest-360", label: "Guest 360 Profile", icon: Users, panelId: "guest-360" },
    { id: "guest-intelligence", label: "Guest Intelligence", icon: ShieldCheck, panelId: "guest-intelligence" },
    // iter266.3 · VIP Atlas relocated here from Admin & System per William —
    // it's a guest-relations tool, not a system admin tool.
    { id: "vip-admin-desktop", label: "VIP Atlas · Back Office", icon: Users, panelId: "vip-admin-desktop" },
    { id: "echo-connect", label: "Connect Hub", icon: MessageSquare, panelId: "echo-connect" },
    { id: "chefnet", label: "nav.chefnet", icon: MessageSquare, panelId: "chefnet" },
  ]},
  // ── 8) ADMIN & SYSTEM (HR + AI + security + integrations) ──
  { id: "admin_system", label: "Admin & System", isGroup: true, children: [
    { id: "admin-onboarding", label: "Admin & Onboarding", icon: UserCog, panelId: "admin-onboarding" },
    { id: "people-admin", label: "People & Operations", icon: Users, panelId: "people-admin" },
    { id: "manager-workflow", label: "Manager Workflow · Approvals & Chat", icon: Users, panelId: "manager-workflow" },
    { id: "concierge-mobile-admin", label: "Guest Companion · Mobile", icon: Users, panelId: "concierge-mobile-admin" },
    { id: "daily-briefing-admin", label: "Daily Briefing · Mobile Links", icon: Users, panelId: "daily-briefing-admin" },
    { id: "role-assigner", label: "Role Assigner · Staff Access", icon: Users, panelId: "role-assigner" },
    // iter266.3 · Renamed per William — was "Luccca · Executive Dashboard".
    // Used as the manager-grade landing surface (auto-scoped to assigned outlets).
    { id: "luccca-jarvis-dashboard", label: "LUCCCA Manager Dashboard", icon: LayoutDashboard, panelId: "luccca-jarvis-dashboard" },
    { id: "settings-overhaul", label: "Settings (iter181)", icon: Users, panelId: "settings-overhaul" },
    { id: "lifestyle-dashboard", label: "Lifestyle Command", icon: Sparkles, panelId: "lifestyle-dashboard" },
    { id: "hr-payroll", label: "HR & Payroll", icon: Receipt, panelId: "hr-payroll" },
    { id: "labor-command-center", label: "Labor Command", icon: Users, panelId: "labor-command-center" },
    { id: "kitchen-routing", label: "Kitchen Routing", icon: Settings, panelId: "kitchen-routing" },
    { id: "security-compliance", label: "Security & Audit", icon: ShieldCheck, panelId: "security-compliance" },
    { id: "activity-timeline", label: "Activity Timeline · Recall", icon: ShieldCheck, panelId: "activity-timeline" },
    { id: "ai3-intelligence", label: "AI\u00B3 Intelligence", icon: BrainCircuit, panelId: "ai3-intelligence" },
    { id: "zaro-guardian", label: "ZARO Guardian", icon: Shield, panelId: "zaro-guardian" },
    { id: "integration-control", label: "Integration Hub", icon: Network, panelId: "integration-control" },
    { id: "support", label: "nav.support", icon: LifeBuoy, panelId: "support" },
  ]},
];
// Analytics Mode Switcher — toggles between Operations and Analytics BI
function AnalyticsModeSwitcher({
  isExpanded,
  isMobileOpen,
  onSwitchToAnalytics,
}: {
  isExpanded: boolean;
  isMobileOpen: boolean;
  onSwitchToAnalytics: () => void;
}) {
  const isVisible = isExpanded || isMobileOpen;
  if (!isVisible) {
    return (
      <div className="flex justify-center py-2">
        <button
          onClick={onSwitchToAnalytics}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-sidebar-accent"
          style={{ color: "#c8a97e" }}
          title="Switch to Analytics"
          data-testid="analytics-switcher-icon"
        >
          <BarChart3 size={18} />
        </button>
      </div>
    );
  }
  return (
    <div className="mx-3 my-2" data-testid="analytics-mode-switcher">
      <button
        onClick={onSwitchToAnalytics}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group/analytics"
        style={{
          background: "linear-gradient(135deg, rgba(200,169,126,0.12) 0%, rgba(59,130,246,0.08) 100%)",
          border: "1px solid rgba(200,169,126,0.25)",
          color: "#c8a97e",
        }}
      >
        <span className="flex items-center gap-2">
          <BarChart3 size={16} className="transition-transform group-hover/analytics:scale-110" />
          <span>Analytics BI</span>
        </span>
        <ArrowLeftRight size={13} className="opacity-50 group-hover/analytics:opacity-100 transition-opacity" />
      </button>
    </div>
  );
}

// Property Picker — only visible when multi-property is enabled in admin settings
function PropertyPicker() {
  const [settings, setSettings] = useState<{ multi_property_enabled: boolean; default_property_id: string | null } | null>(null);
  const [properties, setProperties] = useState<{ property_id: string; name: string; code: string; outlet_count: number }[]>([]);
  const [activeProperty, setActiveProperty] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`${window.location.origin}/api/admin/settings`)
      .then(r => r.json())
      .then(d => {
        setSettings(d);
        if (d.default_property_id) setActiveProperty(d.default_property_id);
      })
      .catch(() => {});
    fetch(`${window.location.origin}/api/admin/properties`)
      .then(r => r.json())
      .then(d => setProperties(d.properties || []))
      .catch(() => {});
  }, []);

  if (!settings?.multi_property_enabled || properties.length === 0) return null;

  const active = properties.find(p => p.property_id === activeProperty);
  const label = active ? `${active.code} — ${active.name}` : "All Properties";

  return (
    <div className="mx-3 my-2 relative" data-testid="property-picker">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-mono border transition-all"
        style={{
          background: activeProperty ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.03)",
          borderColor: activeProperty ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.08)",
          color: activeProperty ? "#93c5fd" : "#94a3b8",
        }}
        data-testid="property-picker-btn"
      >
        <span className="flex items-center gap-1.5 truncate">
          <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown className="w-3 h-3 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-lg border shadow-xl overflow-hidden" style={{ background: "#1a1f2e", borderColor: "rgba(255,255,255,0.08)", zIndex: 100 }}>
          <button
            onClick={() => { setActiveProperty(null); setOpen(false); localStorage.removeItem("luccca_active_property"); }}
            className="w-full text-left px-3 py-2 text-[11px] font-mono transition-colors hover:bg-slate-700/30"
            style={{ color: !activeProperty ? "#93c5fd" : "#94a3b8" }}
            data-testid="property-option-all"
          >
            All Properties
          </button>
          {properties.map(p => (
            <button
              key={p.property_id}
              onClick={() => { setActiveProperty(p.property_id); setOpen(false); localStorage.setItem("luccca_active_property", p.property_id); }}
              className="w-full text-left px-3 py-2 text-[11px] font-mono transition-colors hover:bg-slate-700/30 flex items-center justify-between"
              style={{ color: activeProperty === p.property_id ? "#93c5fd" : "#94a3b8" }}
              data-testid={`property-option-${p.property_id}`}
            >
              <span>{p.code} — {p.name}</span>
              <span className="text-[9px] opacity-60">{p.outlet_count} outlets</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Recursive component for rendering navigation items
function NavItemComponent({
  item,
  isExpanded,
  isMobileOpen,
  activePanel,
  onOpenPanel,
  level = 0,
  navigate,
  setIsMobileOpen,
}: {
  item: NavItem;
  isExpanded: boolean;
  isMobileOpen: boolean;
  activePanel: string | null;
  onOpenPanel: (panelId: string, itemId?: string) => void;
  level?: number;
  navigate: NavigateFunction;
  setIsMobileOpen: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [isOpenChild, setIsOpenChild] = useState(() => {
    // Auto-expand top groups for better initial UX
    const autoExpand = ["dashboard"];
    return autoExpand.includes(item.id);
  });
  const [isHovered, setIsHovered] = useState(false);
  const preloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (preloadTimeoutRef.current) clearTimeout(preloadTimeoutRef.current);
    };
  }, []);

  // Group header — collapsible on click
  if (item.isGroup) {
    const groupLabel = item.label.includes('.') ? t(item.label) : item.label;
    const collapsed = !isExpanded && !isMobileOpen;

    // iter266 · Collapsed sidebar: render ONE representative icon per group
    // (was: every child icon stacked, producing a wall of icons). Click expands
    // the rail AND opens this group's children.
    if (collapsed) {
      // Pick first child with an icon as the group's representative mark.
      const repChild = item.children?.find((c) => c.icon || c.iconImage || c.panelId);
      const brandSrc = repChild
        ? (repChild.iconImage || getBrandIcon(repChild.panelId, repChild.id))
        : null;
      const RepIcon = repChild?.icon;
      return (
        <li key={item.id} data-testid={`sidebar-group-collapsed-${item.id}`}>
          <button
            data-testid={`sidebar-group-collapsed-btn-${item.id}`}
            title={groupLabel}
            onClick={() => {
              setIsOpenChild(true);
              // Expand the sidebar so the group children become visible.
              window.dispatchEvent(new CustomEvent("sidebar:expand"));
            }}
            className={cn(
              "w-full flex items-center justify-center py-2 my-0.5 rounded-md transition-all",
              "text-sidebar-foreground hover:bg-sidebar-accent group/grp",
            )}
          >
            <div className="w-[26px] h-[26px] flex items-center justify-center">
              {brandSrc ? (
                <img
                  src={brandSrc}
                  alt={groupLabel}
                  className="w-full h-full object-contain"
                  loading="lazy"
                  draggable={false}
                />
              ) : RepIcon ? (
                <RepIcon size={20} strokeWidth={1.5} />
              ) : null}
            </div>
          </button>
        </li>
      );
    }

    return (
      <li key={item.id} data-testid={`sidebar-group-${item.id}`}>
        <button
          onClick={() => setIsOpenChild(!isOpenChild)}
          className="w-full flex items-center justify-between px-3 py-1.5 mt-1 rounded-md transition-all hover:bg-sidebar-accent/30 group/grp"
          data-testid={`sidebar-group-toggle-${item.id}`}
        >
          <h3 className="text-[10px] font-bold text-sidebar-foreground uppercase tracking-widest opacity-80 group-hover/grp:opacity-100 transition-opacity">
            {groupLabel}
          </h3>
          <ChevronDown
            size={12}
            className={cn(
              "text-sidebar-foreground opacity-40 transition-transform duration-200",
              isOpenChild ? "rotate-180" : ""
            )}
          />
        </button>

        {isOpenChild && (
          <ul className="space-y-0.5 mt-0.5 mb-1">
            {item.children?.map((child) => (
              <NavItemComponent
                key={child.id}
                item={child}
                isExpanded={isExpanded}
                isMobileOpen={isMobileOpen}
                activePanel={activePanel}
                onOpenPanel={onOpenPanel}
                level={level + 1}
                navigate={navigate}
                setIsMobileOpen={setIsMobileOpen}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const hasChildren = item.children && item.children.length > 0;

  // Check if this item supports pop-out (EchoCanva modules)
  const supportsPopout = item.panelId === "echo-canva-cake-order" || item.panelId === "echo-canva-design-editor";

  return (
    <li key={item.id} data-testid={`nav-item-li-${item.id}`}>
      <div className="flex items-center group">
        <button
          data-testid={`nav-item-${item.id}`}
          data-panel-id={item.panelId || ""}
          onClick={() => {
            try {
              if (item.panelId) {
                // Always open the panel if it has a panelId
                onOpenPanel(item.panelId, item.id);
              }

              if (hasChildren) {
                // Also toggle children visibility if it has children
                setIsOpenChild(!isOpenChild);
                return;
              }

              if (item.route) {
                navigate(item.route);
                setIsMobileOpen(false);
                return;
              }
            } catch (err) {
              captureException(err instanceof Error ? err : new Error(String(err)));
              captureMessage(`[Sidebar] Click failed for item ${item.id}`);
            }
          }}
          onMouseEnter={() => {
            setIsHovered(true);
            if (item.panelId && isValidPanelKey(item.panelId)) {
              // Debounce preloading to prevent saturation during rapid mouse movement (200ms)
              if (preloadTimeoutRef.current) clearTimeout(preloadTimeoutRef.current);
              preloadTimeoutRef.current = setTimeout(() => {
                preloadModule(item.panelId as PanelKey);
                preloadTimeoutRef.current = null;
              }, 200);
            }
          }}
          onMouseLeave={() => {
            setIsHovered(false);
            if (preloadTimeoutRef.current) {
              clearTimeout(preloadTimeoutRef.current);
              preloadTimeoutRef.current = null;
            }
          }}
          className={cn(
            "w-full flex items-center transition-all duration-200 ease-out",
            "text-xs font-medium whitespace-nowrap group",
            "sidebar-item",
            isExpanded || isMobileOpen ? "justify-start gap-2 px-2 py-1.5" : "justify-center px-0 py-1",
            level > 0 && (isExpanded || isMobileOpen) && "ml-2",
            activePanel === item.panelId
              ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
              : isHovered
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground opacity-80 hover:opacity-100",
          )}
          title={!isExpanded && !isMobileOpen ? t(item.label) : undefined}
        >
          <div
            className={cn(
              "flex-shrink-0 flex items-center justify-center",
              "transition-all duration-150",
              isExpanded || isMobileOpen ? "w-[28px] h-[28px]" : "w-[24px] h-[24px]",
            )}
          >
            {(() => {
              // Brand icon registry takes precedence over Lucide fallbacks
              // (gold-on-black PNGs commissioned per docs/UX_ICON_MASTER_LIST.md)
              const brandSrc = item.iconImage || getBrandIcon(item.panelId, item.id);
              if (brandSrc) {
                return (
                  <img
                    src={brandSrc}
                    alt={t(item.label)}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    draggable={false}
                  />
                );
              }
              if (item.icon) {
                return (
                  <item.icon
                    size={isExpanded || isMobileOpen ? 18 : 16}
                    strokeWidth={1.5}
                  />
                );
              }
              return null;
            })()}
          </div>

          {(isExpanded || isMobileOpen) && (
            <span className="flex-1 text-left">{t(item.label)}</span>
          )}

          {hasChildren && (isExpanded || isMobileOpen) && (
            <ChevronDown
              size={14}
              className={cn(
                "flex-shrink-0 transition-transform duration-200",
                isOpenChild ? "rotate-180" : "",
              )}
            />
          )}
        </button>

        {/* Pop-out button (only show for supported modules when expanded/mobile open and hovered) */}
        {supportsPopout && (isExpanded || isMobileOpen) && isHovered && !hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (item.panelId) {
                console.log("[Sidebar] Pop-out button clicked for", item.panelId);
                // Open the same panel as a separate instance
                openPanel(item.panelId as PanelKey);
              }
            }}
            className="p-1.5 rounded ml-1 text-sidebar-foreground hover:bg-sidebar-accent transition-all flex-shrink-0 opacity-80 hover:opacity-100"
            title="Open as separate panel"
          >
            <Maximize2 size={14} />
          </button>
        )}
      </div>

      {hasChildren && isOpenChild && (isExpanded || isMobileOpen) && (
        <ul className="space-y-0 mt-0.5">
          {item.children?.map((child) => (
            <NavItemComponent
              key={child.id}
              item={child}
              isExpanded={isExpanded}
              isMobileOpen={isMobileOpen}
              activePanel={activePanel}
              onOpenPanel={onOpenPanel}
              level={level + 1}
              navigate={navigate}
              setIsMobileOpen={setIsMobileOpen}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// Onboarding Wizard — role-based 3-step guided tour
function OnboardingWizard({ userRole, userId }: { userRole: string; userId: string }) {
  const [show, setShow] = useState(false);
  const [steps, setSteps] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const statusRes = await fetch(`${window.location.origin}/api/onboarding-wizard/status?user_id=${userId}`);
        const status = await statusRes.json();
        if (!status.show_wizard) { setLoading(false); return; }

        const stepsRes = await fetch(`${window.location.origin}/api/onboarding-wizard/steps?role=${userRole}&user_id=${userId}`);
        const data = await stepsRes.json();
        if (!data.all_complete) {
          setSteps(data.steps || []);
          setCurrentStep(data.completed || 0);
          setShow(true);
        }
      } catch { /* silent */ }
      setLoading(false);
    };
    checkStatus();
  }, [userRole, userId]);

  if (loading || !show || steps.length === 0) return null;

  const step = steps[currentStep];
  if (!step) return null;

  const completeStep = async () => {
    try {
      await fetch(`${window.location.origin}/api/onboarding-wizard/complete-step?user_id=${userId}&step=${step.step}`, { method: "POST" });
    } catch { /* silent */ }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShow(false);
    }
  };

  const dismiss = async () => {
    try { await fetch(`${window.location.origin}/api/onboarding-wizard/dismiss?user_id=${userId}`, { method: "POST" }); } catch { /* */ }
    setShow(false);
  };

  const accentColor = "#c8a97e";
  return (
    <div className="mx-3 mb-3" data-testid="onboarding-wizard">
      <div style={{ background: "linear-gradient(135deg, rgba(200,169,126,0.12) 0%, rgba(59,130,246,0.06) 100%)", border: "1px solid rgba(200,169,126,0.3)", borderRadius: 10, padding: 14, position: "relative" }}>
        <button onClick={dismiss} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 14, lineHeight: 1 }} data-testid="onboarding-dismiss" title="Dismiss">&times;</button>
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= currentStep ? accentColor : "rgba(255,255,255,0.1)", transition: "background 0.3s" }} />
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, marginBottom: 4 }}>Step {currentStep + 1} of {steps.length}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>{step.title}</div>
        <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5, marginBottom: 10 }}>{step.description}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={completeStep} data-testid="onboarding-next" style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: accentColor, color: "#0b0f1a", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{currentStep < steps.length - 1 ? "Next" : "Get Started"}</button>
          <button onClick={dismiss} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#64748b", fontSize: 11, cursor: "pointer" }}>Skip Tour</button>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // iter258 · Prefer JWT-backed user role (Director / GM / etc.) over the legacy
  // mock-auth context (which often resolves to admin or null in dev).
  const jwtAuth = (() => { try { return useJwtAuth(); } catch { return null; } })();
  const jwtRole = jwtAuth?.user?.role || "";
  const roles = useAccessStore((s) => s.roles);
  const modules = useAccessStore((s) => s.modules);

  // Get user's role ID from the current user (default to first role if not found)
  const userRoleId = useMemo(() => {
    if (user?.roleId) return user.roleId;
    if (user?.role) {
      const found = roles.find(r => r.id === user.role || r.name === user.role);
      if (found) return found.id;
    }
    return roles[0]?.id;
  }, [user, roles]);

  const departmentHint = useMemo(() => {
    const parts = [user?.department, user?.outlet, user?.role]
      .filter(Boolean)
      .map((value) => String(value));
    return parts.join(" ").toLowerCase();
  }, [user]);

  const isPastryOutlet =
    departmentHint.includes("pastry") || departmentHint.includes("patisserie");
  const isCulinaryOutlet =
    !isPastryOutlet &&
    (departmentHint.includes("culinary") ||
      departmentHint.includes("kitchen") ||
      departmentHint.includes("chef"));

  const [recipeAlerts, setRecipeAlerts] = useState(() => getRecipeCostAlerts());
  const activeRecipeAlerts = useMemo(
    () => recipeAlerts.filter((alert) => !alert.acknowledged),
    [recipeAlerts],
  );

  useEffect(() => {
    const refresh = () => setRecipeAlerts(getRecipeCostAlerts());
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Filter nav items based on permissions
   * IMPORTANT:
   * - If a module permission record DOES NOT exist yet, allow the item (dev-safe default).
   * - If it DOES exist, enforce canView.
   */
  const filteredNavItems = useMemo(() => {
    // In dev mode without userRoleId, show all items
    if (!userRoleId) {
      return NAV_ITEMS;
    }

    // Role-based group filtering — JWT role wins over legacy mock-auth role.
    const userRole = (jwtRole || user?.role || "default").toLowerCase();
    // Exact-match first (so "director" doesn't fall through to "executive-chef"
    // or any other role whose name happens to share a substring).
    const exact = ROLE_SIDEBAR_ACCESS[userRole];
    const roleKey = exact
      ? userRole
      : (Object.keys(ROLE_SIDEBAR_ACCESS).find(k => userRole.includes(k)) || "default");
    const allowedGroups = ROLE_SIDEBAR_ACCESS[roleKey] || ROLE_SIDEBAR_ACCESS["default"];

    const filterItem = (item: NavItem): NavItem | null => {
      // If it's a top-level group, check role access
      if (item.isGroup && item.children) {
        if (!allowedGroups.includes(item.id)) return null;
        const filteredChildren = item.children
          .map((child) => filterItem(child))
          .filter((x) => x !== null) as NavItem[];

        if (filteredChildren.length === 0) {
          console.log(`[Sidebar] Group ${item.id} has no visible children, filtering out`);
          return null;
        }
        return { ...item, children: filteredChildren };
      }

      const moduleId = item.panelId ?? item.id;
      if (moduleId === "culinary" && isPastryOutlet) return null;
      if (moduleId === "pastry" && isCulinaryOutlet) return null;

      // If panel item exists, optionally enforce permissions
      if (item.panelId) {
        const moduleKey = item.panelId ?? item.id;

        const module = modules.find(
          (m) =>
            m.key === moduleKey ||
            m.route === moduleKey ||
            m.route?.includes(moduleKey),
        );

        // ✅ If module is NOT registered yet, allow it (dev-safe default)
        if (!module) {
          console.log(`[Sidebar] Module ${moduleKey} not in registry, allowing (dev-safe)`);
          return item;
        }

        const access = getModuleAccessForRole(userRoleId, module.key);
        if (!access?.canView) {
          console.log(`[Sidebar] Module ${moduleKey} filtered out - no access for role ${userRoleId}`);
          return null;
        }
      }

      return item;
    };

    const filtered = NAV_ITEMS.map((item) => filterItem(item)).filter(
      (x) => x !== null,
    ) as NavItem[];
    
    console.log(`[Sidebar] Filtered ${NAV_ITEMS.length} items to ${filtered.length} visible items`);
    return filtered;
  }, [userRoleId, modules, isPastryOutlet, isCulinaryOutlet, jwtRole, user?.role]);

  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    // iter200 · Clear legacy tri-state "hidden" flag from iter192 so the sidebar can
    // never end up fully retracted with an invisible rail (William's stuck state).
    try { localStorage.removeItem("sidebar_hidden"); } catch {}
    const stored = localStorage.getItem("sidebar_expanded");
    return stored ? JSON.parse(stored) : true;
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("sidebar_expanded", JSON.stringify(isExpanded));
  }, [isExpanded]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [activePanel]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // iter200 · Two-state toggle: Expanded (220px) ↔ Icon-only (52px). No more "hidden" state.
  const toggleSidebar = () => {
    setIsExpanded((v: boolean) => !v);
  };

  // iter266 · Allow group icons (collapsed view) to expand the sidebar.
  useEffect(() => {
    const onExpand = () => setIsExpanded(true);
    window.addEventListener("sidebar:expand", onExpand);
    return () => window.removeEventListener("sidebar:expand", onExpand);
  }, []);

  const handleOpenPanel = (panelId: string, itemId?: string) => {
    console.debug("[Sidebar] handleOpenPanel called", { panelId, itemId });
    try {
      // Culinary and Culinary2 load in panels like other modules (Pastry, Schedule, etc.)
      // Guard: avoid calling openPanel with unknown keys
      // (If your openPanel accepts any string, this is still safe.)
      let tab: string | undefined;

      // Handle pastry child items - extract tab name from item ID
      if (itemId?.startsWith("pastry-")) {
        const tabMap: Record<string, string> = {
          "pastry-echo-canvas": "echo-canvas",
          "pastry-cake-builder": "cake-builder",
          "pastry-techniques": "techniques",
        };
        tab = tabMap[itemId];
        if (tab) {
          setModuleTab("pastry", tab);
        }
      }

      // iter266 · Admin Console sub-items open the unified Admin Console panel
      // and jump straight to the requested tab (no more defaulting to tab 1).
      if (itemId?.startsWith("admin-tab:")) {
        tab = itemId.slice("admin-tab:".length);
        setModuleTab("admin-console", tab);
      }

      if (itemId?.startsWith("inventory-")) {
        const tabMap: Record<string, string> = {
          "inventory-ordering": "ai-procurement",
          "inventory-inventory": "inventory-outlet",
        };
        tab = tabMap[itemId];
        if (tab) {
          setModuleTab("inventory", tab);
        }
      }

      setActivePanel(panelId);

      if (panelId) {
        // Close the previous panel to avoid stacking
        if (activePanel && activePanel !== panelId) {
          usePanelStoreEnhanced.getState().removePanel(activePanel as PanelId);
        }
        // Always close dashboard when navigating elsewhere
        if (panelId !== "dashboard") {
          usePanelStoreEnhanced.getState().removePanel("dashboard" as PanelId);
        }
        openPanel(panelId as PanelKey, tab);
        console.debug("[Sidebar] Opening floating panel", { panelId, tab });
      } else if (item.route) {
        navigate(item.route);
      }

      setTimeout(() => {
        setIsMobileOpen(false);
        setIsExpanded(false);
      }, 125);
    } catch (err) {
      console.error("[Sidebar] Error opening panel", err);
      captureException(err instanceof Error ? err : new Error(String(err)));
      captureMessage(`[Sidebar] Failed to open panel: ${panelId}`);
    }
  };

  return (
    <>
      {/* iter263 · Mobile hamburger removed per William — the sidebar handle
          (right-edge tab) is the single toggle across breakpoints. */}

      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 lg:hidden transition-opacity",
          isMobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        style={{ zIndex: 99998 }}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed left-0 top-[64px] transition-all duration-500 ease-in-out",
          "bg-gradient-to-b from-gray-100/60 via-gray-200/50 to-gray-300/60 border-r border-t backdrop-blur-md shadow-xl",
          "dark:from-slate-950/85 dark:via-slate-900/60 dark:to-slate-900/70 dark:border-slate-700/60 dark:text-slate-100",
          "flex flex-col",
          "rounded-tr-2xl rounded-br-2xl",
          "overflow-visible",
          isMobileOpen
            ? "w-[220px] translate-x-0 h-[calc(100vh-80px)]"
            : isExpanded
              ? "w-[220px] translate-x-0 h-[calc(100vh-80px)]"
              : "w-[52px] translate-x-0 h-[calc(100vh-80px)]",
        )}
        onClick={(e) => e.stopPropagation()}
        style={{
          zIndex: 99901,
        }}
      >
        {/* iter263 · Floating Toggle Button — same size, more noticeable via
            gold accent + glow on hover (matches Aurion theme). */}
        <button
          onClick={toggleSidebar}
          data-testid="sidebar-toggle"
          className="absolute -right-3 top-1/2 z-[99902] -translate-y-1/2 select-none rounded-r-full border px-1.5 py-4 shadow-[0_0_0_1px_rgba(200,169,126,0.35),0_4px_14px_rgba(200,169,126,0.22)] hover:shadow-[0_0_0_1px_rgba(200,169,126,0.65),0_6px_20px_rgba(200,169,126,0.45)] transition-all duration-300 group/toggle"
          style={{
            background: "var(--aurion-surface, #141825)",
            borderColor: "var(--aurion-accent, #c8a97e)",
          }}
          aria-label="Toggle sidebar"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="block h-3 w-0.5 rounded-full bg-[var(--aurion-accent,#c8a97e)] group-hover/toggle:h-4 transition-all" />
            <span className="block h-3 w-0.5 rounded-full bg-[var(--aurion-accent,#c8a97e)] group-hover/toggle:h-4 transition-all" />
            <span className="block h-3 w-0.5 rounded-full bg-[var(--aurion-accent,#c8a97e)] group-hover/toggle:h-4 transition-all" />
          </div>
        </button>

        {/* Sidebar header */}
        <div className="relative flex items-center justify-between px-2 py-2 border-b border-sidebar-border/50 h-14 backdrop-blur-sm bg-sidebar-accent/30 min-h-[56px] rounded-tr-2xl">
          <div className="flex-1 min-w-0 relative flex items-center justify-start h-full">
            {/* Full logo — visible when expanded */}
            <div
              className={cn(
                "absolute inset-0 flex items-center w-full px-2",
                "transition-all duration-300 ease-in-out",
                (isExpanded || isMobileOpen)
                  ? "opacity-100 translate-x-0 scale-100 pointer-events-auto"
                  : "opacity-0 -translate-x-4 scale-95 pointer-events-none"
              )}
            >
              <img
                src="/echo-aurion-sidebar.png"
                alt="Echo AURION"
                className="h-[38px] w-auto object-contain"
                data-testid="sidebar-logo-full"
              />
            </div>

            {/* Icon-only — visible when collapsed */}
            <div
              className={cn(
                "absolute left-0 flex items-center justify-center w-full",
                "transition-all duration-300 ease-in-out",
                (!isExpanded && !isMobileOpen)
                  ? "opacity-100 translate-x-0 scale-100 pointer-events-auto"
                  : "opacity-0 translate-x-4 scale-95 pointer-events-none"
              )}
            >
              <img
                src="/echo-aurion-sidebar.png"
                alt="Echo AURION"
                className="h-[28px] w-auto object-contain"
                data-testid="sidebar-logo-icon"
              />
            </div>
          </div>
        </div>

        {/* Property Picker (only when multi-property is enabled and sidebar expanded) */}
        {(isExpanded || isMobileOpen) && <PropertyPicker />}

        {/* Analytics Mode Switcher */}
        <AnalyticsModeSwitcher
          isExpanded={isExpanded}
          isMobileOpen={isMobileOpen}
          onSwitchToAnalytics={() => handleOpenPanel("analytics-engine", "analytics-engine")}
        />

        {isExpanded && activeRecipeAlerts.length > 0 && (
          <div className="mx-3 mb-3 rounded-lg border border-amber-400/40 bg-amber-500/10 p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-amber-100">
                Recipe cost alerts ({activeRecipeAlerts.length})
              </div>
              <button
                className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-100 hover:bg-amber-500/30"
                onClick={() => {
                  const updated = recipeAlerts.map((alert) => ({
                    ...alert,
                    acknowledged: true,
                  }));
                  saveRecipeCostAlerts(updated);
                  setRecipeAlerts(updated);
                }}
              >
                Acknowledge
              </button>
            </div>
            <div className="mt-2 space-y-1">
              {activeRecipeAlerts.slice(0, 2).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between">
                  <span className="truncate">{alert.recipeName}</span>
                  <span className="text-[10px] text-amber-100">
                    {alert.changePct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Onboarding Wizard Overlay */}
        {isExpanded && <OnboardingWizard userRole={user?.role || "default"} userId={user?.id || "default-user"} />}

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide scroll-smooth">
          <ul className="space-y-0.5">
            {filteredNavItems.map((item) => (
              <NavItemComponent
                key={item.id}
                item={item}
                isExpanded={isExpanded}
                isMobileOpen={isMobileOpen}
                activePanel={activePanel}
                onOpenPanel={handleOpenPanel}
                level={0}
                navigate={navigate}
                setIsMobileOpen={setIsMobileOpen}
              />
            ))}
          </ul>
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-sidebar-border px-1.5 py-2 space-y-1.5 mt-auto backdrop-blur-sm bg-sidebar-accent"></div>
      </aside>
    </>
  );
}
