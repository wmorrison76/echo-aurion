// Advanced keyboard shortcuts management

export type ShortcutModifiers = {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

export type KeyboardShortcut = {
  id: string;
  name: string;
  description?: string;
  key: string;
  modifiers: ShortcutModifiers;
  category: "navigation" | "editing" | "recipes" | "costing" | "orders" | "general";
  handler: (event?: KeyboardEvent) => void | Promise<void>;
  enabled: boolean;
  preventDefault?: boolean;
};

export type ShortcutGroup = {
  category: "navigation" | "editing" | "recipes" | "costing" | "orders" | "general";
  label: string;
  shortcuts: KeyboardShortcut[];
};

class KeyboardShortcutsManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled = true;
  private listeners: Set<(event: KeyboardEvent) => void> = new Set();

  constructor() {
    this.initializeEventListener();
  }

  /**
   * Register a keyboard shortcut
   */
  registerShortcut(shortcut: KeyboardShortcut) {
    this.shortcuts.set(shortcut.id, shortcut);
  }

  /**
   * Register multiple shortcuts
   */
  registerShortcuts(shortcuts: KeyboardShortcut[]) {
    shortcuts.forEach((shortcut) => this.registerShortcut(shortcut));
  }

  /**
   * Initialize global keyboard event listener
   */
  private initializeEventListener() {
    document.addEventListener("keydown", (event) => {
      if (!this.enabled) return;

      const matchedShortcut = this.findMatchingShortcut(event);

      if (matchedShortcut && matchedShortcut.enabled) {
        if (matchedShortcut.preventDefault !== false) {
          event.preventDefault();
        }

        try {
          matchedShortcut.handler(event);
        } catch (error) {
          console.error(`Error handling shortcut ${matchedShortcut.id}:`, error);
        }
      }

      // Notify all listeners
      this.listeners.forEach((listener) => listener(event));
    });
  }

  /**
   * Find matching shortcut for event
   */
  private findMatchingShortcut(event: KeyboardEvent): KeyboardShortcut | undefined {
    // Guard against missing event key
    if (!event.key) return undefined;

    return Array.from(this.shortcuts.values()).find((shortcut) => {
      if (!shortcut.enabled) return false;
      // Guard against missing shortcut key
      if (!shortcut.key) return false;

      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.modifiers.ctrl ? event.ctrlKey : !event.ctrlKey;
      const shiftMatch = shortcut.modifiers.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.modifiers.alt ? event.altKey : !event.altKey;
      const metaMatch = shortcut.modifiers.meta ? event.metaKey : !event.metaKey;

      return keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch;
    });
  }

  /**
   * Get shortcuts grouped by category
   */
  getGroupedShortcuts(): ShortcutGroup[] {
    const categories: Record<string, ShortcutGroup> = {
      navigation: { category: "navigation", label: "Navigation", shortcuts: [] },
      editing: { category: "editing", label: "Editing", shortcuts: [] },
      recipes: { category: "recipes", label: "Recipes", shortcuts: [] },
      costing: { category: "costing", label: "Costing", shortcuts: [] },
      orders: { category: "orders", label: "Orders", shortcuts: [] },
      general: { category: "general", label: "General", shortcuts: [] },
    };

    this.shortcuts.forEach((shortcut) => {
      if (categories[shortcut.category]) {
        categories[shortcut.category].shortcuts.push(shortcut);
      }
    });

    return Object.values(categories).filter((group) => group.shortcuts.length > 0);
  }

  /**
   * Enable/disable all shortcuts
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Enable/disable specific shortcut
   */
  setShortcutEnabled(shortcutId: string, enabled: boolean) {
    const shortcut = this.shortcuts.get(shortcutId);
    if (shortcut) {
      shortcut.enabled = enabled;
    }
  }

  /**
   * Get all shortcuts
   */
  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcut by ID
   */
  getShortcut(shortcutId: string): KeyboardShortcut | undefined {
    return this.shortcuts.get(shortcutId);
  }

  /**
   * Format shortcut for display
   */
  formatShortcut(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];

    if (shortcut.modifiers.meta) parts.push("⌘");
    if (shortcut.modifiers.ctrl) parts.push("Ctrl");
    if (shortcut.modifiers.alt) parts.push("Alt");
    if (shortcut.modifiers.shift) parts.push("Shift");

    parts.push(shortcut.key.toUpperCase());

    return parts.join("+");
  }

  /**
   * Add listener for all keyboard events
   */
  addListener(listener: (event: KeyboardEvent) => void) {
    this.listeners.add(listener);
  }

  /**
   * Remove listener
   */
  removeListener(listener: (event: KeyboardEvent) => void) {
    this.listeners.delete(listener);
  }
}

export const keyboardShortcuts = new KeyboardShortcutsManager();

/**
 * Register default navigation shortcuts
 */
export function registerNavigationShortcuts() {
  keyboardShortcuts.registerShortcuts([
    {
      id: "nav.recipes",
      name: "Go to Recipes",
      description: "Navigate to recipe search",
      key: "1",
      modifiers: { meta: true },
      category: "navigation",
      handler: () => {
        window.location.hash = "?tab=search";
      },
      enabled: true,
    },
    {
      id: "nav.add-recipe",
      name: "Create Recipe",
      description: "Navigate to add recipe",
      key: "n",
      modifiers: { meta: true },
      category: "navigation",
      handler: () => {
        window.location.hash = "?tab=add-recipe";
      },
      enabled: true,
    },
    {
      id: "nav.suppliers",
      name: "Go to Suppliers",
      description: "Navigate to suppliers",
      key: "t",
      modifiers: { meta: true },
      category: "navigation",
      handler: () => {
        window.location.hash = "?tab=suppliers";
      },
      enabled: true,
    },
    {
      id: "nav.costing",
      name: "Go to Costing",
      description: "Navigate to costing analysis",
      key: "$",
      modifiers: { meta: true, shift: true },
      category: "navigation",
      handler: () => {
        window.location.hash = "?tab=plate-costing";
      },
      enabled: true,
    },
    {
      id: "nav.customers",
      name: "Go to Customers",
      description: "Navigate to customers",
      key: "p",
      modifiers: { meta: true },
      category: "navigation",
      handler: () => {
        window.location.hash = "?tab=customer-service";
      },
      enabled: true,
    },
    {
      id: "nav.waste",
      name: "Go to Waste Tracking",
      description: "Navigate to waste tracking",
      key: "w",
      modifiers: { meta: true },
      category: "navigation",
      handler: () => {
        window.location.hash = "?tab=waste-tracking";
      },
      enabled: true,
    },
  ]);
}

/**
 * Register default editing shortcuts
 */
export function registerEditingShortcuts() {
  keyboardShortcuts.registerShortcuts([
    {
      id: "edit.save",
      name: "Save",
      description: "Save current changes",
      key: "s",
      modifiers: { meta: true },
      category: "editing",
      handler: () => {
        // Dispatch custom save event
        window.dispatchEvent(
          new CustomEvent("editor-save", { detail: { timestamp: Date.now() } }),
        );
      },
      enabled: true,
      preventDefault: true,
    },
    {
      id: "edit.undo",
      name: "Undo",
      description: "Undo last action",
      key: "z",
      modifiers: { meta: true },
      category: "editing",
      handler: () => {
        window.dispatchEvent(new CustomEvent("editor-undo"));
      },
      enabled: true,
      preventDefault: true,
    },
    {
      id: "edit.redo",
      name: "Redo",
      description: "Redo last action",
      key: "z",
      modifiers: { meta: true, shift: true },
      category: "editing",
      handler: () => {
        window.dispatchEvent(new CustomEvent("editor-redo"));
      },
      enabled: true,
      preventDefault: true,
    },
    {
      id: "edit.copy",
      name: "Copy",
      description: "Copy selected text",
      key: "c",
      modifiers: { meta: true },
      category: "editing",
      handler: () => {
        window.dispatchEvent(new CustomEvent("editor-copy"));
      },
      enabled: true,
    },
    {
      id: "edit.paste",
      name: "Paste",
      description: "Paste from clipboard",
      key: "v",
      modifiers: { meta: true },
      category: "editing",
      handler: () => {
        window.dispatchEvent(new CustomEvent("editor-paste"));
      },
      enabled: true,
    },
  ]);
}

/**
 * Register recipe shortcuts
 */
export function registerRecipeShortcuts() {
  keyboardShortcuts.registerShortcuts([
    {
      id: "recipe.search",
      name: "Search Recipes",
      description: "Open recipe search",
      key: "/",
      modifiers: { meta: true },
      category: "recipes",
      handler: () => {
        window.dispatchEvent(new CustomEvent("recipe-search-open"));
      },
      enabled: true,
      preventDefault: true,
    },
    {
      id: "recipe.scale",
      name: "Scale Recipe",
      description: "Open recipe scaler",
      key: "x",
      modifiers: { meta: true },
      category: "recipes",
      handler: () => {
        window.dispatchEvent(new CustomEvent("recipe-scale-open"));
      },
      enabled: true,
    },
  ]);
}

/**
 * Register order shortcuts
 */
export function registerOrderShortcuts() {
  keyboardShortcuts.registerShortcuts([
    {
      id: "order.create",
      name: "Create Order",
      description: "Create new purchase order",
      key: "o",
      modifiers: { meta: true },
      category: "orders",
      handler: () => {
        window.dispatchEvent(new CustomEvent("order-create-open"));
      },
      enabled: true,
    },
    {
      id: "order.search",
      name: "Search Orders",
      description: "Search existing orders",
      key: "f",
      modifiers: { meta: true },
      category: "orders",
      handler: () => {
        window.dispatchEvent(new CustomEvent("order-search-open"));
      },
      enabled: true,
    },
  ]);
}

/**
 * Register general shortcuts
 */
export function registerGeneralShortcuts() {
  keyboardShortcuts.registerShortcuts([
    {
      id: "general.command-palette",
      name: "Open Command Palette",
      description: "Open command palette",
      key: "k",
      modifiers: { meta: true },
      category: "general",
      handler: () => {
        window.dispatchEvent(new CustomEvent("command-palette-open"));
      },
      enabled: true,
      preventDefault: true,
    },
    {
      id: "general.help",
      name: "Help & Shortcuts",
      description: "Open help documentation",
      key: "?",
      modifiers: { shift: true },
      category: "general",
      handler: () => {
        window.dispatchEvent(new CustomEvent("help-open"));
      },
      enabled: true,
      preventDefault: true,
    },
  ]);
}

/**
 * Initialize all default shortcuts
 */
export function initializeDefaultShortcuts() {
  registerNavigationShortcuts();
  registerEditingShortcuts();
  registerRecipeShortcuts();
  registerOrderShortcuts();
  registerGeneralShortcuts();
}
