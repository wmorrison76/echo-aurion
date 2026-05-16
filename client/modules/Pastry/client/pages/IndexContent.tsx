import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Menu,
  X,
  BookOpen,
  Plus,
  Camera,
  UtensilsCrossed,
  ClipboardList,
  FileText,
  Lightbulb,
  Palette,
  ChefHat,
  Sparkles,
} from "lucide-react";
import EchoCanvasStudioIntegrated from "./sections/EchoCanvasStudioIntegrated";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { getAndClearModuleTab } from "@/lib/module-tab-manager";
import { AppDataProvider } from "../context/AppDataContext";
import { AuthProvider } from "../context/AuthContext";
import { LanguageProvider } from "../context/LanguageContext";
import { YieldProvider } from "../context/YieldContext";
import { PageToolbarProvider } from "../context/PageToolbarContext";
import { CollaborationProvider } from "../context/CollaborationContext";
import { KeyboardShortcutsProvider } from "../context/KeyboardShortcutsContext";
// iter150: Gallery + DishAssembly sections were imported from Culinary and
// look up Culinary's own Context instances. Wrap them here so cross-module
// reuse works.
import { AppDataProvider as CulinaryAppDataProvider } from "@/modules/Culinary/client/context/AppDataContext";
import { LanguageProvider as CulinaryLanguageProvider } from "@/modules/Culinary/client/context/LanguageContext";
import { AuthProvider as CulinaryAuthProvider } from "@/modules/Culinary/client/context/AuthContext";

if (typeof console !== "undefined")
  console.log("[Pastry] IndexContent loaded (all context imports resolved)");

const RecipeSearchSection = React.lazy(() =>
  import("./sections/RecipeSearch").catch((err) => {
    console.error("Failed to load RecipeSearch", err);
    return {
      default: () => <div className="p-6">Failed to load Recipe Search</div>,
    };
  }),
);

const AddRecipeSection = React.lazy(() =>
  import("./sections/AddRecipe").catch((err) => {
    console.error("Failed to load AddRecipe", err);
    return {
      default: () => <div className="p-6">Failed to load Add Recipe</div>,
    };
  }),
);

const GallerySection = React.lazy(() =>
  import("./sections/Gallery").catch((err) => {
    console.error("Failed to load Gallery", err);
    return { default: () => <div className="p-6">Failed to load Gallery</div> };
  }),
);

const DishAssemblySection = React.lazy(() =>
  import("./sections/dish-assembly").catch((err) => {
    console.error("Failed to load DishAssembly", err);
    return {
      default: () => <div className="p-6">Failed to load Dish Assembly</div>,
    };
  }),
);

const ProductionSection = React.lazy(() =>
  import("./sections/Production").catch((err) => {
    console.error("Failed to load Production", err);
    return {
      default: () => <div className="p-6">Failed to load Production</div>,
    };
  }),
);

const ServerNotesSection = React.lazy(() =>
  import("./sections/server-notes").catch((err) => {
    console.error("Failed to load ServerNotes", err);
    return {
      default: () => <div className="p-6">Failed to load Server Notes</div>,
    };
  }),
);

const OperationsDocsSection = React.lazy(() =>
  import("./sections/operations-docs").catch((err) => {
    console.error("Failed to load OperationsDocs", err);
    return {
      default: () => <div className="p-6">Failed to load Operations Docs</div>,
    };
  }),
);

const EchoMenuStudio = React.lazy(() =>
  import("./sections/EchoMenuStudio").catch((err) => {
    console.error("Failed to load EchoMenuStudio", err);
    return {
      default: () => <div className="p-6">Failed to load Menu Studio</div>,
    };
  }),
);

function EchoCanvasStudioSection() {
  return <EchoCanvasStudioIntegrated initialTab="canvas" />;
}

function CakeBuilderSection() {
  return <EchoCanvasStudioIntegrated initialTab="cake-builder" />;
}

const TechniquesSection = React.lazy(() =>
  import("./sections/TechniquesSection").catch((err) => {
    console.error("Failed to load Techniques", err);
    return {
      default: () => <div className="p-6">Failed to load Techniques</div>,
    };
  }),
);

const queryClient = new QueryClient();

const NAV_SECTIONS = [
  {
    title: "RECIPES",
    items: [
      {
        id: "search",
        label: "RECIPES",
        icon: BookOpen,
        component: RecipeSearchSection,
      },
      {
        id: "add-recipe",
        label: "ADD RECIPE",
        icon: Plus,
        component: AddRecipeSection,
      },
      {
        id: "menu-studio",
        label: "MENU STUDIO",
        icon: Lightbulb,
        component: EchoMenuStudio,
      },
      {
        id: "gallery",
        label: "GALLERY",
        icon: Camera,
        component: GallerySection,
      },
      {
        id: "dish-assembly",
        label: "DISH ASSEMBLY",
        icon: UtensilsCrossed,
        component: DishAssemblySection,
      },
    ],
  },
  {
    title: "PASTRY STUDIO",
    items: [
      {
        id: "echo-canvas",
        label: "ECHO CANVAS",
        icon: Palette,
        component: EchoCanvasStudioSection,
      },
      {
        id: "cake-builder",
        label: "CAKE BUILDER",
        icon: ChefHat,
        component: CakeBuilderSection,
      },
      {
        id: "techniques",
        label: "TECHNIQUES",
        icon: Sparkles,
        component: TechniquesSection,
      },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      {
        id: "production",
        label: "PRODUCTION",
        icon: UtensilsCrossed,
        component: ProductionSection,
      },
      {
        id: "server-notes",
        label: "SERVER NOTES",
        icon: FileText,
        component: ServerNotesSection,
      },
      {
        id: "operations-docs",
        label: "OPERATIONS DOCS",
        icon: ClipboardList,
        component: OperationsDocsSection,
      },
    ],
  },
];

const LoadingFallback = () => (
  <div className="flex items-center justify-center w-full h-full py-12" style={{ backgroundColor: "#04060d" }}>
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-5 w-5 border border-[#c8a97e]/30 border-t-[#c8a97e] mb-4" />
      <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/40">Loading...</p>
    </div>
  </div>
);

class ComponentErrorBoundary extends React.Component<
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
    console.error("Pastry component error", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center" style={{ backgroundColor: "#3f0f0f", border: "1px solid #7f1d1d" }}>
          <div className="text-[#fca5a5] font-medium text-sm mb-2">
            Something went wrong
          </div>
          <p className="text-xs text-[#fca5a5]/60 mb-4">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-sm text-sm transition-all"
            style={{ backgroundColor: "rgba(200,169,126,0.1)", color: "#c8a97e", border: "1px solid rgba(200,169,126,0.3)" }}
            data-testid="pastry-error-reload"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function resolveInitialSection(): string {
  if (typeof window === "undefined") return "search";
  try {
    const tab = getAndClearModuleTab("pastry");
    if (tab) return tab;
  } catch {
    // module-tab-manager may be unavailable in panel context
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("tab") || "search";
}

function PastryContentInner() {
  const [activeSection, setActiveSection] = React.useState(
    resolveInitialSection,
  );
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [expandedSections, setExpandedSections] = React.useState<
    Record<string, boolean>
  >({
    RECIPES: true,
    "PASTRY STUDIO": true,
    OPERATIONS: false,
  });

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }));
  };

  const handleBackdropClick = () => {
    setSidebarOpen(false);
  };

  let ActiveComponent: React.ComponentType | null = null;
  for (const section of NAV_SECTIONS) {
    const item = section.items.find((i) => i.id === activeSection);
    if (item) {
      ActiveComponent = item.component;
      break;
    }
  }

  // Match Culinary layout: flex row, sidebar in flow (flex-shrink-0), same colors and structure
  // iter150: theme-aware — outer wrappers use CSS variables from ThemeManager
  // so Pastry honors the app-wide appearance (light / dark / system).
  // The EchoCanvas Studio section (Editor.tsx) keeps its own dark
  // styling because professional design tools are expected to stay dark.
  return (
    <div
      className="w-full flex flex-col relative min-h-[220px] pastry-root"
      style={{
        backgroundColor: "var(--background, #04060d)",
        color: "var(--foreground, rgba(255,255,255,0.95))",
        fontFamily: "'IBM Plex Sans', sans-serif",
        flex: "1 1 auto",
        minWidth: 280,
      }}
    >
      <div className="flex flex-1 overflow-hidden min-h-[200px] w-full">
        {sidebarOpen && (
          <div
            className="absolute inset-0 z-30 md:hidden"
            onClick={handleBackdropClick}
          />
        )}

        {/* Left Sidebar — theme-aware via CSS vars + contrast-safe fallbacks */}
        <div
          className={cn(
            "relative flex-shrink-0 flex flex-col h-full min-h-[200px] border-r transition-all duration-200 ease-in-out",
            "z-40 pastry-sidebar",
            sidebarOpen
              ? "w-48 md:w-56 py-4"
              : "w-11 px-1 py-4 overflow-hidden items-center",
          )}
          style={{ backgroundColor: "var(--surface, rgba(4,6,13,0.5))", borderColor: "var(--border, rgba(255,255,255,0.06))", color: "var(--foreground, rgba(255,255,255,0.95))" }}
        >
          {sidebarOpen && (
            <h2 className="text-[11px] font-mono uppercase tracking-[0.15em] mb-4 px-4 flex-shrink-0" style={{ color: "var(--muted-foreground, rgba(255,255,255,0.55))" }}>
              Pastry Suite
            </h2>
          )}
          {sidebarOpen ? (
            <div className="space-y-4 overflow-y-auto scrollbar-hide flex-1 px-1">
              {NAV_SECTIONS.map((section) => (
                <div key={section.title}>
                  <div
                    className="flex items-center justify-between px-4 mb-2 cursor-pointer transition-colors"
                    style={{ color: "var(--muted-foreground, rgba(255,255,255,0.55))" }}
                    onClick={() => toggleSection(section.title)}
                  >
                    <h3 className="text-[11px] font-mono uppercase tracking-[0.15em]">
                      {section.title}
                    </h3>
                    <span
                      className={cn(
                        "h-3 w-3 transition-transform flex-shrink-0",
                        expandedSections[section.title] && "rotate-180",
                      )}
                    >
                      ▾
                    </span>
                  </div>
                  {expandedSections[section.title] && (
                    <nav className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = activeSection === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveSection(item.id);
                              if (window.innerWidth < 768)
                                setSidebarOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center px-4 py-2.5 text-sm gap-2 justify-start rounded-sm transition-all flex-shrink-0",
                            )}
                            style={active
                              ? { color: "#c8a97e", background: "rgba(200,169,126,0.08)", borderLeft: "2px solid #c8a97e" }
                              : { color: "var(--foreground, rgba(255,255,255,0.85))" }
                            }
                            onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "rgba(200,169,126,0.06)"; } }}
                            onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; } }}
                            data-testid={`pastry-nav-${item.id}`}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 w-full overflow-y-auto scrollbar-hide flex-1">
              {NAV_SECTIONS.map((section) =>
                section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id);
                        if (window.innerWidth < 768) setSidebarOpen(false);
                      }}
                      title={item.label}
                      className={cn(
                        "w-full p-2 rounded-sm flex items-center justify-center transition-all flex-shrink-0",
                        activeSection === item.id
                          ? "bg-white/[0.03] text-[#c8a97e]"
                          : "text-white/40 hover:bg-white/[0.02] hover:text-white/70",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  );
                }),
              )}
            </div>
          )}

          {/* Toggle pill on right edge of sidebar (same pattern as Culinary) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-16 rounded-r border border-l-0 border-[rgba(255,255,255,0.06)] cursor-pointer hidden md:flex flex-col items-center justify-center transition-all hover:bg-white/[0.04] focus:outline-none z-50"
            style={{ backgroundColor: "rgba(11,15,26,0.9)" }}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            data-testid="pastry-sidebar-toggle"
          >
            <span className="text-white/40 text-[9px]">{sidebarOpen ? "\u25C0" : "\u25B6"}</span>
          </button>
        </div>

        {/* Main Content - same structure as Culinary */}
        <div
          className="flex-1 flex flex-col overflow-hidden min-w-0"
          onClick={() => sidebarOpen && setSidebarOpen(false)}
        >
          <div className="flex-shrink-0 h-14 items-center justify-between px-6 border-b flex"
            style={{ backgroundColor: "var(--surface, #0b0f1a)", borderColor: "var(--border, rgba(255,255,255,0.06))" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(!sidebarOpen);
              }}
              className="p-2 hover:bg-white/[0.04] rounded-sm transition-all md:hidden text-white/60"
              data-testid="pastry-mobile-menu"
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <div className="text-sm font-medium text-[#c8a97e]">
              {NAV_SECTIONS.flatMap((s) => s.items).find(
                (i) => i.id === activeSection,
              )?.label ?? "Pastry"}
            </div>
          </div>
          <div
            className="flex-1 overflow-auto scrollbar-hide min-w-0"
            style={{ minHeight: 180, backgroundColor: "#04060d" }}
          >
            <ComponentErrorBoundary>
              <React.Suspense fallback={<LoadingFallback />}>
                <div className="min-h-[100px] flex flex-col">
                  {ActiveComponent ? (
                    <ActiveComponent />
                  ) : (
                    <div className="p-6 text-white/40">Select a section</div>
                  )}
                </div>
              </React.Suspense>
            </ComponentErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PastryIndexContent() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <CulinaryLanguageProvider>
        <CulinaryAuthProvider>
        <CulinaryAppDataProvider>
        <LanguageProvider>
          <AuthProvider>
            <YieldProvider>
              <AppDataProvider>
                <PageToolbarProvider>
                  <CollaborationProvider>
                    <KeyboardShortcutsProvider>
                      <div
                        className="flex flex-1 min-h-0 flex-col overflow-auto min-w-[280px] w-full"
                        style={{ minHeight: 260, flex: "1 1 auto" }}
                      >
                        <ComponentErrorBoundary>
                          <PastryContentInner />
                        </ComponentErrorBoundary>
                      </div>
                    </KeyboardShortcutsProvider>
                  </CollaborationProvider>
                </PageToolbarProvider>
              </AppDataProvider>
            </YieldProvider>
          </AuthProvider>
        </LanguageProvider>
        </CulinaryAppDataProvider>
        </CulinaryAuthProvider>
        </CulinaryLanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
