import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/glass";
import {
  QuickSearch,
  Notifications,
  QuickMetrics,
  StaffStatus,
} from "@/components/toolbar";
import { DragHandle } from "./toolbar/DragHandle";
import { ToolbarButtons } from "./toolbar/ToolbarButtons";
import { MinimizedPanels } from "./toolbar/MinimizedPanels";
import { SettingsDropdown } from "./toolbar/SettingsDropdown";

interface MinimizedPanel {
  id: string;
  title: string;
  icon: string;
  isImageIcon?: boolean;
}

interface DockState {
  position: "top" | "bottom" | "left" | "right";
  x: number;
  y: number;
  collapsed: boolean;
}

interface ToolbarSettings {
  autohide: boolean;
  pinned: boolean;
  showQuickSearch: boolean;
  showNotifications: boolean;
  showQuickMetrics: boolean;
  showStaffStatus: boolean;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  ja: "🇯🇵",
  pt: "🇧🇷",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
  pt: "Português",
};

const TOOLBAR_DEFAULTS: ToolbarSettings = {
  autohide: false,
  pinned: false,
  showQuickSearch: true,
  showNotifications: true,
  showQuickMetrics: true,
  showStaffStatus: true,
};

export default function UnifiedToolbar() {
  const { lang, setLang } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [minimizedPanels, setMinimizedPanels] = useState<MinimizedPanel[]>([]);
  const [toolbarSettings, setToolbarSettings] = useState<ToolbarSettings>(
    () => {
      if (typeof window === "undefined") return { ...TOOLBAR_DEFAULTS };
      const saved = localStorage.getItem("toolbar-settings");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            autohide: parsed.autohide ?? false,
            pinned: parsed.pinned ?? false,
            showQuickSearch: parsed.showQuickSearch ?? true,
            showNotifications: parsed.showNotifications ?? true,
            showQuickMetrics: parsed.showQuickMetrics ?? true,
            showStaffStatus: parsed.showStaffStatus ?? true,
          };
        } catch {
          return { ...TOOLBAR_DEFAULTS };
        }
      }
      return { ...TOOLBAR_DEFAULTS };
    },
  );
  const [isVisible, setIsVisible] = useState(true);
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") return { x: 140, y: 50 };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    try {
      const saved = localStorage.getItem("toolbar-position");
      if (saved) {
        const parsed = JSON.parse(saved) as { x: number; y: number };
        // iter265 · Safety: reject saved positions that are offscreen or
        // negative. Previously bad coords could hide the toolbar entirely.
        if (
          typeof parsed?.x === "number" &&
          typeof parsed?.y === "number" &&
          parsed.x >= 0 &&
          parsed.x <= vw - 50 &&
          parsed.y >= 0 &&
          parsed.y <= vh - 50
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return { x: Math.max(140, vw / 2 - 100), y: 8 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">(
    "horizontal",
  );
  const [isDragOverWhiteboard, setIsDragOverWhiteboard] = useState(false);
  const [isDragOverChat, setIsDragOverChat] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const whiteboardBtnRef = useRef<HTMLButtonElement>(null);
  const chatBtnRef = useRef<HTMLButtonElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();
  const orientationTimeoutRef = useRef<NodeJS.Timeout>();
  const positionRef = useRef(position);

  // Sync position ref
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Detect toolbar position and set orientation with debouncing and hysteresis
  useEffect(() => {
    const updateOrientation = () => {
      if (!toolbarRef.current) return;

      const rect = toolbarRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;

      // If toolbar is closer to left or right edge, use vertical layout
      const distToLeft = centerX;
      const distToRight = window.innerWidth - centerX;
      const distToEdge = Math.min(distToLeft, distToRight);

      // Use hysteresis: 180px to enter vertical, 220px to exit vertical
      // This prevents rapid oscillation at the boundary
      setOrientation((prevOrientation) => {
        if (prevOrientation === "vertical" && distToEdge > 220) {
          return "horizontal";
        } else if (prevOrientation === "horizontal" && distToEdge < 180) {
          return "vertical";
        }
        return prevOrientation;
      });
    };

    // Clear any pending update
    if (orientationTimeoutRef.current) {
      clearTimeout(orientationTimeoutRef.current);
    }

    // Debounce: wait 300ms before updating to avoid rapid switches
    // This prevents DOM reconciliation issues from rapid orientation changes
    orientationTimeoutRef.current = setTimeout(updateOrientation, 300);

    const resizeListener = () => {
      if (orientationTimeoutRef.current) {
        clearTimeout(orientationTimeoutRef.current);
      }
      orientationTimeoutRef.current = setTimeout(updateOrientation, 300);
      // iter265 · Auto-rescue toolbar if it drifts offscreen on resize.
      setPosition((prev) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const clampedX = Math.max(0, Math.min(prev.x, vw - 50));
        const clampedY = Math.max(0, Math.min(prev.y, vh - 50));
        return clampedX !== prev.x || clampedY !== prev.y
          ? { x: clampedX, y: clampedY }
          : prev;
      });
    };

    window.addEventListener("resize", resizeListener);

    return () => {
      window.removeEventListener("resize", resizeListener);
      if (orientationTimeoutRef.current) {
        clearTimeout(orientationTimeoutRef.current);
      }
    };
  }, [position]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // iter265 · Hotkey (Cmd+Shift+T / Ctrl+Shift+T) resets the toolbar to a
  // safe default position. Recovery valve if it ever drifts offscreen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        const safe = { x: Math.max(140, window.innerWidth / 2 - 100), y: 8 };
        setPosition(safe);
        try {
          localStorage.setItem("toolbar-position", JSON.stringify(safe));
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const handleToolbarSettingsChanged = () => {
      try {
        const saved = localStorage.getItem("toolbar-settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          setToolbarSettings({
            autohide: parsed.autohide ?? false,
            pinned: parsed.pinned ?? false,
            showQuickSearch: parsed.showQuickSearch ?? true,
            showNotifications: parsed.showNotifications ?? true,
            showQuickMetrics: parsed.showQuickMetrics ?? true,
            showStaffStatus: parsed.showStaffStatus ?? true,
          });
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("toolbar-settings-changed", handleToolbarSettingsChanged);
    return () =>
      window.removeEventListener("toolbar-settings-changed", handleToolbarSettingsChanged);
  }, []);

  // Handle dragging
  const handleGripMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    });
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      const newX = Math.max(
        70,
        Math.min(positionRef.current.x + deltaX, window.innerWidth - 50),
      );
      const newY = Math.max(
        0,
        Math.min(positionRef.current.y + deltaY, window.innerHeight - 50),
      );

      setPosition({ x: newX, y: newY });
      try {
        localStorage.setItem(
          "toolbar-position",
          JSON.stringify({ x: newX, y: newY }),
        );
      } catch {
        /* ignore */
      }

      setDragStart({
        x: e.clientX,
        y: e.clientY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      try {
        localStorage.setItem(
          "toolbar-position",
          JSON.stringify(positionRef.current),
        );
      } catch {
        /* ignore */
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // Handle autohide
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!toolbarSettings.autohide || toolbarSettings.pinned) return;

      const toolbar = toolbarRef.current;
      if (!toolbar) return;

      const rect = toolbar.getBoundingClientRect();
      const isNearToolbar =
        e.clientY >= rect.top - 20 &&
        e.clientY <= rect.bottom + 20 &&
        e.clientX >= rect.left - 20 &&
        e.clientX <= rect.right + 20;

      if (isNearToolbar) {
        setIsVisible(true);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      } else {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 2000);
      }
    };

    if (toolbarSettings.autohide && !toolbarSettings.pinned) {
      document.addEventListener("mousemove", handleMouseMove);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      };
    }
  }, [toolbarSettings]);

  useEffect(() => {
    const handlePanelMinimized = (e: Event) => {
      const detail = (e as CustomEvent<MinimizedPanel>).detail;
      if (!detail) return;

      setMinimizedPanels((prev) => {
        const exists = prev.some((p) => p.id === detail.id);
        if (!exists) {
          return [...prev, detail];
        }
        return prev;
      });
    };

    const handlePanelRestored = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (!detail) return;

      setMinimizedPanels((prev) => prev.filter((p) => p.id !== detail.id));
    };

    window.addEventListener("panel-minimized", handlePanelMinimized as any);
    window.addEventListener("restore-panel", handlePanelRestored as any);

    return () => {
      window.removeEventListener(
        "panel-minimized",
        handlePanelMinimized as any,
      );
      window.removeEventListener("restore-panel", handlePanelRestored as any);
    };
  }, []);

  // Handle drag-over on whiteboard button to auto-open whiteboard
  useEffect(() => {
    const whiteboardBtn = whiteboardBtnRef.current;
    if (!whiteboardBtn) return;

    const handleDragOver = (e: DragEvent) => {
      const panelData = e.dataTransfer?.getData("application/json");
      if (panelData) {
        setIsDragOverWhiteboard(true);
        e.preventDefault();
        e.dataTransfer!.dropEffect = "copy";
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      // Only clear if actually leaving the button (not entering a child)
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!whiteboardBtn.contains(relatedTarget)) {
        setIsDragOverWhiteboard(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOverWhiteboard(false);

      const panelData = e.dataTransfer?.getData("application/json");
      if (panelData) {
        try {
          const data = JSON.parse(panelData);

          // First, dispatch the panel embed event to whiteboard (if it's already open, it will receive it)
          window.dispatchEvent(
            new CustomEvent("panel-embed-requested", {
              detail: {
                id: data.id || `panel-${Date.now()}`,
                panelId: data.panelId,
                title: data.title,
                type: data.type || "mini-panel",
                config: data.config || data,
                x: 100,
                y: 100,
                width: data.size?.width || data.config?.size?.width || 600,
                height: data.size?.height || data.config?.size?.height || 400,
                zoomLevel: 1,
                drillDownLevel: 1,
              },
            }),
          );

          // Then, open whiteboard
          window.dispatchEvent(
            new CustomEvent("open-panel", { detail: { id: "whiteboard" } }),
          );
        } catch (error) {
          console.error("Failed to parse panel data:", error);
        }
      }
    };

    whiteboardBtn.addEventListener("dragover", handleDragOver);
    whiteboardBtn.addEventListener("dragleave", handleDragLeave);
    whiteboardBtn.addEventListener("drop", handleDrop);

    return () => {
      whiteboardBtn.removeEventListener("dragover", handleDragOver);
      whiteboardBtn.removeEventListener("dragleave", handleDragLeave);
      whiteboardBtn.removeEventListener("drop", handleDrop);
    };
  }, []);

  // Handle drag-over on Network Chat button to auto-open chat
  useEffect(() => {
    const chatBtn = chatBtnRef.current;
    if (!chatBtn) return;

    const handleDragOver = (e: DragEvent) => {
      // Check if dragging a panel (from dataTransfer types or getData)
      const types = e.dataTransfer?.types || [];
      const hasPanelData = types.includes("application/json");
      
      if (hasPanelData) {
        setIsDragOverChat(true);
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer!.dropEffect = "copy";
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      // Only clear if actually leaving the button (not entering a child)
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!chatBtn.contains(relatedTarget)) {
        setIsDragOverChat(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOverChat(false);

      try {
        const panelData = e.dataTransfer?.getData("application/json");
        if (panelData) {
          const data = JSON.parse(panelData);

          // Dispatch panel embed event to chat (if it's already open, it will receive it)
          window.dispatchEvent(
            new CustomEvent("panel-embed-requested", {
              detail: {
                id: data.id || `panel-${Date.now()}`,
                panelId: data.panelId,
                title: data.title,
                type: data.type || "mini-panel",
                config: data.config || data,
                x: 50,
                y: 50,
                width: data.size?.width || 400,
                height: data.size?.height || 300,
                zoomLevel: 1,
                drillDownLevel: 1,
                target: "network-chat", // Specify target
              },
            }),
          );

          // Then, open network chat
          window.dispatchEvent(
            new CustomEvent("open-panel", { detail: { id: "network-chat" } }),
          );
        }
      } catch (error) {
        console.error("Failed to parse panel data for chat:", error);
      }
    };

    chatBtn.addEventListener("dragover", handleDragOver);
    chatBtn.addEventListener("dragleave", handleDragLeave);
    chatBtn.addEventListener("drop", handleDrop);

    return () => {
      chatBtn.removeEventListener("dragover", handleDragOver);
      chatBtn.removeEventListener("dragleave", handleDragLeave);
      chatBtn.removeEventListener("drop", handleDrop);
    };
  }, []);

  const handlePanelAction = (action: string) => {
    window.dispatchEvent(
      new CustomEvent("dock-action", { detail: { action } }),
    );
  };

  const handleOpenPanel = (panelId: string) => {
    window.dispatchEvent(
      new CustomEvent("open-panel", { detail: { id: panelId } }),
    );
  };

  const handleOpenEchoCanvas = () => {
    window.dispatchEvent(new CustomEvent("echo-ai-toggle"));
  };

  const handleCreateStickyNote = () => {
    const panelId = `sticky-note-${Date.now()}`;
    window.dispatchEvent(
      new CustomEvent("create-sticky-note", { detail: { panelId } }),
    );
  };

  const isVertical = orientation === "vertical";
  const buttonsRef = useRef<{ whiteboardBtn: HTMLButtonElement | null; chatBtn: HTMLButtonElement | null }>(null);

  // Sync refs for event listeners
  useEffect(() => {
    if (buttonsRef.current) {
      whiteboardBtnRef.current = buttonsRef.current.whiteboardBtn;
      chatBtnRef.current = buttonsRef.current.chatBtn;
    }
  }, [mounted]);

  return (
    <header
      key="unified-toolbar"
      ref={toolbarRef}
      className={cn(
        "fixed z-[2147483645]",
        isVertical ? "w-12" : "h-10",
        // iter 5.6 · brand gold-on-black to match DesktopTaskbar / UserAvatarMenu cluster.
        // Previously this used the page bg gradient which made the dock pale on light theme.
        "bg-[rgba(0,0,0,0.78)] backdrop-blur-lg",
        "border border-[rgba(200,169,126,0.35)] rounded-full text-[#f5efe4]",
        "shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
        isVertical ? "flex-col" : "flex-row",
        "flex items-center justify-start px-1.5 gap-1 ",
        "transition-all duration-200 ease-in-out",
        isVertical ? "h-max" : "w-max",
        isDragging && "cursor-grabbing",
        toolbarSettings.autohide &&
          !isVisible &&
          "opacity-10 hover:opacity-100 pointer-events-none hover:pointer-events-auto",
        !mounted && "opacity-0 pointer-events-none",
      )}
      style={
        {
          left: `${position.x}px`,
          top: `${position.y}px`,
        } as React.CSSProperties
      }
      onMouseEnter={() =>
        toolbarSettings.autohide &&
        !toolbarSettings.pinned &&
        setIsVisible(true)
      }
    >
      <DragHandle onMouseDown={handleGripMouseDown} />

      <ToolbarButtons
        ref={buttonsRef}
        isVertical={isVertical}
        isDragOverWhiteboard={isDragOverWhiteboard}
        isDragOverChat={isDragOverChat}
        onPanelAction={handlePanelAction}
        onOpenPanel={handleOpenPanel}
        onOpenEchoCanvas={handleOpenEchoCanvas}
        onCreateStickyNote={handleCreateStickyNote}
      />

      {/* Toolbar Features: Quick Search, Notifications, Metrics, Staff */}
      {toolbarSettings.showQuickSearch && <QuickSearch />}
      {toolbarSettings.showNotifications && <Notifications />}
      {toolbarSettings.showQuickMetrics && <QuickMetrics />}
      {toolbarSettings.showStaffStatus && <StaffStatus />}
      {(toolbarSettings.showQuickSearch ||
        toolbarSettings.showNotifications ||
        toolbarSettings.showQuickMetrics ||
        toolbarSettings.showStaffStatus) && (
        <div
          className={
            isVertical
              ? "w-4 h-px bg-border/40 my-0.5"
              : "w-px h-4 bg-border/40 mx-0.5"
          }
        />
      )}

      <MinimizedPanels
        minimizedPanels={minimizedPanels}
        isVertical={isVertical}
        onRestore={(id) => {
          window.dispatchEvent(
            new CustomEvent("restore-panel", {
              detail: { id },
            }),
          );
        }}
      />

      <SettingsDropdown lang={lang} setLang={setLang} isVertical={isVertical} />
    </header>
  );
}
