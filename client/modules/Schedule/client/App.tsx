import "./global.css";
import React from "react";
import * as Sentry from "@sentry/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  MemoryRouter,
  useInRouterContext,
  useLocation,
} from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NotFound from "@/pages/NotFound";
import EmployeeMobile from "./pages/mobile/Employee";
import ManagerMobile from "./pages/mobile/Manager";
import { TenancyProvider } from "./hooks/useTenancy";
import { EchoAdvisor } from "./components/echo/EchoAdvisor";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { YieldProvider } from "./context/YieldContext";
import { AppDataProvider } from "./context/AppDataContext";
import { PageToolbarProvider } from "./context/PageToolbarContext";
import { CollaborationProvider } from "./context/CollaborationContext";
import { Locale } from "./lib/payroll";

const scheduleLangMap: Record<string, Locale> = {
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  ja: "en",
};

const getStoredLang = (): Locale => {
  if (typeof window === "undefined") return "en";

  try {
    return (localStorage.getItem("luccca_lang") as Locale) || "en";
  } catch {
    return "en";
  }
};

class ScheduleErrorBoundaryClass extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; eventId: string | null }
> {
  state = { error: null as Error | null, eventId: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Schedule] Render error:", error, info.componentStack);
    const eventId = Sentry.captureException(error, {
      contexts: {
        react_error_boundary: {
          module: "Schedule",
          componentStack: info.componentStack || "N/A",
        },
      },
      tags: {
        error_boundary: "ScheduleErrorBoundary",
        module: "Schedule",
        error_type: "render_error",
      },
      fingerprint: ["schedule-render-error", error.message],
    });
    this.setState({ eventId });
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] p-6 bg-amber-500/20 border border-amber-500/50 rounded-lg text-amber-950 dark:text-amber-100">
          <p className="font-semibold mb-2">Schedule content couldn’t load</p>
          <p className="text-sm opacity-90 mb-1">{this.state.error.message}</p>
          {this.state.eventId && (
            <p className="text-xs opacity-40 font-mono mb-4">
              Error ID: {this.state.eventId}
            </p>
          )}
          <button
            type="button"
            className="px-3 py-1.5 bg-amber-500 text-amber-950 rounded text-sm font-medium"
            onClick={() => this.setState({ error: null, eventId: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

function ScheduleBrowserBridge() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleLangChange = (e: Event) => {
      const globalLang = (e as CustomEvent).detail;
      const scheduleLang = scheduleLangMap[globalLang] || "en";

      try {
        localStorage.setItem("luccca_lang", scheduleLang);
      } catch {
        // ignore storage errors
      }

      (window as any).LUCCCA_LANG = scheduleLang;
      window.dispatchEvent(
        new CustomEvent("schedule:lang-changed", { detail: scheduleLang }),
      );
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "luccca_lang" && e.newValue) {
        (window as any).LUCCCA_LANG = e.newValue;
        window.dispatchEvent(
          new CustomEvent("schedule:lang-changed", { detail: e.newValue }),
        );
      }
    };

    window.addEventListener("i18n:lang", handleLangChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("i18n:lang", handleLangChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return null;
}

function ScheduleView() {
  const { pathname } = useLocation();
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (normalizedPath === "/" || normalizedPath.endsWith("/schedule")) {
    return <Index />;
  }

  if (normalizedPath.endsWith("/dashboard")) {
    return <Dashboard />;
  }

  if (normalizedPath.endsWith("/m/employee")) {
    return <EmployeeMobile />;
  }

  if (normalizedPath.endsWith("/m/manager")) {
    return <ManagerMobile />;
  }

  return <NotFound />;
}

const App = () => {
  const inRouterContext = useInRouterContext();

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).LUCCCA_LANG = getStoredLang();
    }
  }, []);

  const content = (
    <LanguageProvider>
      <AuthProvider>
        <YieldProvider>
          <AppDataProvider>
            <PageToolbarProvider>
              <CollaborationProvider>
                <TenancyProvider>
                  <ScheduleErrorBoundaryClass>
                    {inRouterContext ? (
                      <>
                        <ScheduleBrowserBridge />
                        <ScheduleView />
                        <EchoAdvisor />
                      </>
                    ) : (
                      <MemoryRouter
                        initialEntries={["/"]}
                        initialIndex={0}
                        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
                      >
                        <ScheduleBrowserBridge />
                        <ScheduleView />
                        <EchoAdvisor />
                      </MemoryRouter>
                    )}
                  </ScheduleErrorBoundaryClass>
                </TenancyProvider>
              </CollaborationProvider>
            </PageToolbarProvider>
          </AppDataProvider>
        </YieldProvider>
      </AuthProvider>
    </LanguageProvider>
  );

  return (
    <div
      className="schedule-panel-root w-full overflow-auto flex flex-col bg-background text-foreground"
      style={{
        flex: "1 1 auto",
        minHeight: 400,
        height: "100%",
      }}
    >
      {inRouterContext ? (
        content
      ) : (
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {content}
          </TooltipProvider>
        </QueryClientProvider>
      )}
    </div>
  );
};
export default App;
