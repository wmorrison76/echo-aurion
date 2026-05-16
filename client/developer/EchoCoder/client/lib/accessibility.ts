/**
 * Accessibility utilities for keyboard navigation, ARIA labels, and screen reader support
 */

/**
 * Handle keyboard navigation for list/menu items
 */
export function handleListKeyDown(
  e: React.KeyboardEvent,
  itemIndex: number,
  totalItems: number,
  onSelectItem: (index: number) => void,
) {
  switch (e.key) {
    case "ArrowDown":
    case "ArrowRight":
      e.preventDefault();
      if (itemIndex < totalItems - 1) {
        onSelectItem(itemIndex + 1);
      }
      break;
    case "ArrowUp":
    case "ArrowLeft":
      e.preventDefault();
      if (itemIndex > 0) {
        onSelectItem(itemIndex - 1);
      }
      break;
    case "Home":
      e.preventDefault();
      onSelectItem(0);
      break;
    case "End":
      e.preventDefault();
      onSelectItem(totalItems - 1);
      break;
  }
}

/**
 * Handle tab navigation patterns
 */
export function handleTabKeyDown(
  e: React.KeyboardEvent,
  currentTabIndex: number,
  totalTabs: number,
  onSelectTab: (index: number) => void,
) {
  switch (e.key) {
    case "ArrowRight":
    case "ArrowDown":
      e.preventDefault();
      if (currentTabIndex < totalTabs - 1) {
        onSelectTab(currentTabIndex + 1);
      }
      break;
    case "ArrowLeft":
    case "ArrowUp":
      e.preventDefault();
      if (currentTabIndex > 0) {
        onSelectTab(currentTabIndex - 1);
      }
      break;
    case "Home":
      e.preventDefault();
      onSelectTab(0);
      break;
    case "End":
      e.preventDefault();
      onSelectTab(totalTabs - 1);
      break;
  }
}

/**
 * Generate ARIA labels for common UI patterns
 */
export const ariaLabels = {
  button: (label: string, description?: string) => ({
    "aria-label": label,
    "aria-description": description,
    role: "button",
  }),

  dialog: (title: string) => ({
    "aria-labelledby": "dialog-title",
    "aria-modal": true,
    role: "dialog",
  }),

  tab: (selected: boolean, label: string) => ({
    "aria-selected": selected,
    "aria-label": label,
    role: "tab",
  }),

  tablist: () => ({
    role: "tablist",
    "aria-label": "Navigation tabs",
  }),

  tabpanel: (tabId: string) => ({
    role: "tabpanel",
    "aria-labelledby": tabId,
  }),

  menuitem: (label: string) => ({
    role: "menuitem",
    "aria-label": label,
  }),

  list: () => ({
    role: "list",
  }),

  listitem: () => ({
    role: "listitem",
  }),

  combobox: (expanded: boolean, hasPopup: string = "listbox") => ({
    role: "combobox",
    "aria-expanded": expanded,
    "aria-haspopup": hasPopup,
    "aria-autocomplete": "list",
  }),

  searchbox: () => ({
    role: "searchbox",
    "aria-label": "Search",
  }),

  progressbar: (value: number, max: number = 100) => ({
    role: "progressbar",
    "aria-valuenow": value,
    "aria-valuemin": 0,
    "aria-valuemax": max,
  }),

  alert: (live: "polite" | "assertive" = "polite") => ({
    role: "alert",
    "aria-live": live,
    "aria-atomic": true,
  }),

  status: () => ({
    role: "status",
    "aria-live": "polite",
    "aria-atomic": true,
  }),

  form: (name: string) => ({
    role: "form",
    "aria-label": name,
  }),

  group: (label: string) => ({
    role: "group",
    "aria-label": label,
  }),

  table: () => ({
    role: "table",
  }),

  columnheader: () => ({
    role: "columnheader",
  }),

  rowheader: () => ({
    role: "rowheader",
  }),
};

/**
 * Announce messages to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite",
) {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.style.position = "absolute";
  announcement.style.left = "-10000px";
  announcement.style.width = "1px";
  announcement.style.height = "1px";
  announcement.style.overflow = "hidden";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check if element is in viewport (for focus management)
 */
export function isElementInViewport(el: HTMLElement | null): boolean {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Scroll element into view and focus it
 */
export function scrollAndFocusElement(el: HTMLElement | null) {
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  // Give browser time to scroll, then focus
  setTimeout(() => {
    el.focus();
  }, 300);
}

/**
 * Create focusable trap for modal dialogs
 */
export function createFocusTrap(containerEl: HTMLElement | null) {
  if (!containerEl) return null;

  const focusableElements = containerEl.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  ) as NodeListOf<HTMLElement>;

  if (focusableElements.length === 0) return null;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  return {
    elements: focusableElements,
    firstElement,
    lastElement,
  };
}

/**
 * Handle focus trap on Tab key
 */
export function handleFocusTrapTab(
  e: React.KeyboardEvent,
  trap: ReturnType<typeof createFocusTrap>,
) {
  if (!trap || e.key !== "Tab") return;

  if (e.shiftKey) {
    if (document.activeElement === trap.firstElement) {
      e.preventDefault();
      trap.lastElement.focus();
    }
  } else {
    if (document.activeElement === trap.lastElement) {
      e.preventDefault();
      trap.firstElement.focus();
    }
  }
}

/**
 * Skip link texts for common UI patterns
 */
export const skipLinkText = {
  mainContent: "Skip to main content",
  navigation: "Skip to navigation",
  sidebar: "Skip to sidebar",
  footer: "Skip to footer",
};

/**
 * Keyboard shortcuts definition
 */
export const keyboardShortcuts = {
  save: { key: "s", ctrl: true, description: "Save" },
  undo: { key: "z", ctrl: true, description: "Undo" },
  redo: { key: "z", ctrl: true, shift: true, description: "Redo" },
  escape: { key: "Escape", description: "Close" },
  enter: { key: "Enter", description: "Confirm" },
  search: { key: "k", ctrl: true, description: "Search" },
  help: { key: "?", description: "Help" },
};

/**
 * Get readable keyboard shortcut text
 */
export function getShortcutText(
  key: string,
  ctrl?: boolean,
  shift?: boolean,
  alt?: boolean,
): string {
  const parts: string[] = [];
  if (ctrl) parts.push("Ctrl");
  if (shift) parts.push("Shift");
  if (alt) parts.push("Alt");
  parts.push(key.toUpperCase());
  return parts.join("+");
}

/**
 * Color contrast checker (basic implementation)
 * Real implementation would calculate relative luminance
 */
export function checkColorContrast(
  foreground: string,
  background: string,
  isLargeText: boolean = false,
): boolean {
  // Placeholder - would implement WCAG color contrast calculation
  // WCAG AA: 4.5:1 for normal text, 3:1 for large text
  return true;
}
