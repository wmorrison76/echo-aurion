import { useState, useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X, Minus, Maximize2, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingPanelProps {
  id: string;
  title: string;
  children: ReactNode;
  onClose?: () => void;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultX?: number;
  defaultY?: number;
  minWidth?: number;
  minHeight?: number;
}

export default function FloatingPanel({
  id,
  title,
  children,
  onClose,
  defaultWidth = 400,
  defaultHeight = 500,
  defaultX = 50,
  defaultY = 50,
  minWidth = 300,
  minHeight = 200,
}: FloatingPanelProps) {
  const [position, setPosition] = useState({ x: defaultX, y: defaultY });
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [zIndex, setZIndex] = useState(100);

  const panelRef = useRef<HTMLDivElement>(null);

  // Handle dragging
  const handleMouseDownTitle = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    setZIndex(1000 + Math.random());
  };

  // Handle resizing
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    });
    setZIndex(1000 + Math.random());
  };

  // Mouse move for dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && !isPinned) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }

    if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      setSize({
        width: Math.max(minWidth, resizeStart.width + deltaX),
        height: Math.max(minHeight, resizeStart.height + deltaY),
      });
    }
  };

  // Mouse up
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // Add event listeners
  if (typeof window !== "undefined") {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isMinimized ? "auto" : `${size.height}px`,
        zIndex,
      }}
      className={cn(
        "glass-panel rounded-lg shadow-lg border border-primary/30",
        "flex flex-col overflow-hidden",
        "bg-card/50 backdrop-blur",
        isDragging && "opacity-90",
      )}
    >
      {/* Title Bar */}
      <div
        onMouseDown={handleMouseDownTitle}
        className={cn(
          "flex items-center justify-between p-3 bg-primary/10 border-b border-primary/20 cursor-move",
          "select-none hover:bg-primary/15 transition-colors",
        )}
      >
        <div className="flex items-center gap-2 flex-1">
          <h3 className="font-semibold text-sm text-foreground truncate">{title}</h3>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Restore" : "Minimize"}
          >
            <Minus className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsPinned(!isPinned)}
            title={isPinned ? "Unpin" : "Pin"}
          >
            <Pin className={cn("h-3 w-3", isPinned && "fill-current")} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
            title="Close"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>
      )}

      {/* Resize Handle */}
      {!isMinimized && (
        <div
          onMouseDown={handleMouseDownResize}
          className={cn(
            "absolute bottom-0 right-0 w-5 h-5",
            "cursor-se-resize opacity-0 hover:opacity-100",
            "bg-primary/20 hover:bg-primary/40 transition-colors",
          )}
          title="Drag to resize"
        />
      )}
    </div>
  );
}
