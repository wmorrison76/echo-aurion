/**
 * Mobile-Responsive Panel Layout
 * Provides a bottom tab navigation for mobile devices
 * Switches to floating panels on desktop screens
 */

import React, { ReactNode, useState } from "react";
import { cn } from "@/lib/glass";

interface MobilePanelTab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

interface MobileResponsivePanelsProps {
  tabs: MobilePanelTab[];
  defaultTab?: string;
  mobileBreakpoint?: number; // Pixel width at which to switch layouts (default: 768)
}

/**
 * Hook to detect mobile screen size
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = React.useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
}

/**
 * Mobile-responsive panel layout component
 * On mobile: displays tabs at bottom with content area above
 * On desktop: allows floating panels (can be extended to use PanelHost)
 */
export function MobileResponsivePanels({
  tabs,
  defaultTab,
  mobileBreakpoint = 768,
}: MobileResponsivePanelsProps) {
  const isMobile = useIsMobile(mobileBreakpoint);
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.key || "");

  const activeTabContent = tabs.find((t) => t.key === activeTab);

  if (!isMobile) {
    // On desktop, just render the active tab content
    // (This could be extended to render floating panels via PanelHost)
    return (
      <div className="w-full h-full overflow-auto bg-background text-foreground">
        {activeTabContent && activeTabContent.content}
      </div>
    );
  }

  // Mobile layout: content + bottom tabs
  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground">
      {/* Content area */}
      <div className="flex-1 overflow-auto pb-16">
        {activeTabContent && activeTabContent.content}
      </div>

      {/* Bottom tab navigation */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t border-border bg-background shadow-lg"
        style={{ zIndex: 100 }}
      >
        <div className="flex gap-0 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              disabled={tab.disabled}
              className={cn(
                "flex-1 min-w-[60px] px-3 py-3 text-xs font-medium transition-all whitespace-nowrap",
                "border-b-2 flex flex-col items-center gap-1",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
                tab.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {tab.icon && <div className="text-base">{tab.icon}</div>}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MobileResponsivePanels;
