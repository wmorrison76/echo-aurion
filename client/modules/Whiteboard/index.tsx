import React from "react";
import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { YieldProvider } from "./context/YieldContext";
import { AppDataProvider } from "./context/AppDataContext";
import { PageToolbarProvider } from "./context/PageToolbarContext";
import { CollaborationProvider } from "./context/CollaborationContext";
import WhiteboardSession from "./WhiteboardSession";

const queryClient = new QueryClient();

class WhiteboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; eventId: string | null }
> {
  state = { error: null as Error | null, eventId: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Whiteboard] Render error:", error, info.componentStack);
    const eventId = Sentry.captureException(error, {
      contexts: {
        react_error_boundary: {
          module: "Whiteboard",
          componentStack: info.componentStack || "N/A",
        },
      },
      tags: {
        error_boundary: "WhiteboardErrorBoundary",
        module: "Whiteboard",
        error_type: "render_error",
      },
      fingerprint: ["whiteboard-render-error", error.message],
    });
    this.setState({ eventId });
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] p-6 rounded border border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
          <p className="font-semibold mb-2">Whiteboard error</p>
          <p className="text-sm mb-1 max-w-md break-words">
            {this.state.error.message}
          </p>
          {this.state.eventId && (
            <p className="text-xs opacity-40 font-mono mb-4">
              Error ID: {this.state.eventId}
            </p>
          )}
          <button
            type="button"
            className="px-3 py-1.5 rounded text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600"
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

export interface WhiteboardModuleProps {
  panelId?: string;
  onClose?: () => void;
  isEmbedded?: boolean;
  sessionId?: string;
  boardId?: string;
}

export default function WhiteboardModule({
  panelId,
  onClose,
  isEmbedded,
  sessionId: propsSessionId,
  boardId,
}: WhiteboardModuleProps = {}) {
  return (
    <div
      className="w-full h-full flex flex-col min-h-0 min-h-[400px] overflow-auto"
      style={{ flex: "1 1 auto" }}
    >
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
                      <WhiteboardErrorBoundary>
                        <WhiteboardSession
                          sessionId={propsSessionId ?? boardId ?? undefined}
                        />
                      </WhiteboardErrorBoundary>
                    </CollaborationProvider>
                  </PageToolbarProvider>
                </AppDataProvider>
              </YieldProvider>
            </AuthProvider>
          </LanguageProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  );
}
