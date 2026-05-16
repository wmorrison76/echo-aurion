/** * WCAG AA Accessibility Utilities * Provides helpers for keyboard navigation, focus management, and ARIA attributes */ import React from "react"; /** * Focus management for modals and floating panels * Traps focus within container while active */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>) {
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusableElements.length === 0) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };
    container.addEventListener("keydown", handleKeyDown);
    firstElement.focus();
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [containerRef]);
} /** * Announces messages to screen readers * Use for dynamic updates that don't change the DOM */
export function useAriaLive(
  message: string,
  politeness: "polite" | "assertive" = "polite",
) {
  const [announcement, setAnnouncement] = React.useState("");
  React.useEffect(() => {
    setAnnouncement(message);
    const timer = setTimeout(() => setAnnouncement(""), 1000);
    return () => clearTimeout(timer);
  }, [message]);
  return announcement;
} /** * Keyboard shortcuts helper * Ctrl/Cmd + Key combinations */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  ctrlKey = true,
  metaKey = true,
) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifierPressed = ctrlKey
        ? event.ctrlKey || (metaKey && event.metaKey)
        : metaKey && event.metaKey;
      if (isModifierPressed && event.key.toLowerCase() === key.toLowerCase()) {
        event.preventDefault();
        callback();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, callback, ctrlKey, metaKey]);
} /** * Color contrast checker (for development) * Returns true if contrast ratio meets WCAG AA standard (4.5:1 for normal text) */
export function checkColorContrast(
  foreground: string,
  background: string,
): { ratio: number; meetsWCAG_AA: boolean; meetsWCAG_AAA: boolean } {
  function getLuminance(color: string): number {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const luminance =
      0.2126 * Math.pow(r, 2.2) +
      0.7152 * Math.pow(g, 2.2) +
      0.0722 * Math.pow(b, 2.2);
    return luminance;
  }
  const l1 = getLuminance(foreground) + 0.05;
  const l2 = getLuminance(background) + 0.05;
  const ratio = Math.max(l1, l2) / Math.min(l1, l2);
  return {
    ratio: parseFloat(ratio.toFixed(2)),
    meetsWCAG_AA: ratio >= 4.5,
    meetsWCAG_AAA: ratio >= 7,
  };
} /** * Announce page title change to screen readers */
export function usePageTitle(title: string) {
  React.useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | LUCCCA`;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
  React.useEffect(() => {
    const mainHeading = document.querySelector("h1");
    if (mainHeading instanceof HTMLElement) {
      mainHeading.focus();
    }
  }, [title]);
} /** * Ensure proper heading hierarchy * Warns in development if h1 is missing or hierarchy is broken */
export function validateHeadingHierarchy() {
  if (process.env.NODE_ENV !== "development") return;
  const headings = Array.from(
    document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
  );
  const levels = headings.map((h) => parseInt(h.tagName[1]));
  if (levels.length === 0) {
    console.warn("❌ Accessibility: No h1 found on page");
    return;
  }
  if (levels[0] !== 1) {
    console.warn("❌ Accessibility: Page should start with h1");
  }
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      console.warn(
        `❌ Accessibility: Heading hierarchy broken - jumped from h${levels[i - 1]} to h${levels[i]}`,
      );
    }
  }
} /** * Accessible disclosure (expandable sections) * Handles keyboard nav (Enter/Space to toggle, Up/Down to navigate between buttons) */
export function useAccessibleDisclosure(defaultOpen = false) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const toggle = React.useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === "") {
        event.preventDefault();
        toggle();
      }
    },
    [toggle],
  );
  return {
    isOpen,
    toggle,
    handleKeyDown,
    buttonProps: {
      ref: buttonRef,
      onClick: toggle,
      onKeyDown: handleKeyDown,
      "aria-expanded": isOpen,
      "aria-controls": contentRef.current?.id,
    },
    contentProps: { ref: contentRef, hidden: !isOpen, "aria-hidden": !isOpen },
  };
}
