/**
 * Global Keyboard Shortcuts Manager
 * Enterprise-ready keyboard shortcut system for LUCCCA
 */

import { openPanel } from "@/lib/open-panel";

export interface KeyboardShortcut {
  id: string;
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  handler: () => void;
  enabled?: boolean;
}

class GlobalKeyboardShortcutsManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled: boolean = true;
  private listener: ((e: KeyboardEvent) => void) | null = null;

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: KeyboardShortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);
    this.updateListener();
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(id: string): void {
    this.shortcuts.delete(id);
    this.updateListener();
  }

  /**
   * Enable or disable all shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.updateListener();
  }

  /**
   * Check if shortcuts are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get all registered shortcuts
   */
  getAll(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Update the event listener based on enabled state
   */
  private updateListener(): void {
    // Remove existing listener
    if (this.listener) {
      window.removeEventListener("keydown", this.listener);
      this.listener = null;
    }

    // Add new listener if enabled
    if (this.enabled && this.shortcuts.size > 0) {
      this.listener = (e: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in input fields
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        // Check each shortcut
        for (const shortcut of this.shortcuts.values()) {
          if (shortcut.enabled === false) continue;

          const keyMatch =
            e.key.toLowerCase() === shortcut.key.toLowerCase();
          const ctrlMatch = shortcut.ctrl
            ? e.ctrlKey || e.metaKey
            : !e.ctrlKey && !e.metaKey;
          const shiftMatch = shortcut.shift
            ? e.shiftKey
            : !e.shiftKey;
          const altMatch = shortcut.alt ? e.altKey : !e.altKey;
          const metaMatch = shortcut.meta ? e.metaKey : !e.metaKey;

          if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
            e.preventDefault();
            e.stopPropagation();
            shortcut.handler();
            break;
          }
        }
      };

      window.addEventListener("keydown", this.listener);
    }
  }

  /**
   * Format shortcut for display
   */
  formatShortcut(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    if (shortcut.meta || shortcut.ctrl) {
      parts.push(navigator.platform.includes("Mac") ? "Cmd" : "Ctrl");
    }
    if (shortcut.shift) parts.push("Shift");
    if (shortcut.alt) parts.push("Alt");
    parts.push(shortcut.key.toUpperCase());
    return parts.join(" + ");
  }
}

// Global instance
export const globalShortcuts = new GlobalKeyboardShortcutsManager();

// Initialize default shortcuts
export function initializeDefaultShortcuts(): void {
  // Quick Search (Cmd/Ctrl + K)
  globalShortcuts.register({
    id: "quick-search",
    key: "k",
    meta: true,
    ctrl: true,
    description: "Open quick search",
    handler: () => {
      window.dispatchEvent(
        new CustomEvent("open-quick-search", { bubbles: true }),
      );
    },
  });

  // Open Settings (Cmd/Ctrl + ,)
  globalShortcuts.register({
    id: "open-settings",
    key: ",",
    meta: true,
    ctrl: true,
    description: "Open settings",
    handler: () => {
      window.dispatchEvent(
        new CustomEvent("open-settings", {
          detail: { tab: "general" },
          bubbles: true,
        }),
      );
    },
  });

  // Save (Cmd/Ctrl + S) - only if not in input
  globalShortcuts.register({
    id: "save",
    key: "s",
    meta: true,
    ctrl: true,
    description: "Save current work",
    handler: () => {
      window.dispatchEvent(
        new CustomEvent("save-current", { bubbles: true }),
      );
    },
  });

  // Open EKG (Cmd/Ctrl + Shift + K)
  globalShortcuts.register({
    id: "open-ekg",
    key: "k",
    meta: true,
    ctrl: true,
    shift: true,
    description: "Open EKG telemetry panel",
    handler: () => openPanel("ekg"),
  });

  // Desktop Shortcuts — Quick access to operational panels
  globalShortcuts.register({
    id: "open-housekeeping",
    key: "h",
    alt: true,
    description: "Open Housekeeping",
    handler: () => openPanel("housekeeping"),
  });

  globalShortcuts.register({
    id: "open-ird",
    key: "i",
    alt: true,
    description: "Open IRD & Minibar",
    handler: () => openPanel("minibar-ird"),
  });

  globalShortcuts.register({
    id: "open-concierge",
    key: "c",
    alt: true,
    description: "Open Echo Concierge",
    handler: () => openPanel("echo-concierge"),
  });

  globalShortcuts.register({
    id: "open-engineering",
    key: "e",
    alt: true,
    description: "Open Engineering Tickets",
    handler: () => openPanel("eng-work-tickets"),
  });

  globalShortcuts.register({
    id: "open-foh",
    key: "f",
    alt: true,
    description: "Open FOH Operations",
    handler: () => openPanel("foh-operations"),
  });

  globalShortcuts.register({
    id: "open-dashboard",
    key: "d",
    alt: true,
    description: "Open Dashboard",
    handler: () => openPanel("dashboard"),
  });

  globalShortcuts.register({
    id: "open-guest360",
    key: "g",
    alt: true,
    description: "Open Guest 360",
    handler: () => openPanel("guest-360"),
  });

  globalShortcuts.register({
    id: "open-routing",
    key: "r",
    alt: true,
    description: "Open Kitchen Routing",
    handler: () => openPanel("kitchen-routing"),
  });
}

// Initialize on load
if (typeof window !== "undefined") {
  // Load enabled state from localStorage
  const savedEnabled = localStorage.getItem("keyboard-shortcuts-enabled");
  if (savedEnabled !== null) {
    globalShortcuts.setEnabled(savedEnabled === "true");
  }

  // Initialize defaults
  initializeDefaultShortcuts();
}
