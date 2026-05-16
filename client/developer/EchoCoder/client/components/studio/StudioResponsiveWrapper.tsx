import React from "react";
import { useBreakpoint } from "@/components/layout";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface StudioResponsiveWrapperProps {
  children: React.ReactNode;
  leftPanel?: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel?: React.ReactNode;
  onPanelToggle?: (panel: "left" | "right") => void;
}

/**
 * Responsive wrapper for Studio's multi-panel layout
 * 
 * Desktop (lg+): 3-panel layout (left | center | right)
 * Tablet (md): 2-panel collapsible (center + tools)
 * Mobile (xs-sm): 1-panel focused (swappable between editor/tools)
 */
export const StudioResponsiveWrapper: React.FC<StudioResponsiveWrapperProps> = ({
  leftPanel,
  centerPanel,
  rightPanel,
  onPanelToggle,
}) => {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";
  const isTablet = breakpoint === "md";
  const isDesktop = breakpoint === "lg" || breakpoint === "xl" || breakpoint === "2xl";
  
  const [mobileActivePanel, setMobileActivePanel] = useState<"editor" | "tools">("editor");
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Desktop Layout: 3-panel side-by-side
  if (isDesktop && leftPanel && rightPanel) {
    return (
      <div className="flex h-full w-full gap-0">
        {/* Left Panel - 18% */}
        <div className="w-[18%] border-r border-border overflow-hidden flex flex-col">
          {leftPanel}
        </div>

        {/* Center Panel - 54% */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {centerPanel}
        </div>

        {/* Right Panel - 28% */}
        <div className="w-[28%] border-l border-border overflow-hidden flex flex-col">
          {rightPanel}
        </div>
      </div>
    );
  }

  // Tablet Layout: Left collapsed, center + right stacked
  if (isTablet && leftPanel && rightPanel) {
    return (
      <div className="flex h-full w-full flex-col">
        {/* Toggle Button */}
        <div className="flex gap-1 p-2 border-b border-border bg-muted/30">
          <Button
            variant={showLeftPanel ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowLeftPanel(!showLeftPanel);
              onPanelToggle?.("left");
            }}
            className="h-8 text-xs"
          >
            Chat
          </Button>
          <Button
            variant={showRightPanel ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowRightPanel(!showRightPanel);
              onPanelToggle?.("right");
            }}
            className="h-8 text-xs"
          >
            Tools
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex gap-0">
          {showLeftPanel && leftPanel && (
            <div className="w-1/3 border-r border-border overflow-hidden">
              {leftPanel}
            </div>
          )}
          <div className={showLeftPanel || showRightPanel ? "flex-1" : "w-full"} className="overflow-hidden flex flex-col">
            {centerPanel}
          </div>
          {showRightPanel && rightPanel && (
            <div className="w-1/3 border-l border-border overflow-hidden">
              {rightPanel}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mobile Layout: Single-panel with tab switching
  if (isMobile && leftPanel && rightPanel) {
    return (
      <div className="flex h-full w-full flex-col">
        {/* Mobile Tabs */}
        <div className="flex gap-1 p-2 border-b border-border bg-muted/30">
          <Button
            variant={mobileActivePanel === "editor" ? "default" : "outline"}
            size="sm"
            onClick={() => setMobileActivePanel("editor")}
            className="flex-1 h-8 text-xs"
          >
            Editor
          </Button>
          <Button
            variant={mobileActivePanel === "tools" ? "default" : "outline"}
            size="sm"
            onClick={() => setMobileActivePanel("tools")}
            className="flex-1 h-8 text-xs"
          >
            Tools
          </Button>
        </div>

        {/* Content Switcher */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {mobileActivePanel === "editor" ? (
            <>
              {leftPanel && (
                <div className="max-h-20 overflow-y-auto border-b border-border py-2 px-3">
                  <div className="text-xs font-medium mb-2">Chat</div>
                  {leftPanel}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                {centerPanel}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-hidden">
              {rightPanel}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback: Simple flex layout
  return (
    <div className="flex h-full w-full gap-0">
      {leftPanel && <div className="flex-shrink-0 overflow-hidden">{leftPanel}</div>}
      <div className="flex-1 overflow-hidden flex flex-col">{centerPanel}</div>
      {rightPanel && <div className="flex-shrink-0 overflow-hidden">{rightPanel}</div>}
    </div>
  );
};

export default StudioResponsiveWrapper;
