import React, { useState, useRef, ReactNode } from "react";
import { ChevronDown, X, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export interface DraggablePanelProps {
  id: string;
  title: string;
  children: ReactNode;
  defaultPosition?: { x: number; y: number };
  defaultCollapsed?: boolean;
  onClose?: () => void;
  className?: string;
  isDraggable?: boolean;
  isCollapsible?: boolean;
  width?: number;
  minWidth?: number;
  variant?: "light" | "dark";
}
export const DraggablePanel = React.forwardRef<
  HTMLDivElement,
  DraggablePanelProps
>(
  (
    {
      id,
      title,
      children,
      defaultPosition = { x: 20, y: 80 },
      defaultCollapsed = false,
      onClose,
      className,
      isDraggable = true,
      isCollapsible = true,
      width = 380,
      minWidth = 300,
      variant = "dark",
    },
    ref,
  ) => {
    const [position, setPosition] = useState(defaultPosition);
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [zIndex, setZIndex] = useState(40);
    const panelRef = useRef<HTMLDivElement>(null);
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDraggable) return;
      const headerElement = (e.target as HTMLElement).closest(
        "[data-panel-header]",
      );
      if (!headerElement) return;
      setIsDragging(true);
      setZIndex(1000);
      setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    };
    React.useEffect(() => {
      if (!isDragging) {
        setZIndex(40);
        return;
      }
      const handleMouseMove = (e: MouseEvent) => {
        setPosition({
          x: Math.max(0, e.clientX - dragOffset.x),
          y: Math.max(0, e.clientY - dragOffset.y),
        });
      };
      const handleMouseUp = () => {
        setIsDragging(false);
        setZIndex(40);
      };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }, [isDragging, dragOffset]);
    const glassClass = variant === "dark" ? "panel-dark" : "panel-light";
    return (
      <div
        ref={ref || panelRef}
        className={cn(
          glassClass,
          "fixed rounded-2xl shadow-2xl transition-all duration-200 flex flex-col overflow-hidden",
          isDragging && "opacity-95 shadow-xl",
          className,
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${width}px`,
          minWidth: `${minWidth}px`,
          zIndex: zIndex,
          maxHeight: "calc(100vh - 120px)",
        }}
      >
        {" "}
        {/* Header */}{" "}
        <div
          data-panel-header
          onMouseDown={handleMouseDown}
          className={cn(
            "flex items-center gap-2 px-4 py-3 border-b flex-shrink-0",
            isDraggable && "cursor-grab active:cursor-grabbing",
            variant === "dark"
              ? "border-cyan-400/20 bg-gradient-to-r from-gray-900/40 to-black/40"
              : "border-white/20 bg-gradient-to-r from-white/20 to-white/10",
          )}
        >
          {" "}
          {isDraggable && (
            <GripHorizontal className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}{" "}
          <span className="font-semibold text-sm flex-1 truncate">{title}</span>{" "}
          <div className="flex items-center gap-1 flex-shrink-0">
            {" "}
            {isCollapsible && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                {" "}
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform",
                    isCollapsed && "-rotate-90",
                  )}
                />{" "}
              </Button>
            )}{" "}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onClose}
                title="Close panel"
              >
                {" "}
                <X className="w-4 h-4" />{" "}
              </Button>
            )}{" "}
          </div>{" "}
        </div>{" "}
        {/* Content */}{" "}
        {!isCollapsed && (
          <div className="overflow-y-auto flex-1 p-4"> {children} </div>
        )}{" "}
      </div>
    );
  },
);
DraggablePanel.displayName = "DraggablePanel";
