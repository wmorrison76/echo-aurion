/**
 * MaestroBQT Module - Rebuilt Entry Point
 * Simplified loading sequence that avoids initialization errors
 */

import React from "react";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Calendar,
  ChefHat,
  Package,
  Users,
  Zap,
  DollarSign,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { osBus } from "@/lib/os-bus";

// Lazy load hooks and components to avoid initialization errors
const useMaestroData = React.lazy(() =>
  import("./hooks").then((m) => ({ default: () => m.useMaestroData })),
).then;

// For now, use a simple version that doesn't require hooks at module load time
// We'll load the full version after initial render
function MaestroBQTModule(props: any) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [ModuleComponent, setModuleComponent] =
    React.useState<React.ComponentType<any> | null>(null);

  React.useEffect(() => {
    // Load the full module after mount to avoid initialization errors
    import("./index-full")
      .then((module) => {
        const Component = module.default || (module as any).MaestroBQTModule;
        if (Component) {
          setModuleComponent(() => Component);
          setIsLoading(false);
        } else {
          throw new Error("Module does not have a default export");
        }
      })
      .catch((err) => {
        console.error("[MaestroBQT] Failed to load full module:", err);
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-foreground/60">Loading Maestro BQT...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-background">
        <div className="text-center space-y-4 p-6">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <h3 className="text-lg font-semibold text-destructive">
            Failed to Load
          </h3>
          <p className="text-sm text-foreground/70">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!ModuleComponent) {
    return (
      <div className="p-6 text-center">
        <p className="text-foreground/60">Module component not available</p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center w-full h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <ModuleComponent {...props} />
    </Suspense>
  );
}

export default MaestroBQTModule;
