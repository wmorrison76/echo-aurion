/** * SAMPLE PANEL WRAPPER COMPONENT * * Copy this file to your new Builder.io app at: * src/components/EchoRecipeProPanel.tsx * * Then use it in your sidebar navigation: * * const navigationItems = [ * { * id:"echo-menu-studio", * label:"Echo Menu Studio", * icon:"ChefHat", * component: EchoRecipeProPanel, * } * ] */ import React from "react";
const { Suspense, lazy, useState } = React;
import { useAuth } from "@/context/AuthContext"; // Adjust path as needed
import { AlertCircle, Loader2 } from "lucide-react"; // Lazy load the main Echo Recipe Pro panel
const EchoRecipeIndex = lazy(() =>
  import("./pages/Index").catch((err) => {
    console.error("Failed to load Echo Recipe Pro:", err);
    return { default: () => <FailedLoadComponent error={err} /> };
  }),
); /** * Loading Fallback Component * Shows while the panel is being loaded */
const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-96 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg">
    {" "}
    <div className="text-center space-y-4">
      {" "}
      <div className="flex justify-center">
        {" "}
        <Loader2 className="h-12 w-12 text-cyan-500 animate-spin" />{" "}
      </div>{" "}
      <div>
        {" "}
        <p className="text-sm font-semibold text-foreground">
          {" "}
          Loading Echo Recipe Pro{" "}
        </p>{" "}
        <p className="text-xs text-muted-foreground dark:text-cyan-300/60 mt-1">
          {" "}
          This may take a few seconds...{" "}
        </p>{" "}
      </div>{" "}
    </div>{" "}
  </div>
); /** * Error Fallback Component * Shows if panel fails to load */
const ErrorFallback = ({ error }: { error: any }) => (
  <div className="flex items-center justify-center min-h-96 bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
    {" "}
    <div className="text-center space-y-3">
      {" "}
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />{" "}
      <div>
        {" "}
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">
          {" "}
          Failed to Load Echo Recipe Pro{" "}
        </p>{" "}
        <p className="text-xs text-red-600 dark:text-red-300 mt-2">
          {" "}
          {error?.message || "An unknown error occurred"}{" "}
        </p>{" "}
      </div>{" "}
      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        {" "}
        Try Again{" "}
      </button>{" "}
    </div>{" "}
  </div>
); /** * Failed Load Component * Fallback when dynamic import fails */
const FailedLoadComponent = ({ error }: { error: any }) => (
  <ErrorFallback error={error} />
); /** * Auth Guard Component * Ensures user has required permissions */
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <LoadingFallback />;
  }
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-96 bg-slate-50 dark:bg-surface rounded-lg">
        {" "}
        <div className="text-center space-y-3">
          {" "}
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />{" "}
          <div>
            {" "}
            <p className="text-sm font-semibold text-foreground">
              {" "}
              Authentication Required{" "}
            </p>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              Please log in to access Echo Recipe Pro{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </div>
    );
  }
  return <>{children}</>;
}; /** * Main Panel Component * * Props: * - isActive?: boolean - Whether the panel is currently visible * - onClose?: () => void - Callback when panel is closed */
interface EchoRecipeProPanelProps {
  isActive?: boolean;
  onClose?: () => void;
}
export const EchoRecipeProPanel: React.FC<EchoRecipeProPanelProps> = ({
  isActive = true,
  onClose,
}) => {
  const [isLoaded, setIsLoaded] = useState(false); // Don't render if panel isn't active (performance optimization) if (!isActive) { return null; } return ( <div className="w-full h-full overflow-hidden"> <AuthGuard> <ErrorBoundary onError={() => setIsLoaded(false)}> <Suspense fallback={<LoadingFallback />}> <div onLoad={() => setIsLoaded(true)}> <EchoRecipeIndex /> </div> </Suspense> </ErrorBoundary> </AuthGuard> </div> );
}; /** * Error Boundary Component * Catches errors in the panel and displays fallback UI */
interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}
class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("EchoRecipeProPanel Error:", error, errorInfo);
    this.props.onError?.(error);
  }
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
export default EchoRecipeProPanel;
