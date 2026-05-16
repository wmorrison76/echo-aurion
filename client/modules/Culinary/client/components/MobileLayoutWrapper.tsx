import React, { useState } from "react";
import { Menu, X, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileLayoutWrapperProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  title?: string;
  onBack?: () => void;
}

/**
 * Mobile-optimized layout wrapper
 * Provides responsive sidebar, header with touch-friendly controls
 * Designed for kitchen staff workflows on small screens
 */
export const MobileLayoutWrapper: React.FC<MobileLayoutWrapperProps> = ({
  children,
  header,
  sidebar,
  title,
  onBack,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on escape or outside click
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden md:flex-row">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      {sidebar && (
        <aside
          className={cn(
            "fixed left-0 top-0 bottom-0 w-64 bg-background border-r z-50 transform transition-transform duration-300 md:relative md:w-auto md:transform-none overflow-y-auto",
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          )}
        >
          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden absolute right-2 top-2 p-2 hover:bg-muted rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="pt-12 md:pt-0">{sidebar}</div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-30 md:py-4">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1 hover:bg-muted rounded-lg flex-shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {title && (
              <h1 className="text-lg font-semibold truncate md:text-xl">{title}</h1>
            )}
          </div>

          <div className="flex items-center gap-2">
            {header}
            {sidebar && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 hover:bg-muted rounded-lg"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-3 py-4 md:px-6 md:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default MobileLayoutWrapper;
