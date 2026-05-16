/**
 * Accessibility utilities for improving screen reader support
 * and keyboard navigation
 */

/**
 * Generate aria-label with proper formatting
 * @param label - Base label text
 * @param context - Additional context to add
 * @returns Properly formatted aria-label
 */
export function generateAriaLabel(label: string, context?: string): string {
  if (!context) return label;
  return `${label}, ${context}`;
}

/**
 * Generate aria-description with status information
 * @param status - Current status
 * @param additional - Additional information
 * @returns Properly formatted aria-description
 */
export function generateAriaDescription(status: string, additional?: string): string {
  let description = `Status: ${status}`;
  if (additional) description += `. ${additional}`;
  return description;
}

/**
 * Check if keyboard event is Enter or Space
 * @param event - Keyboard event
 * @returns True if Enter or Space key was pressed
 */
export function isActivationKey(event: React.KeyboardEvent): boolean {
  return event.key === "Enter" || event.key === " ";
}

/**
 * Handle keyboard activation for custom elements
 * @param event - Keyboard event
 * @param callback - Function to call on activation
 */
export function handleKeyboardActivation(
  event: React.KeyboardEvent,
  callback: () => void,
) {
  if (isActivationKey(event)) {
    event.preventDefault();
    callback();
  }
}

/**
 * Generate unique ID for aria-labelledby and aria-describedby
 * @param prefix - Prefix for the ID
 * @returns Unique ID
 */
export function generateId(prefix: string = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

/**
 * Create accessible status announcement
 * @param message - Message to announce
 * @param priority - Priority level: 'polite' or 'assertive'
 */
export function announceStatus(message: string, priority: "polite" | "assertive" = "polite") {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => announcement.remove(), 1000);
}

/**
 * Get keyboard shortcut help text
 * @param shortcuts - Array of { key: string, description: string }
 * @returns Formatted help text
 */
export function getKeyboardShortcutHelp(
  shortcuts: Array<{ key: string; description: string }>,
): string {
  if (shortcuts.length === 0) return "";
  return (
    "Keyboard shortcuts: " +
    shortcuts.map((s) => `${s.key} to ${s.description}`).join(", ")
  );
}

/**
 * Create accessible tooltip content
 * @param text - Tooltip text
 * @param shortcut - Optional keyboard shortcut
 * @returns Tooltip object with aria attributes
 */
export function createAccessibleTooltip(text: string, shortcut?: string) {
  let content = text;
  if (shortcut) content += ` (${shortcut})`;
  return {
    content,
    ariaLabel: content,
  };
}

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Focus an element by ID
   */
  focusElement(id: string) {
    const element = document.getElementById(id);
    element?.focus();
  },

  /**
   * Focus first interactive element in container
   */
  focusFirstElement(container: HTMLElement | null) {
    if (!container) return;
    const interactive = container.querySelector(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    ) as HTMLElement;
    interactive?.focus();
  },

  /**
   * Focus last interactive element in container
   */
  focusLastElement(container: HTMLElement | null) {
    if (!container) return;
    const interactive = Array.from(
      container.querySelectorAll(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      ),
    ).pop() as HTMLElement;
    interactive?.focus();
  },

  /**
   * Trap focus within a container (useful for modals)
   */
  trapFocus(container: HTMLElement | null, event: KeyboardEvent) {
    if (!container || event.key !== "Tab") return;

    const elements = Array.from(
      container.querySelectorAll(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      ),
    ) as HTMLElement[];

    if (elements.length === 0) return;

    const firstElement = elements[0];
    const lastElement = elements[elements.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab
      if (activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  },
};

/**
 * Create accessible form error message
 * @param fieldId - ID of the form field
 * @param message - Error message
 * @returns Error container with proper aria attributes
 */
export function createAccessibleFormError(fieldId: string, message: string) {
  const errorId = `${fieldId}-error`;
  return {
    id: errorId,
    message,
    ariaDescribedBy: errorId,
  };
}

/**
 * Check color contrast ratio
 * Useful for ensuring accessible color combinations
 * @param color1 - Hex color 1
 * @param color2 - Hex color 2
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string) => {
    const rgb = parseInt(color.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance <= 0.03928
      ? luminance / 12.92
      : Math.pow((luminance + 0.055) / 1.055, 2.4);
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG standards
 * @param ratio - Contrast ratio
 * @param level - WCAG level: 'A' (4.5:1), 'AA' (7:1), 'AAA' (4.5:1 for large)
 * @returns True if ratio meets standard
 */
export function meetsContrastStandard(
  ratio: number,
  level: "A" | "AA" | "AAA" = "AA",
): boolean {
  const standards = { A: 4.5, AA: 7, AAA: 7 };
  return ratio >= standards[level];
}
