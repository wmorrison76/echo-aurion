import { useEffect, useRef, useCallback } from "react";

export type KeyboardShortcutConfig = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: (e: KeyboardEvent) => void;
  description?: string;
  preventDefault?: boolean;
};

export function useKeyboardShortcuts(shortcuts: KeyboardShortcutConfig[]) {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard against undefined event key
      if (!e.key) return;

      for (const shortcut of shortcutsRef.current) {
        // Guard against undefined shortcut key
        if (!shortcut.key) continue;

        const isKeyMatch =
          e.key.toLowerCase() === shortcut.key.toLowerCase();
        const isCtrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
        const isShiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const isAltMatch = shortcut.alt ? e.altKey : !e.altKey;
        const isMetaMatch = shortcut.meta ? e.metaKey : !e.metaKey;

        if (
          isKeyMatch &&
          isCtrlMatch &&
          isShiftMatch &&
          isAltMatch &&
          isMetaMatch
        ) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          shortcut.handler(e);
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

export function useKeyboardShortcut(
  config: KeyboardShortcutConfig,
) {
  useKeyboardShortcuts([config]);
}

export function normalizeShortcut(
  keyCombo: string,
): KeyboardShortcutConfig["key"] {
  if (!keyCombo) return "";
  const parts = keyCombo.toLowerCase().split("+");
  return parts[parts.length - 1];
}

export function parseShortcut(keyCombo: string): Omit<
  KeyboardShortcutConfig,
  "key" | "handler"
> {
  if (!keyCombo) {
    return {
      meta: false,
      ctrl: false,
      shift: false,
      alt: false,
    };
  }
  const parts = keyCombo.toLowerCase().split("+");
  return {
    meta: parts.includes("cmd") || parts.includes("meta"),
    ctrl: parts.includes("ctrl"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
  };
}
