import React, { ReactNode, useCallback, useEffect } from "react";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Breadcrumb navigation for page hierarchy
 */
interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-2", className)}
    >
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index === 0 && (
              <>
                <a
                  href="/"
                  aria-label="Home"
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <Home className="h-4 w-4" />
                </a>
                {items.length > 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </>
            )}

            {item.current ? (
              <span aria-current="page" className="font-medium text-foreground">
                {item.label}
              </span>
            ) : item.href ? (
              <>
                <a
                  href={item.href}
                  className="text-primary hover:underline transition-colors"
                >
                  {item.label}
                </a>
                {index < items.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </>
            ) : (
              <>
                <span className="text-muted-foreground">{item.label}</span>
                {index < items.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Skip to main content link for accessibility
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className={cn(
        "absolute left-0 top-0 z-50 inline-block px-4 py-2 text-sm font-semibold",
        "bg-primary text-primary-foreground rounded-b-md",
        "transform -translate-y-full focus:translate-y-0",
        "transition-transform duration-200"
      )}
    >
      Skip to main content
    </a>
  );
}

/**
 * Hook for keyboard shortcuts
 */
interface KeyboardShortcutConfig {
  [key: string]: {
    handler: () => void;
    description: string;
    metaKey?: boolean;
    shiftKey?: boolean;
    ctrlKey?: boolean;
  };
}

export function useKeyboardShortcuts(config: KeyboardShortcutConfig) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcut = config[e.key.toLowerCase()];
      if (!shortcut) return;

      const matches =
        (!shortcut.metaKey || e.metaKey || e.ctrlKey) &&
        (!shortcut.shiftKey || e.shiftKey) &&
        (!shortcut.ctrlKey || e.ctrlKey);

      if (matches) {
        e.preventDefault();
        shortcut.handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [config]);
}

/**
 * Keyboard shortcuts help dialog
 */
interface KeyboardShortcutItem {
  keys: string[];
  description: string;
  category?: string;
}

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcutItem[];
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({
  shortcuts,
  isOpen,
  onClose,
}: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null;

  const grouped = shortcuts.reduce(
    (acc, shortcut) => {
      const category = shortcut.category || "General";
      if (!acc[category]) acc[category] = [];
      acc[category].push(shortcut);
      return acc;
    },
    {} as Record<string, KeyboardShortcutItem[]>
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        className="bg-card rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border/20 p-4">
          <h2 id="shortcuts-title" className="text-lg font-semibold">
            Keyboard Shortcuts
          </h2>
        </div>

        <div className="p-4 space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={`${category}-${idx}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground">{item.description}</span>
                    <div className="flex gap-1">
                      {item.keys.map((key, i) => (
                        <React.Fragment key={`${key}-${i}`}>
                          {i > 0 && <span className="text-muted-foreground mx-1">+</span>}
                          <kbd className="px-2 py-1 bg-muted rounded border border-border/50 text-xs font-mono">
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border/20 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Accessible tab list with keyboard navigation
 */
interface AccessibleTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface AccessibleTabsProps {
  tabs: AccessibleTab[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
}

export function AccessibleTabs({
  tabs,
  defaultTab = tabs[0]?.id,
  onTabChange,
}: AccessibleTabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTab);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      onTabChange?.(tabId);
    },
    [onTabChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      let newIndex = currentIndex;

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          newIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
          break;
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          newIndex = currentIndex === tabs.length - 1 ? 0 : currentIndex + 1;
          break;
        case "Home":
          e.preventDefault();
          newIndex = 0;
          break;
        case "End":
          e.preventDefault();
          newIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      handleTabChange(tabs[newIndex].id);
    },
    [activeTab, tabs, handleTabChange]
  );

  return (
    <div>
      <div
        role="tablist"
        className="flex border-b border-border/30 gap-1"
        aria-label="Content tabs"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => handleTabChange(tab.id)}
            onKeyDown={handleKeyDown}
            className={cn(
              "px-4 py-3 text-sm font-medium transition-colors relative",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
              activeTab === tab.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          className={cn(activeTab !== tab.id && "hidden")}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

/**
 * Focus management utilities
 */
export function useFocusManagement(elementId: string) {
  const elementRef = React.useRef<HTMLElement | null>(null);

  const focus = useCallback(() => {
    const element =
      elementRef.current || document.getElementById(elementId);
    if (element) {
      element.focus();
    }
  }, [elementId]);

  const blur = useCallback(() => {
    if (elementRef.current) {
      elementRef.current.blur();
    }
  }, []);

  return { focus, blur, elementRef };
}
