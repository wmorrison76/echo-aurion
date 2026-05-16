import React, { useState } from "react";
import {
  MemoryRouter,
  Routes,
  Route,
  useInRouterContext,
  useNavigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./components/ThemeProvider";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  Home,
  BookOpen,
  Wine,
  Lightbulb,
  UtensilsCrossed,
  BarChart3,
  ShoppingCart,
  TrendingUp,
  Zap,
  Award,
  Archive,
  BookMarked,
} from "lucide-react";
import { Home as HomePage } from "./pages/Home";
import { Catalog } from "./pages/Catalog";
import { Recommendations } from "./pages/Recommendations";
import { TastingNotes } from "./pages/TastingNotes";
import { Inventory } from "./pages/Inventory";
import { PurchaseOrders } from "./pages/PurchaseOrders";
import { CostingReport } from "./pages/CostingReport";
import { CellarMonitoring } from "./pages/CellarMonitoring";
import { Analytics } from "./pages/Analytics";
import { WineArchive } from "./pages/WineArchive";
import { SommelierTraining } from "./pages/SommelierTraining";
import { MenuSommelierBridge } from "./pages/MenuSommelierBridge";
import { Onboarding } from "./pages/Onboarding";
import { Settings } from "./pages/Settings";
import { LiquorInventory } from "./pages/LiquorInventory";
import { TransferWorkflow } from "./pages/TransferWorkflow";
import { CompedDrinks } from "./pages/CompedDrinks";
import { VarianceAudit } from "./pages/VarianceAudit";
import POSSettings from "./pages/POSSettings";
import POSDashboard from "./pages/POSDashboard";
import { AdvancedAnalytics } from "./pages/AdvancedAnalytics";
import { NotFound } from "./pages/NotFound";
import "./global.css";

const queryClient = new QueryClient();

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/catalog", label: "Catalog", icon: BookOpen },
  { path: "/menu-sommelier", label: "Menu & Wine", icon: Wine },
  { path: "/recommendations", label: "Recommendations", icon: Lightbulb },
  { path: "/inventory", label: "Inventory", icon: UtensilsCrossed },
  { path: "/liquor-inventory", label: "Liquor Inv", icon: Wine },
  { path: "/pos-dashboard", label: "POS", icon: ShoppingCart },
  { path: "/purchase-orders", label: "Orders", icon: TrendingUp },
  { path: "/costing-report", label: "Costing", icon: BarChart3 },
  { path: "/cellar-monitoring", label: "Cellar", icon: Zap },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/advanced-analytics", label: "Forecasts", icon: TrendingUp },
  { path: "/wine-archive", label: "Archive", icon: Archive },
  { path: "/training", label: "Training", icon: BookMarked },
  { path: "/tasting-notes", label: "Notes", icon: Award },
];

const PANEL_PAGES: Record<string, React.ReactNode> = {
  "/": <HomePage />,
  "/onboarding": <Onboarding />,
  "/catalog": <Catalog />,
  "/recommendations": <Recommendations />,
  "/tasting-notes": <TastingNotes />,
  "/inventory": <Inventory />,
  "/liquor-inventory": <LiquorInventory />,
  "/transfers": <TransferWorkflow />,
  "/comped-drinks": <CompedDrinks />,
  "/variance-audit": <VarianceAudit />,
  "/purchase-orders": <PurchaseOrders />,
  "/costing-report": <CostingReport />,
  "/analytics": <Analytics />,
  "/advanced-analytics": <AdvancedAnalytics />,
  "/cellar-monitoring": <CellarMonitoring />,
  "/pos-dashboard": <POSDashboard />,
  "/pos-settings": <POSSettings />,
  "/wine-archive": <WineArchive />,
  "/training": <SommelierTraining />,
  "/menu-sommelier": <MenuSommelierBridge />,
  "/settings": <Settings />,
};

function SidebarNav({ currentPath, onNavigate }: { currentPath?: string; onNavigate?: (path: string) => void }) {
  const navigate = useNavigate();
  const isPanelMode = onNavigate != null && currentPath != null;

  const handleNavigate = (path: string) => {
    if (isPanelMode && onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300">
          Mixology & Sommelier
        </h2>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = isPanelMode ? currentPath === item.path : window.location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => handleNavigate(item.path)}
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
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function RoutesContent() {
  return (
    <div className="flex h-full w-full">
      <SidebarNav />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/tasting-notes" element={<TastingNotes />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/liquor-inventory" element={<LiquorInventory />} />
          <Route path="/transfers" element={<TransferWorkflow />} />
          <Route path="/comped-drinks" element={<CompedDrinks />} />
          <Route path="/variance-audit" element={<VarianceAudit />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/costing-report" element={<CostingReport />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/advanced-analytics" element={<AdvancedAnalytics />} />
          <Route path="/cellar-monitoring" element={<CellarMonitoring />} />
          <Route path="/pos-dashboard" element={<POSDashboard />} />
          <Route path="/pos-settings" element={<POSSettings />} />
          <Route path="/wine-archive" element={<WineArchive />} />
          <Route path="/training" element={<SommelierTraining />} />
          <Route path="/menu-sommelier" element={<MenuSommelierBridge />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function PanelContent() {
  const [path, setPath] = useState("/");
  const page = PANEL_PAGES[path] ?? <NotFound />;
  return (
    <div className="flex h-full w-full">
      <SidebarNav currentPath={path} onNavigate={setPath} />
      <main className="flex-1 overflow-auto">{page}</main>
    </div>
  );
}

function App() {
  const inRouter = useInRouterContext();
  return (
    <SidebarProvider defaultOpen={false} panelMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {inRouter ? (
            <PanelContent />
          ) : (
            <MemoryRouter
              initialEntries={["/"]}
              future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
            >
              <RoutesContent />
            </MemoryRouter>
          )}
        </ThemeProvider>
      </QueryClientProvider>
    </SidebarProvider>
  );
}

export default App;
