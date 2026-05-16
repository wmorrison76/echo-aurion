/**
 * Cake Order & Builder Module Wrapper
 * Standalone panel for cake design, customization, and order workflow
 * Can be loaded as a floating panel in Echo Recipe Pro or other instances
 * Integrates with recipe data from parent module when available
 */
import React, { Suspense, useState, useEffect } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import {
  getRecipeData,
  onRecipeDataUpdated,
  type Recipe,
} from "@/lib/recipe-data-bridge"; // Lazy load the Cake Studio component to reduce bundle size
const CakeStudio = React.lazy(() =>
  import("@/modules/EchoCanvasStudio/client/modules/cake-builder/CakeStudio")
    .then((mod) => ({ default: mod.default }))
    .catch((err) => {
      console.error("[CakeOrderModule] Failed to load CakeStudio:", err);
      return {
        default: () => (
          <div className="p-6 text-center">
            {" "}
            <p className="text-red-500 font-semibold mb-2">
              Failed to load Cake Studio
            </p>{" "}
            <p className="text-sm text-foreground/70">
              {err instanceof Error ? err.message : "Unknown error"}
            </p>{" "}
          </div>
        ),
      };
    }),
);
const NewOrderForm = React.lazy(() =>
  import("@/modules/EchoCanvasStudio/client/modules/cake-builder/NewOrderForm")
    .then((mod) => ({ default: mod.default }))
    .catch((err) => {
      console.error("[CakeOrderModule] Failed to load NewOrderForm:", err);
      return {
        default: () => (
          <div className="p-6 text-center">
            {" "}
            <p className="text-red-500 font-semibold mb-2">
              Failed to load Order Form
            </p>{" "}
            <p className="text-sm text-foreground/70">
              {err instanceof Error ? err.message : "Unknown error"}
            </p>{" "}
          </div>
        ),
      };
    }),
);
interface CakeOrderModuleProps {
  recipeData?: any;
  onOrderSubmit?: (order: any) => void;
  isPopout?: boolean;
  onPopout?: () => void;
  theme?: "light" | "dark";
}
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[CakeOrderModule] Error boundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          {" "}
          <h3 className="font-semibold text-red-500 mb-2">Module Error</h3>{" "}
          <p className="text-sm text-foreground/70 mb-4">
            {this.state.error?.message}
          </p>{" "}
          <code className="block text-xs bg-background/50 p-3 rounded mb-4 overflow-auto max-h-40 text-left">
            {" "}
            {this.state.error?.stack}{" "}
          </code>{" "}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm"
          >
            {" "}
            Reload{" "}
          </button>{" "}
        </div>
      );
    }
    return this.props.children;
  }
}
function CakeOrderModuleContent({
  recipeData: providedRecipeData,
  onOrderSubmit,
  isPopout = false,
  onPopout,
  theme = "dark",
}: CakeOrderModuleProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"studio" | "order">("studio");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[] | null>(
    providedRecipeData || getRecipeData(),
  ); // Subscribe to recipe data updates from the bridge useEffect(() => { console.log("[CakeOrderModule] Setting up recipe data subscription"); // Get initial data const initialRecipes = getRecipeData(); if (initialRecipes) { setRecipes(initialRecipes); console.log("[CakeOrderModule] Loaded", initialRecipes.length,"recipes from bridge"); } // Subscribe to updates const unsubscribe = onRecipeDataUpdated((updatedRecipes, timestamp) => { setRecipes(updatedRecipes); console.log("[CakeOrderModule] Received recipe update:", { count: updatedRecipes.length, timestamp, }); }); return unsubscribe; }, []); useEffect(() => { console.log("[CakeOrderModule] Mounted with props:", { hasProvidedRecipeData: !!providedRecipeData, hasBridgeRecipeData: !!recipes, recipeCount: recipes?.length || 0, hasOrderCallback: !!onOrderSubmit, isPopout, theme }); }, [providedRecipeData, recipes, onOrderSubmit, isPopout, theme]); return ( <div className={`w-full h-full flex flex-col overflow-hidden bg-background text-foreground ${ theme ==="dark" ?"dark" :"" }`} > {/* Tab Navigation & Controls */} <div className="flex items-center justify-between gap-2 p-4 border-b border-border/30 bg-background/50 flex-shrink-0"> <div className="flex gap-2"> <button onClick={() => setActiveTab("studio")} className={`px-4 py-2 rounded-md transition-all ${ activeTab ==="studio" ?"bg-primary text-primary-foreground font-semibold" :"hover:bg-background text-foreground/70" }`} > {t("module.cake-order.studio")} </button> <button onClick={() => setActiveTab("order")} className={`px-4 py-2 rounded-md transition-all ${ activeTab ==="order" ?"bg-primary text-primary-foreground font-semibold" :"hover:bg-background text-foreground/70" }`} > {t("module.cake-order.placeOrder")} </button> </div> {/* Right side controls */} <div className="flex items-center gap-2 ml-auto"> <ModuleChatButton moduleId="cake-order" moduleName={t("module.cake-order.title")} /> <div className="flex items-center gap-1"> {/* Pop-out Button */} {onPopout && !isPopout && ( <button onClick={onPopout} title="Open as separate panel" className="p-2 rounded hover:bg-primary/20 transition-colors flex items-center justify-center h-8 w-8" > <Maximize2 size={16} className="text-foreground/70 hover:text-primary" /> </button> )} {/* Fullscreen Toggle */} <button onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ?"Exit fullscreen" :"Fullscreen"} className="p-2 rounded hover:bg-primary/20 transition-colors flex items-center justify-center h-8 w-8" > {isFullscreen ? ( <Minimize2 size={16} className="text-foreground/70" /> ) : ( <Maximize2 size={16} className="text-foreground/70" /> )} </button> </div> </div> {/* Content Area */} <div className="flex-1 overflow-auto"> {activeTab ==="studio" && ( <Suspense fallback={ <div className="flex items-center justify-center h-full"> <div className="text-center"> <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div> <p className="text-sm text-foreground/60">Loading Design Studio...</p> </div> </div> } > <CakeStudio /> </Suspense> )} {activeTab ==="order" && ( <Suspense fallback={ <div className="flex items-center justify-center h-full"> <div className="text-center"> <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div> <p className="text-sm text-foreground/60">Loading Order Form...</p> </div> </div> } > <NewOrderForm /> </Suspense> )} </div> {/* Footer Info */} <div className="px-4 py-3 border-t border-border/30 bg-background/50 text-xs text-foreground/60 flex-shrink-0 flex items-center justify-between"> <p>Orders are saved to your local queue. Sync them to your system when ready.</p> {recipes && ( <span className="ml-auto text-foreground/50 text-xs"> {recipes.length} recipes available </span> )} </div> </div> );
} /** * Default export for panel loading * When imported as a module, this component will be rendered in a floating panel */
export default function CakeOrderModule(props: CakeOrderModuleProps) {
  return (
    <ErrorBoundary>
      {" "}
      <CakeOrderModuleContent {...props} />{" "}
    </ErrorBoundary>
  );
}
