/**
 * Design Editor Module Wrapper
 * Standalone panel for professional image editing with AI tools
 * Can be loaded as a floating panel in Echo Recipe Pro or other instances
 * Features 50+ editing tools, layer management, AI generative tools, and collaboration
 */
import React, { Suspense, useState, useEffect } from "react";
import { Maximize2, Minimize2 } from "lucide-react"; // Lazy load the Editor component to reduce bundle size
const Editor = React.lazy(() =>
  import("@/modules/EchoCanvasStudio/client/pages/Editor")
    .then((mod) => ({ default: mod.default }))
    .catch((err) => {
      console.error("[DesignEditorModule] Failed to load Editor:", err);
      return {
        default: () => (
          <div className="p-6 text-center">
            {" "}
            <p className="text-red-500 font-semibold mb-2">
              Failed to load Design Editor
            </p>{" "}
            <p className="text-sm text-foreground/70">
              {err instanceof Error ? err.message : "Unknown error"}
            </p>{" "}
          </div>
        ),
      };
    }),
);
interface DesignEditorModuleProps {
  initialImage?: string;
  onExport?: (imageData: any) => void;
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
    console.error(
      "[DesignEditorModule] Error boundary caught:",
      error,
      errorInfo,
    );
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
function DesignEditorModuleContent({
  initialImage,
  onExport,
  isPopout = false,
  onPopout,
  theme = "dark",
}: DesignEditorModuleProps) {
  const { t } = useI18n();
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    console.log("[DesignEditorModule] Mounted with props:", {
      hasInitialImage: !!initialImage,
      hasExportCallback: !!onExport,
      isPopout,
      theme,
    });
  }, [initialImage, onExport, isPopout, theme]);
  return (
    <div
      className={`w-full h-full flex flex-col overflow-hidden bg-background text-foreground ${theme === "dark" ? "dark" : ""}`}
    >
      {" "}
      {/* Top Toolbar */}{" "}
      <div className="flex items-center justify-between p-2 border-b border-border/30 bg-background/50 flex-shrink-0 gap-2">
        {" "}
        <div className="flex items-center gap-2">
          {" "}
          <div className="text-sm font-medium text-foreground/80">
            {" "}
            {t("module.design-editor.title")}{" "}
          </div>{" "}
          <ModuleChatButton
            moduleId="design-editor"
            moduleName={t("module.design-editor.title")}
          />{" "}
        </div>{" "}
        <div className="flex items-center gap-1 ml-auto">
          {" "}
          {/* Pop-out Button */}{" "}
          {onPopout && !isPopout && (
            <button
              onClick={onPopout}
              title="Open as separate panel"
              className="p-2 rounded hover:bg-primary/20 transition-colors flex items-center justify-center h-8 w-8"
            >
              {" "}
              <Maximize2
                size={16}
                className="text-foreground/70 hover:text-primary"
              />{" "}
            </button>
          )}{" "}
          {/* Fullscreen Toggle */}{" "}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="p-2 rounded hover:bg-primary/20 transition-colors flex items-center justify-center h-8 w-8"
          >
            {" "}
            {isFullscreen ? (
              <Minimize2 size={16} className="text-foreground/70" />
            ) : (
              <Maximize2 size={16} className="text-foreground/70" />
            )}{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      {/* Editor Area */}{" "}
      <div className="flex-1 overflow-auto bg-background">
        {" "}
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              {" "}
              <div className="text-center">
                {" "}
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>{" "}
                <p className="text-sm text-foreground/60">
                  Loading Design Editor...
                </p>{" "}
              </div>{" "}
            </div>
          }
        >
          {" "}
          <Editor />{" "}
        </Suspense>{" "}
      </div>{" "}
      {/* Status Bar */}{" "}
      <div className="px-4 py-2 border-t border-border/30 bg-background/50 text-xs text-foreground/60 flex-shrink-0 flex items-center justify-between">
        {" "}
        <p>Professional image editing with AI tools</p>{" "}
        <div className="flex gap-4 text-foreground/50">
          {" "}
          <span>50+ Tools</span> <span>Real-time Collab</span>{" "}
          <span>Export Ready</span>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
} /** * Default export for panel loading * When imported as a module, this component will be rendered in a floating panel */
export default function DesignEditorModule(props: DesignEditorModuleProps) {
  return (
    <ErrorBoundary>
      {" "}
      <DesignEditorModuleContent {...props} />{" "}
    </ErrorBoundary>
  );
}
