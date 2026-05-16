import { ReactNode } from "react";
import { ChevronUp, X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
interface MiniPanelProps {
  id: string;
  title: string;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
  onExpand?: () => void;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  size?: "small" | "medium" | "large";
  onSizeChange?: (size: "small" | "medium" | "large") => void;
}
export function MiniPanel({
  id,
  title,
  isMinimized = false,
  onMinimize,
  onClose,
  onExpand,
  children,
  icon,
  className,
  headerClassName,
  contentClassName,
  size = "medium",
  onSizeChange,
}: MiniPanelProps) {
  const sizeClass = {
    small: "col-span-1",
    medium: "col-span-2",
    large: "col-span-3",
  }[size];
  return (
    <div
      id={id}
      className={cn(
        "rounded-xl backdrop-blur-md bg-background border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300",
        "overflow-hidden",
        sizeClass,
        className,
      )}
    >
      {" "}
      {/* Glass Panel Header */}{" "}
      <div
        className={cn(
          "px-4 py-3 bg-gradient-to-r from-white/5 to-white/10 border-b border-white/20",
          "flex items-center justify-between gap-2",
          "group cursor-pointer hover:bg-background transition-colors",
          headerClassName,
        )}
      >
        {" "}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {" "}
          {icon && (
            <div className="flex-shrink-0 text-white/80">{icon}</div>
          )}{" "}
          <h3 className="text-sm font-semibold text-white truncate">
            {title}
          </h3>{" "}
        </div>{" "}
        {/* Panel Controls */}{" "}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {" "}
          {/* Size Controls */}{" "}
          <div className="flex items-center gap-0.5 px-1">
            {" "}
            <button
              onClick={() => onSizeChange?.("small")}
              className={cn(
                "p-1 rounded text-xs transition-all",
                size === "small"
                  ? "bg-background text-white"
                  : "text-white/60 hover:text-white/80",
              )}
              title="Small size"
            >
              {" "}
              S{" "}
            </button>{" "}
            <button
              onClick={() => onSizeChange?.("medium")}
              className={cn(
                "p-1 rounded text-xs transition-all",
                size === "medium"
                  ? "bg-background text-white"
                  : "text-white/60 hover:text-white/80",
              )}
              title="Medium size"
            >
              {" "}
              M{" "}
            </button>{" "}
            <button
              onClick={() => onSizeChange?.("large")}
              className={cn(
                "p-1 rounded text-xs transition-all",
                size === "large"
                  ? "bg-background text-white"
                  : "text-white/60 hover:text-white/80",
              )}
              title="Large size"
            >
              {" "}
              L{" "}
            </button>{" "}
          </div>{" "}
          {/* Minimize/Maximize Button */}{" "}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-background"
            onClick={onMinimize}
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {" "}
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}{" "}
          </Button>{" "}
          {/* Close Button */}{" "}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-red-500/20"
            onClick={onClose}
            title="Close panel"
          >
            {" "}
            <X className="h-4 w-4" />{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
      {/* Glass Panel Content */}{" "}
      {!isMinimized && (
        <div
          className={cn(
            "px-4 py-3",
            "text-white/90 text-sm",
            "max-h-96 overflow-y-auto",
            contentClassName,
          )}
        >
          {" "}
          {children}{" "}
        </div>
      )}{" "}
    </div>
  );
}
