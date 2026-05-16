import React, { Suspense, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import {
  BrowserRouter,
  useInRouterContext,
  MemoryRouter,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { MultiOutletProvider } from "@/modules/PurchasingReceiving/client/context/MultiOutletContext";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { YieldProvider } from "./context/YieldContext";
import { AppDataProvider } from "./context/AppDataContext";
import { PageToolbarProvider } from "./context/PageToolbarContext";
import { CollaborationProvider } from "./context/CollaborationContext";
import Index from "./pages/Index";

class OrderingInventoryErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; eventId: string | null }
> {
  state = { error: null as Error | null, eventId: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      "[OrderingInventory] Render error:",
      error,
      info.componentStack,
    );
    const eventId = Sentry.captureException(error, {
      contexts: {
        react_error_boundary: {
          module: "OrderingInventory",
          componentStack: info.componentStack || "N/A",
        },
      },
      tags: {
        error_boundary: "OrderingInventoryErrorBoundary",
        module: "OrderingInventory",
        error_type: "render_error",
      },
      fingerprint: ["ordering-inventory-render-error", error.message],
    });
    this.setState({ eventId });
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] p-6 bg-amber-500/20 border border-amber-500/50 rounded-lg text-amber-950 dark:text-amber-100">
          <p className="font-semibold mb-2">
            Ordering & Inventory couldn’t load
          </p>
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

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

const LoadingFallback = () => (
  <div className="flex items-center justify-center w-full h-full">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
      <p className="text-sm text-muted-foreground">
        Loading Ordering & Inventory...
      </p>
    </div>
  </div>
);

function RouterWrapper({ children }: { children: ReactNode }) {
  const inRouter = useInRouterContext();
  if (inRouter) return <>{children}</>;
  return (
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      {children}
    </MemoryRouter>
  );
}

export default function App() {
  return (
    <OrderingInventoryErrorBoundary>
      <RouterWrapper>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <LanguageProvider>
              <AuthProvider>
                <YieldProvider>
                  <AppDataProvider>
                    <PageToolbarProvider>
                      <CollaborationProvider>
                        <MultiOutletProvider>
                          <Suspense fallback={<LoadingFallback />}>
                            <Index />
                          </Suspense>
                        </MultiOutletProvider>
                      </CollaborationProvider>
                    </PageToolbarProvider>
                  </AppDataProvider>
                </YieldProvider>
              </AuthProvider>
            </LanguageProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </RouterWrapper>
    </OrderingInventoryErrorBoundary>
  );
}
