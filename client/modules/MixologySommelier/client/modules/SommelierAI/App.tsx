import React, { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useI18n } from "@/i18n";
import { Navigation } from "./components/Navigation";
// Pages imported from parent module structure (go up 2 levels to client/pages)
import { Home } from "../../pages/Home";
import { Catalog } from "../../pages/Catalog";
import { Recommendations } from "../../pages/Recommendations";
import { TastingNotes } from "../../pages/TastingNotes";
import { Inventory } from "../../pages/Inventory";
import { PurchaseOrders } from "../../pages/PurchaseOrders";
import { CostingReport } from "../../pages/CostingReport";
import { CellarMonitoring } from "../../pages/CellarMonitoring";
import { Analytics } from "../../pages/Analytics";
import { WineArchive } from "../../pages/WineArchive";
import { SommelierTraining } from "../../pages/SommelierTraining";
import { MenuSommelierBridge } from "../../pages/MenuSommelierBridge";
import { Onboarding } from "../../pages/Onboarding";
import { Settings } from "../../pages/Settings";
import { LiquorInventory } from "../../pages/LiquorInventory";
import { TransferWorkflow } from "../../pages/TransferWorkflow";
import { CompedDrinks } from "../../pages/CompedDrinks";
import { VarianceAudit } from "../../pages/VarianceAudit";
import POSSettings from "../../pages/POSSettings";
import { NotFound } from "../../pages/NotFound";
import "./global.css";
import "./luccca-lookbook.css";
const queryClient = new QueryClient(); // Lazy-load pages that pull in large deps (recharts/date-fns) so they don't block module boot.
const POSDashboard = lazy(() => import("../../pages/POSDashboard"));
const AdvancedAnalytics = lazy(() =>
  import("../../pages/AdvancedAnalytics").then((m) => ({
    default: m.AdvancedAnalytics,
  })),
);
export function App() {
  const { lang } = useI18n();
  const [currentLang, setCurrentLang] = useState(lang); // Listen for language changes from topbar useEffect(() => { const handleLangChange = (e: CustomEvent) => { const newLang = e.detail; setCurrentLang(newLang); // Force re-render by updating document lang document.documentElement.setAttribute("lang", newLang); }; window.addEventListener("i18n:lang", handleLangChange as EventListener); window.addEventListener("i18n:language-changed", handleLangChange as EventListener); return () => { window.removeEventListener("i18n:lang", handleLangChange as EventListener); window.removeEventListener("i18n:language-changed", handleLangChange as EventListener); }; }, []); // Sync with main i18n system useEffect(() => { setCurrentLang(lang); }, [lang]); return ( <QueryClientProvider client={queryClient}> <div className="luccca-theme min-h-screen" lang={currentLang}> <Navigation /> <Suspense fallback={ <div className="p-6 text-center text-foreground"> Loading… </div> } > <Routes> {/* Onboarding */} <Route path="/onboarding" element={<Onboarding />} /> {/* Core Pages */} <Route path="/" element={<Home />} /> <Route path="/catalog" element={<Catalog />} /> <Route path="/recommendations" element={<Recommendations />} /> <Route path="/tasting-notes" element={<TastingNotes />} /> {/* Inventory & Procurement */} <Route path="/inventory" element={<Inventory />} /> <Route path="/liquor-inventory" element={<LiquorInventory />} /> <Route path="/transfers" element={<TransferWorkflow />} /> <Route path="/comped-drinks" element={<CompedDrinks />} /> <Route path="/variance-audit" element={<VarianceAudit />} /> <Route path="/purchase-orders" element={<PurchaseOrders />} /> {/* Reporting & Analytics */} <Route path="/costing-report" element={<CostingReport />} /> <Route path="/analytics" element={<Analytics />} /> <Route path="/advanced-analytics" element={<AdvancedAnalytics />} /> <Route path="/cellar-monitoring" element={<CellarMonitoring />} /> {/* POS Integration */} <Route path="/pos-dashboard" element={<POSDashboard />} /> <Route path="/pos-settings" element={<POSSettings />} /> {/* Premium Features */} <Route path="/wine-archive" element={<WineArchive />} /> <Route path="/training" element={<SommelierTraining />} /> <Route path="/menu-sommelier" element={<MenuSommelierBridge />} /> {/* Settings & Admin */} <Route path="/settings" element={<Settings />} /> {/* Fallback */} <Route path="*" element={<NotFound />} /> </Routes> </Suspense> </div> </QueryClientProvider> );
}
export default App;
