import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import {
  KeyboardShortcutsProvider,
  useRegisterShortcut,
} from "@/context/KeyboardShortcutsContext";
import { HelpCircle, Loader2 } from "lucide-react";
import ErrorBoundaryWrapper from "@/components/ErrorBoundaryWrapper";

// Lazy-load sections to reduce initial bundle size and speed up module loading
const RecipeSearchSection = lazy(() => import("./sections/RecipeSearch"));
const GallerySection = lazy(() => import("./sections/Gallery"));
const AddRecipeSection = lazy(() => import("./sections/AddRecipe"));
const SaasRoadmapSection = lazy(() => import("./sections/SaasRoadmap"));
const InventorySuppliesWorkspace = lazy(() => import("./sections/saas/InventorySuppliesWorkspace"));
const InventoryTransfersWorkspace = lazy(() => import("./sections/saas/InventoryTransfersWorkspace"));
const NutritionAllergensWorkspace = lazy(() => import("./sections/saas/NutritionAllergensWorkspace"));
const HaccpComplianceWorkspace = lazy(() => import("./sections/saas/HaccpComplianceWorkspace"));
const WasteTrackingWorkspace = lazy(() => import("./sections/saas/WasteTrackingWorkspace"));
const CustomerServiceWorkspace = lazy(() => import("./sections/saas/CustomerServiceWorkspace"));
const PlateCostingWorkspace = lazy(() => import("./sections/saas/PlateCostingWorkspace"));
const SupplierManagementWorkspace = lazy(() => import("./sections/saas/SupplierManagementWorkspace"));
const MultiTenantOrgsWorkspace = lazy(() => import("./sections/saas/MultiTenantOrgsWorkspace"));
const TeamWorkspacesWorkspace = lazy(() => import("./sections/saas/TeamWorkspacesWorkspace"));
const APIWebhooksWorkspace = lazy(() => import("./sections/saas/APIWebhooksWorkspace"));
const MobileOfflineWorkspace = lazy(() => import("./sections/saas/MobileOfflineWorkspace"));
const MultiLocationWorkspace = lazy(() => import("./sections/saas/MultiLocationWorkspace"));
const BillingSubscriptionsWorkspace = lazy(() => import("./sections/saas/BillingSubscriptionsWorkspace"));
const ProductionSection = lazy(() => import("./sections/Production"));
const PurchasingReceivingSection = lazy(() => import("./sections/purchasing-receiving"));
const ServerNotesSection = lazy(() => import("./sections/server-notes"));
const OperationsDocsSection = lazy(() => import("./sections/operations-docs"));
const DishAssemblySection = lazy(() => import("./sections/dish-assembly"));
const MenuDesignStudioWrapper = lazy(() => import("@/components/MenuDesignStudio/MenuDesignStudioWrapper"));
const RecipeDeploymentPanel = lazy(() => import("@/components/RecipeDeploymentPanel"));
const RDLabsWorkspace = lazy(() => import("./sections/RDLabsWorkspace"));
// D16a · EchoTraining hidden in Culinary per architectural review.
// Domain training lives in the dedicated EchoAi³ panels per discipline:
// Chef Carissa for Pastry/BEO and Chef Gio for Banquet bases. Culinary
// (line cooks, recipe builder) doesn't need its own training surface
// — recipe knowledge feeds Echo via the recipe vector index, not via
// a chat trainer. Re-add by restoring the lazy import + TabsContent
// (see git history for the original block) if this changes.

const MenuDesignStudioSection = MenuDesignStudioWrapper;

import TopTabs from "@/components/TopTabs";
import SubtleBottomGlow from "@/components/SubtleBottomGlow";
import TronBackdrop from "@/components/TronBackdrop";
import CornerBrand from "@/components/CornerBrand";
import { EchoRecipeProHelpModal } from "@/components/EchoRecipeProHelpModal";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  PageToolbarProvider,
  usePageToolbar,
} from "@/context/PageToolbarContext";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";

const SectionLoading = () => (
  <div className="flex h-[400px] w-full items-center justify-center" style={{ backgroundColor: "#04060d" }}>
    <div className="flex flex-col items-center gap-3">
      <div className="inline-block animate-spin rounded-full h-5 w-5 border border-[#c8a97e]/30 border-t-[#c8a97e]" />
      <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/40">
        Loading...
      </span>
    </div>
  </div>
);

export default function Index() {
  return (
    <PageToolbarProvider>
      <KeyboardShortcutsProvider>
        <IndexContent />
      </KeyboardShortcutsProvider>
    </PageToolbarProvider>
  );
}

function IndexContent() {
  const [params, setParams] = useSearchParams();
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const active = params.get("tab") || "search";
  const {
    config: { items: toolbarItems, title: toolbarTitle },
  } = usePageToolbar();
  const toolbarTransition = {
    duration: 0.375,
    ease: [0.4, 0, 0.2, 1],
  } as const;

  const handleAddRecipeShortcut = useCallback(() => {
    setParams({ tab: "add-recipe" }, { replace: true });
  }, [setParams]);

  const shortcutConfig = useMemo(
    () => ({
      key: "n",
      meta: true,
      handler: handleAddRecipeShortcut,
      preventDefault: true,
    }),
    [handleAddRecipeShortcut],
  );

  useRegisterShortcut("add-recipe-shortcut", shortcutConfig);

  const handleTabChange = useCallback(
    (v: string) => {
      setParams({ tab: v }, { replace: true });
    },
    [setParams],
  );

  return (
    <TronBackdrop>
      <CommandPalette />
      <div
        className="relative text-foreground flex flex-col h-full"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        <TopTabs />
        <header className="flex items-center justify-between gap-3 px-6 h-14 border-b border-[rgba(255,255,255,0.06)]" style={{ backgroundColor: "#0b0f1a", fontFamily: "'IBM Plex Sans', sans-serif" }}>
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium tracking-tight text-[#c8a97e]">
                Culinary Suite
              </span>
              <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/40">
                {toolbarTitle || "Research & Development"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence mode="sync">
              {toolbarItems.length ? (
                <motion.div
                  key="toolbar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: toolbarTransition }}
                  exit={{ opacity: 0, transition: toolbarTransition }}
                  className="flex items-center gap-2"
                >
                  {toolbarItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        transition: {
                          ...toolbarTransition,
                          delay: index * 0.04,
                        },
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.88,
                        transition: toolbarTransition,
                      }}
                    >
                      {item.type === "custom" ? (
                        item.element
                      ) : (
                        <button
                          type="button"
                          onClick={item.onClick}
                          className={item.className}
                          aria-label={item.ariaLabel || item.label}
                          title={item.title || item.label}
                        >
                          {item.icon ? (
                            <item.icon className="h-4 w-4" aria-hidden />
                          ) : null}
                          <span className="sr-only">{item.label}</span>
                        </button>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHelpModalOpen(true)}
              className="gap-2"
              title="Open EchoRecipe Pro Help"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="sr-only">Help</span>
            </Button>
          </div>
        </header>
        <main className="w-full flex-1 flex flex-col overflow-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          <Tabs
            value={active}
            onValueChange={handleTabChange}
            className="w-full flex flex-col flex-1"
          >
            <TabsContent value="search">
              <ErrorBoundaryWrapper section="Recipe Search">
                <Suspense fallback={<SectionLoading />}>
                  <RecipeSearchSection />
                </Suspense>
              </ErrorBoundaryWrapper>
            </TabsContent>
            <TabsContent value="gallery">
              <ErrorBoundaryWrapper section="Gallery">
                <Suspense fallback={<SectionLoading />}>
                  <GallerySection />
                </Suspense>
              </ErrorBoundaryWrapper>
            </TabsContent>
            <TabsContent value="add-recipe">
              <ErrorBoundaryWrapper section="Add Recipe">
                <Suspense fallback={<SectionLoading />}>
                  <AddRecipeSection />
                </Suspense>
              </ErrorBoundaryWrapper>
            </TabsContent>
            <TabsContent value="saas">
              <Suspense fallback={<SectionLoading />}>
                <SaasRoadmapSection />
              </Suspense>
            </TabsContent>
            <TabsContent value="inventory">
              <div className="container mx-auto space-y-3 px-3 py-3">
                <Suspense fallback={<SectionLoading />}>
                  <InventorySuppliesWorkspace />
                </Suspense>
              </div>
            </TabsContent>
            <TabsContent value="inventory-transfers">
              <div className="container mx-auto space-y-3 px-3 py-3">
                <Suspense fallback={<SectionLoading />}>
                  <InventoryTransfersWorkspace />
                </Suspense>
              </div>
            </TabsContent>
            <TabsContent value="nutrition">
              <div className="container mx-auto space-y-3 px-3 py-3">
                <Suspense fallback={<SectionLoading />}>
                  <NutritionAllergensWorkspace />
                </Suspense>
              </div>
            </TabsContent>
            <TabsContent value="haccp">
              <div className="container mx-auto space-y-3 px-3 py-3">
                <Suspense fallback={<SectionLoading />}>
                  <HaccpComplianceWorkspace />
                </Suspense>
              </div>
            </TabsContent>
            <TabsContent value="waste-tracking">
              <div className="container mx-auto space-y-3 px-3 py-3">
                <Suspense fallback={<SectionLoading />}>
                  <WasteTrackingWorkspace />
                </Suspense>
              </div>
            </TabsContent>
            <TabsContent value="customer-service">
              <div className="container mx-auto space-y-3 px-3 py-3">
                <Suspense fallback={<SectionLoading />}>
                  <CustomerServiceWorkspace />
                </Suspense>
              </div>
            </TabsContent>
            <TabsContent value="plate-costing">
              <div className="container mx-auto space-y-3 px-3 py-3">
                <Suspense fallback={<SectionLoading />}>
                  <PlateCostingWorkspace />
                </Suspense>
              </div>
            </TabsContent>
            <TabsContent value="suppliers">
              <div className="container mx-auto space-y-3 px-3 py-3">
                <Suspense fallback={<SectionLoading />}>
                  <SupplierManagementWorkspace />
                </Suspense>
              </div>
            </TabsContent>
            <TabsContent value="orgs">
              <Suspense fallback={<SectionLoading />}>
                <MultiTenantOrgsWorkspace />
              </Suspense>
            </TabsContent>
            <TabsContent value="workspaces">
              <Suspense fallback={<SectionLoading />}>
                <TeamWorkspacesWorkspace />
              </Suspense>
            </TabsContent>
            <TabsContent value="api-webhooks">
              <Suspense fallback={<SectionLoading />}>
                <APIWebhooksWorkspace />
              </Suspense>
            </TabsContent>
            <TabsContent value="mobile-offline">
              <Suspense fallback={<SectionLoading />}>
                <MobileOfflineWorkspace />
              </Suspense>
            </TabsContent>
            <TabsContent value="multi-location">
              <Suspense fallback={<SectionLoading />}>
                <MultiLocationWorkspace />
              </Suspense>
            </TabsContent>
            <TabsContent value="billing">
              <Suspense fallback={<SectionLoading />}>
                <BillingSubscriptionsWorkspace />
              </Suspense>
            </TabsContent>
            <TabsContent value="recipe-deployments">
              <Suspense fallback={<SectionLoading />}>
                <RecipeDeploymentPanel isEnabled={true} />
              </Suspense>
            </TabsContent>
            <TabsContent value="dish-assembly">
              <Suspense fallback={<SectionLoading />}>
                <DishAssemblySection />
              </Suspense>
            </TabsContent>
            <TabsContent value="menu-design">
              <Suspense fallback={<SectionLoading />}>
                <MenuDesignStudioSection />
              </Suspense>
            </TabsContent>
            <TabsContent value="server-notes">
              <Suspense fallback={<SectionLoading />}>
                <ServerNotesSection />
              </Suspense>
            </TabsContent>
            <TabsContent value="operations-docs">
              <Suspense fallback={<SectionLoading />}>
                <OperationsDocsSection />
              </Suspense>
            </TabsContent>
            <TabsContent value="production">
              <Suspense fallback={<SectionLoading />}>
                <ProductionSection />
              </Suspense>
            </TabsContent>
            <TabsContent value="purch-rec">
              <Suspense fallback={<SectionLoading />}>
                <PurchasingReceivingSection />
              </Suspense>
            </TabsContent>
            {/* D16a · echo-training tab removed — see header note */}
            <TabsContent value="rdlabs">
              <ErrorBoundaryWrapper section="R&D Labs">
                <Suspense fallback={<SectionLoading />}>
                  <RDLabsWorkspace />
                </Suspense>
              </ErrorBoundaryWrapper>
            </TabsContent>
          </Tabs>
        </main>

        <SubtleBottomGlow />
        <CornerBrand />
      </div>
      <EchoRecipeProHelpModal
        isOpen={helpModalOpen}
        onOpenChange={setHelpModalOpen}
      />
    </TronBackdrop>
  );
}
