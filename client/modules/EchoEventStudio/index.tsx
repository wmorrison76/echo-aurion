/**
 * Panel-aware wrapper for EchoEventStudio (Echo Events)
 *
 * NOTE: The host application already renders a Router at the app root.
 * React Router forbids nested Routers, but EchoEventStudio needs its own
 * internal navigation that should not mutate the host URL.
 *
 * To support this safely inside panels, we render EchoEventStudio into an
 * isolated React root mounted inside this component. That isolates Router
 * context and avoids the "<Router> inside another <Router>" runtime error.
 */
import React, { Suspense, type CSSProperties } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, Navigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { safeConsoleError } from "./client/lib/safe-error";
import Layout from "./client/components/Layout";

const Dashboard = React.lazy(() =>
  import("./client/pages/Dashboard").catch((err) => {
    safeConsoleError("Failed to load Dashboard", err);
    return {
      default: () => <div className="p-6">Failed to load Dashboard</div>,
    };
  }),
);

const Prospects = React.lazy(() =>
  import("./client/pages/Prospects").catch((err) => {
    safeConsoleError("Failed to load Prospects", err);
    return {
      default: () => <div className="p-6">Failed to load Prospects</div>,
    };
  }),
);

const Clients = React.lazy(() =>
  import("./client/pages/Clients").catch((err) => {
    safeConsoleError("Failed to load Clients", err);
    return {
      default: () => <div className="p-6">Failed to load Clients</div>,
    };
  }),
);

const Forecast = React.lazy(() =>
  import("./client/pages/Forecast").catch((err) => {
    safeConsoleError("Failed to load Forecast", err);
    return {
      default: () => <div className="p-6">Failed to load Forecast</div>,
    };
  }),
);

const ResortForecast = React.lazy(() =>
  import("./client/pages/ResortForecast").catch((err) => {
    safeConsoleError("Failed to load Resort Forecast", err);
    return {
      default: () => <div className="p-6">Failed to load Resort Forecast</div>,
    };
  }),
);

const ClientImport = React.lazy(() =>
  import("./client/pages/ClientImport").catch((err) => {
    safeConsoleError("Failed to load Client Import", err);
    return {
      default: () => <div className="p-6">Failed to load Client Import</div>,
    };
  }),
);

const EventsPage = React.lazy(() =>
  import("./client/pages/Events").catch((err) => {
    safeConsoleError("Failed to load Events", err);
    return {
      default: () => <div className="p-6">Failed to load Events</div>,
    };
  }),
);

const Beo = React.lazy(() =>
  import("./client/pages/Beo").catch((err) => {
    safeConsoleError("Failed to load BEO", err);
    return {
      default: () => <div className="p-6">Failed to load BEO</div>,
    };
  }),
);

const Reo = React.lazy(() =>
  import("./client/pages/Reo").catch((err) => {
    safeConsoleError("Failed to load REO", err);
    return {
      default: () => <div className="p-6">Failed to load REO</div>,
    };
  }),
);

const MenuCatalog = React.lazy(() =>
  import("./client/pages/MenuCatalog").catch((err) => {
    safeConsoleError("Failed to load Menu Catalog", err);
    return {
      default: () => <div className="p-6">Failed to load Menu Catalog</div>,
    };
  }),
);

const Calendar = React.lazy(() =>
  import("./client/pages/Calendar").catch((err) => {
    safeConsoleError("Failed to load Calendar", err);
    return {
      default: () => <div className="p-6">Failed to load Calendar</div>,
    };
  }),
);

const Analytics = React.lazy(() =>
  import("./client/pages/Analytics").catch((err) => {
    safeConsoleError("Failed to load Analytics", err);
    return {
      default: () => <div className="p-6">Failed to load Analytics</div>,
    };
  }),
);

const SalesLeader = React.lazy(() =>
  import("./client/pages/SalesLeader").catch((err) => {
    safeConsoleError("Failed to load Sales Leader", err);
    return {
      default: () => <div className="p-6">Failed to load Sales Leader</div>,
    };
  }),
);

const Admin = React.lazy(() =>
  import("./client/pages/Admin").catch((err) => {
    safeConsoleError("Failed to load Admin", err);
    return {
      default: () => <div className="p-6">Failed to load Admin</div>,
    };
  }),
);

const Studio = React.lazy(() =>
  import("./client/pages/Studio").catch((err) => {
    safeConsoleError("Failed to load Studio", err);
    return {
      default: () => <div className="p-6">Failed to load Studio</div>,
    };
  }),
);

const Planner = React.lazy(() =>
  import("./client/pages/Planner").catch((err) => {
    safeConsoleError("Failed to load Planner", err);
    return {
      default: () => <div className="p-6">Failed to load Planner</div>,
    };
  }),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
});

function EchoEventStudioInner({ theme }: { theme: "light" | "dark" }) {
  const containerClassName = React.useMemo(() => {
    const base =
      "echoeventstudio-scope relative w-full h-full overflow-hidden bg-background text-foreground";
    return theme === "dark" ? `${base} dark` : `${base} light`;
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div
          className={containerClassName}
          style={{ "--sidebar-offset": "0.35rem" } as CSSProperties}
        >
          <Suspense
            fallback={
              <div className="flex items-center justify-center w-full h-full">
                <div className="text-center">
                  <p className="text-foreground/60">Loading Echo Events...</p>
                  <p className="text-xs text-foreground/40 mt-2">
                    Initializing event planning interface
                  </p>
                </div>
              </div>
            }
          >
            <MemoryRouter
              initialEntries={["/dashboard"]}
              future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
            >
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route
                  path="/dashboard"
                  element={
                    <Layout>
                      <Dashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/prospects"
                  element={
                    <Layout>
                      <Prospects />
                    </Layout>
                  }
                />
                <Route
                  path="/clients"
                  element={
                    <Layout>
                      <Clients />
                    </Layout>
                  }
                />
                <Route
                  path="/forecast"
                  element={
                    <Layout>
                      <Forecast />
                    </Layout>
                  }
                />
                <Route
                  path="/resort-forecast"
                  element={
                    <Layout>
                      <ResortForecast />
                    </Layout>
                  }
                />
                <Route
                  path="/import"
                  element={
                    <Layout>
                      <ClientImport />
                    </Layout>
                  }
                />
                <Route
                  path="/events"
                  element={
                    <Layout>
                      <EventsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/beo"
                  element={
                    <Layout>
                      <Beo />
                    </Layout>
                  }
                />
                <Route
                  path="/reo"
                  element={
                    <Layout>
                      <Reo />
                    </Layout>
                  }
                />
                <Route
                  path="/menus"
                  element={
                    <Layout>
                      <MenuCatalog />
                    </Layout>
                  }
                />
                <Route
                  path="/calendar"
                  element={
                    <Layout>
                      <Calendar />
                    </Layout>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <Layout>
                      <Analytics />
                    </Layout>
                  }
                />
                <Route
                  path="/sales-leader"
                  element={
                    <Layout>
                      <SalesLeader />
                    </Layout>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <Layout>
                      <Admin />
                    </Layout>
                  }
                />
                <Route
                  path="/studio"
                  element={
                    <Layout>
                      <Studio />
                    </Layout>
                  }
                />
                <Route
                  path="/planner"
                  element={
                    <Layout>
                      <Planner />
                    </Layout>
                  }
                />
              </Routes>
            </MemoryRouter>
          </Suspense>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default function EchoEventStudioWrapper() {
  const mountRef = React.useRef<HTMLDivElement | null>(null);
  const rootRef = React.useRef<Root | null>(null);
  const unmountTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [theme, setTheme] = React.useState<"light" | "dark">("dark");

  // Detect theme from document/html element instead of using useTheme hook
  React.useEffect(() => {
    const detectTheme = () => {
      const html = document.documentElement;
      const isDark =
        html.classList.contains("dark") ||
        (!html.classList.contains("light") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      setTheme(isDark ? "dark" : "light");
    };

    // Initial detection
    detectTheme();

    // Watch for class changes on html element
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Also watch for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => detectTheme();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  // Initialize root on mount and render immediately
  // Combined with theme dependency so it re-renders when theme changes
  React.useEffect(() => {
    if (!mountRef.current) return;

    // Clear any pending unmount before creating/updating root
    if (unmountTimeoutRef.current) {
      clearTimeout(unmountTimeoutRef.current);
      unmountTimeoutRef.current = null;
    }

    // Create root if it doesn't exist
    if (!rootRef.current) {
      rootRef.current = createRoot(mountRef.current);
    }

    // Render immediately on mount/remount
    rootRef.current.render(<EchoEventStudioInner theme={theme} />);

    return () => {
      // Clear any pending unmount
      if (unmountTimeoutRef.current) {
        clearTimeout(unmountTimeoutRef.current);
      }

      // Schedule unmount for next event loop iteration to avoid race condition
      // This ensures React completes rendering before unmounting
      unmountTimeoutRef.current = setTimeout(() => {
        if (rootRef.current) {
          try {
            rootRef.current.unmount();
          } catch (err) {
            safeConsoleError("Failed to unmount root", err);
          }
          rootRef.current = null;
        }
        unmountTimeoutRef.current = null;
      }, 0);
    };
  }, [theme]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full min-h-[200px] overflow-hidden"
      style={{ minHeight: 200 }}
    />
  );
}
