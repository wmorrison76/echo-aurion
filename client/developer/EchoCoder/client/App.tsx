import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";

// Initialize Sentry lazily on app startup
let captureSentryError: any = null;
(async () => {
  try {
    const { initializeSentry, captureSentryError: captureError } = await import(
      "@/lib/sentry"
    );
    captureSentryError = captureError;
    initializeSentry();
  } catch (error) {
    console.warn("Failed to load Sentry:", error);
  }
})();
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  useInRouterContext,
  Navigate,
} from "react-router-dom";
import { lazy, Suspense, Component, ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import GuideOverlay from "@/components/echo/GuideOverlay";
import PanelHost from "@/components/site/PanelHost";
import Index from "./pages/Index";
import Board from "./pages/Board";
import LuccaDashboard from "./pages/LuccaDashboard";
import Studio from "./pages/Studio";
import NotFound from "./pages/NotFound";
import { I18nProvider } from "@/i18n";
import StudioEmbed from "./pages/EmbedEcho";
import MenuBar from "@/components/site/MenuBar";
import EchoControlsPage from "./pages/EchoControls";
import SandboxGenerated from "./pages/Sandbox";
import Settings from "./pages/Settings";
import Resources from "./pages/Resources";
import CMS from "./pages/CMS";
import VisualEditor from "./pages/VisualEditor";
import EchoTraining from "./pages/EchoTraining";
import { OnboardingFlow } from "@/components/studio/OnboardingFlow";

/**
 * Global Error Boundary to catch rendering errors
 */
class GlobalErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    console.error("GlobalErrorBoundary caught error:", error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error("Error details:", error);
    console.error("Component stack:", errorInfo.componentStack);

    // Send to Sentry if available
    if (captureSentryError) {
      try {
        captureSentryError(error, {
          componentStack: errorInfo.componentStack,
          type: "GlobalErrorBoundary",
        });
      } catch (sentryError) {
        console.warn("Failed to send error to Sentry:", sentryError);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center max-w-md">
            <h1 className="text-xl font-bold text-foreground mb-2">
              Application Error
            </h1>
            <p className="text-muted-foreground mb-4 font-mono text-sm">
              {this.state.error?.message || "Unknown error"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Golden Seed Pages
import GoldenSeedDashboard from "./pages/GoldenSeedDashboard";
import CulinaryPage from "./pages/modules/Culinary";
import PastryPage from "./pages/modules/Pastry";
import SchedulePage from "./pages/modules/Schedule";
import InventoryPage from "./pages/modules/Inventory";
import CRMPage from "./pages/modules/CRM";
import ChefNetPage from "./pages/modules/ChefNet";
import SupportPage from "./pages/modules/Support";
import WhiteboardPage from "./pages/modules/Whiteboard";
import VideoPage from "./pages/modules/Video";
import CanvasPage from "./pages/modules/Canvas";
import StickyNotesPage from "./pages/modules/StickyNotes";
import MaestroPage from "./pages/modules/Maestro";
import MixologyPage from "./pages/modules/Mixology";
import EchoCoderPage from "./pages/modules/EchoCoder";
import AurumPage from "./pages/modules/Aurum";
import LayoutPage from "./pages/modules/Layout";
import EchoAIPage from "./pages/EchoAI";

const Generated = lazy(() => import("./pages/Generated"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AutomationPreview = lazy(() => import("./pages/AutomationPreview"));
const ZaroPanel = lazy(() => import("./echo-dev-core/ZaroPanel"));
const GitIntegrationPage = lazy(() => import("./pages/GitIntegration"));
const TestingStudioPage = lazy(() => import("./pages/TestingStudio"));
const WebhookManagerPage = lazy(() => import("./pages/WebhookManager"));
const AutomationStudioPage = lazy(() => import("./pages/AutomationStudio"));
const DeploymentStudioPage = lazy(() => import("./pages/DeploymentStudio"));
const MCPDashboardPage = lazy(() => import("./pages/MCPDashboard"));
const FigmaToCodePage = lazy(() => import("./pages/FigmaToCode"));
const FigmaDesignEnvironmentPage = lazy(() => import("./pages/FigmaDesignEnvironment"));
const PrototypeViewerPage = lazy(() => import("./pages/PrototypeViewer"));

const queryClient = new QueryClient();

function MaybeRouter({ children }: { children: React.ReactNode }) {
  const inCtx = useInRouterContext();
  return inCtx ? <>{children}</> : <BrowserRouter>{children}</BrowserRouter>;
}

const App = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <MaybeRouter>
        <I18nProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Header />
              <MenuBar />
              <OnboardingFlow />
              <Routes>
                {/* Legacy Routes */}
                <Route path="/" element={<LuccaDashboard />} />
                <Route path="/board" element={<Board />} />
                <Route path="/echo-dashboard" element={<Board />} />
                <Route path="/studio" element={<Studio />} />
                <Route
                  path="/zaro"
                  element={
                    <Suspense
                      fallback={<div className="container py-10">Loading…</div>}
                    >
                      <ZaroPanel />
                    </Suspense>
                  }
                />
                <Route
                  path="/generated"
                  element={
                    <Suspense
                      fallback={<div className="container py-10">Loading…</div>}
                    >
                      <Generated />
                    </Suspense>
                  }
                />
                <Route
                  path="/automation/:slug"
                  element={
                    <Suspense
                      fallback={<div className="container py-10">Loading…</div>}
                    >
                      <AutomationPreview />
                    </Suspense>
                  }
                />
                <Route
                  path="/sandbox"
                  element={<Navigate to="/sandbox/generated" replace />}
                />
                <Route
                  path="/embed/echo"
                  element={
                    <div className="min-h-screen bg-background">
                      <StudioEmbed />
                    </div>
                  }
                />
                <Route
                  path="/sandbox/generated"
                  element={<SandboxGenerated />}
                />
                <Route path="/echo-controls" element={<EchoControlsPage />} />
                <Route path="/echo-training" element={<EchoTraining />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/cms" element={<CMS />} />
                <Route path="/editor" element={<VisualEditor />} />
                <Route
                  path="/figma-to-code"
                  element={
                    <Suspense
                      fallback={<div className="container py-10">Loading…</div>}
                    >
                      <FigmaToCodePage />
                    </Suspense>
                  }
                />
                <Route
                  path="/figma-design"
                  element={
                    <Suspense
                      fallback={<div className="container py-10">Loading…</div>}
                    >
                      <FigmaDesignEnvironmentPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/prototype-viewer"
                  element={
                    <Suspense
                      fallback={<div className="container py-10">Loading…</div>}
                    >
                      <PrototypeViewerPage />
                    </Suspense>
                  }
                />

                {/* Enterprise Features */}
                <Route
                  path="/analytics"
                  element={
                    <Suspense
                      fallback={<div className="container py-10">Loading…</div>}
                    >
                      <Analytics />
                    </Suspense>
                  }
                />
                <Route
                  path="/git-integration"
                  element={
                    <Suspense
                      fallback={<div className="container py-10">Loading…</div>}
                    >
                      <GitIntegrationPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/testing"
                  element={
                    <Suspense
                      fallback={<div className="container py-10">Loading…</div>}
                    >
                      <TestingStudioPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/webhooks"
                  element={
                    <Suspense
                      fallback={<div className="container py-10">Loading…</div>}
                    >
                      <WebhookManagerPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/automation-studio"
                  element={
                    <Suspense
                      fallback={<div className="container py-10">Loading…</div>}
                    >
                      <AutomationStudioPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/deployment-studio"
                  element={
                    <Suspense
                      fallback={<div className="container py-10">Loading…</div>}
                    >
                      <DeploymentStudioPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/mcp-dashboard"
                  element={
                    <Suspense
                      fallback={<div className="container py-10">Loading…</div>}
                    >
                      <MCPDashboardPage />
                    </Suspense>
                  }
                />

                {/* Golden Seed Routes */}
                <Route path="/dashboard" element={<GoldenSeedDashboard />} />
                <Route path="/culinary" element={<CulinaryPage />} />
                <Route path="/pastry" element={<PastryPage />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/crm" element={<CRMPage />} />
                <Route path="/chefnet" element={<ChefNetPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/whiteboard" element={<WhiteboardPage />} />
                <Route path="/video" element={<VideoPage />} />
                <Route path="/canvas" element={<CanvasPage />} />
                <Route path="/stickynotes" element={<StickyNotesPage />} />
                <Route path="/maestro" element={<MaestroPage />} />
                <Route path="/mixology" element={<MixologyPage />} />
                <Route path="/echocoder" element={<EchoCoderPage />} />
                <Route path="/echo-ai" element={<EchoAIPage />} />
                <Route path="/aurum" element={<AurumPage />} />
                <Route path="/layout" element={<LayoutPage />} />

                {/* Test route - simple page to verify app is working */}
                <Route
                  path="/test"
                  element={
                    <div className="p-10">
                      <h1>App is working!</h1>
                    </div>
                  }
                />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <GuideOverlay />
              {/* Global panel host for LUCCCA event-driven panels */}
              <PanelHost />
              <Footer />
            </TooltipProvider>
          </ThemeProvider>
        </I18nProvider>
      </MaybeRouter>
    </QueryClientProvider>
  </GlobalErrorBoundary>
);

if (typeof window !== "undefined") {
  const container = document.getElementById("root");
  if (container) {
    // Reuse existing root across HMR to avoid duplicate createRoot warnings
    const g = globalThis as any;
    if (g.__appRoot) {
      g.__appRoot.render(<App />);
    } else {
      g.__appRoot = createRoot(container);
      g.__appRoot.render(<App />);
    }
  }
}

export default App;
