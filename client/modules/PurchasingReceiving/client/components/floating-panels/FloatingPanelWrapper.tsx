/** * Generic Floating Panel Wrapper * * Wraps module panels to provide standard floating panel behavior: * - Header with title and controls (minimize, close) * - Event handling and callbacks * - Error states * - Loading indicators * - Responsive sizing */ import React, {
  ReactNode,
  useCallback,
  useState,
} from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type {
  PanelConfig,
  PanelCallbacks,
  ModuleType,
} from "@shared/types/panel";
interface FloatingPanelWrapperProps {
  /** Panel configuration */ config: PanelConfig;
  /** Module type identifier */ module: ModuleType;
  /** Panel children/content */ children: ReactNode;
  /** Event callbacks */ callbacks?: PanelCallbacks;
  /** Whether panel is currently minimized */ isMinimized?: boolean;
  /** Custom header actions */ headerActions?: ReactNode;
  /** Error message to display */ error?: string | null;
  /** Loading state */ isLoading?: boolean;
  /** Custom CSS class names */ wrapperClassName?: string;
  /** Custom height for non-minimized state */ contentHeight?: string;
}
export const FloatingPanelWrapper: React.FC<FloatingPanelWrapperProps> = ({
  config,
  module,
  children,
  callbacks,
  isMinimized = false,
  headerActions,
  error,
  isLoading,
  wrapperClassName,
  contentHeight = "h-[500px]",
}) => {
  const [minimized, setMinimized] = useState(isMinimized);
  const handleMinimize = useCallback(() => {
    setMinimized(!minimized);
    if (!minimized) {
      callbacks?.onMinimize?.(config.panelId);
    }
  }, [minimized, config.panelId, callbacks]);
  const handleClose = useCallback(() => {
    callbacks?.onClose?.(config.panelId);
  }, [config.panelId, callbacks]);
  const title =
    config.title ||
    `${module.charAt(0).toUpperCase() + module.slice(1)} Module`;
  return (
    <Card
      className={` relative border border-border bg-card backdrop-blur-sm rounded-lg overflow-hidden flex flex-col ${wrapperClassName || ""} `}
    >
      {" "}
      {/* Header */}{" "}
      <CardHeader className="pb-3 border-b border-border bg-surface">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div className="flex-1">
            {" "}
            <div className="flex items-center gap-2">
              {" "}
              <CardTitle className="text-base font-semibold text-slate-100">
                {" "}
                {title}{" "}
              </CardTitle>{" "}
              {isLoading && (
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              )}{" "}
              <span className="text-xs text-muted-foreground">
                {config.panelId}
              </span>{" "}
            </div>{" "}
          </div>{" "}
          {/* Header Actions */}{" "}
          <div className="flex items-center gap-1">
            {" "}
            {headerActions} {/* Minimize/Maximize Button */}{" "}
            {config.canMinimize !== false && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMinimize}
                aria-label={minimized ? "Expand panel" : "Minimize panel"}
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-100"
                title={minimized ? "Expand" : "Minimize"}
              >
                {" "}
                {minimized ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}{" "}
              </Button>
            )}{" "}
            {/* Close Button */}{" "}
            {config.canClose !== false && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                aria-label="Close panel"
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                title="Close panel"
              >
                {" "}
                <X className="h-4 w-4" />{" "}
              </Button>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </CardHeader>{" "}
      {/* Error Alert */}{" "}
      {error && (
        <div className="px-4 pt-3">
          {" "}
          <Alert
            variant="destructive"
            className="bg-red-950/50 border-red-700/50"
          >
            {" "}
            <AlertCircle className="h-4 w-4" />{" "}
            <AlertDescription className="text-red-200">
              {" "}
              {error}{" "}
            </AlertDescription>{" "}
          </Alert>{" "}
        </div>
      )}{" "}
      {/* Content */}{" "}
      {!minimized && (
        <CardContent
          className={` flex-1 overflow-auto p-4 ${contentHeight} ${isLoading ? "flex items-center justify-center" : ""} `}
        >
          {" "}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2">
              {" "}
              <div className="h-8 w-8 border-4 border-border border-t-blue-500 rounded-full animate-spin" />{" "}
              <p className="text-sm text-slate-400">
                {" "}
                Loading {module} module...{" "}
              </p>{" "}
            </div>
          ) : (
            children
          )}{" "}
        </CardContent>
      )}{" "}
      {/* Minimized State */}{" "}
      {minimized && (
        <div className="h-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20" />
      )}{" "}
    </Card>
  );
};
export default FloatingPanelWrapper;
