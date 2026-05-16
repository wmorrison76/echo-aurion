import { useEffect } from "react";

type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  callback: (event: KeyboardEvent) => void;
};

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = (shortcut.ctrl ?? false) === (event.ctrlKey || event.metaKey);
        const altMatch = (shortcut.alt ?? false) === event.altKey;
        const shiftMatch = (shortcut.shift ?? false) === event.shiftKey;
        const metaMatch = (shortcut.meta ?? false) === event.metaKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
          event.preventDefault();
          shortcut.callback(event);
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

export type ShortcutDefinition = {
  label: string;
  key: string;
  modifiers: ("ctrl" | "meta" | "alt" | "shift")[];
  callback: () => void;
};

export const DEFAULT_SHORTCUTS: Omit<ShortcutDefinition, "callback">[] = [
  { label: "Undo", key: "z", modifiers: ["meta"] },
  { label: "Redo", key: "z", modifiers: ["meta", "shift"] },
  { label: "Duplicate", key: "d", modifiers: ["meta"] },
  { label: "Delete", key: "Delete", modifiers: [] },
  { label: "Select All", key: "a", modifiers: ["meta"] },
  { label: "Deselect", key: "Escape", modifiers: [] },
  { label: "Group", key: "g", modifiers: ["meta"] },
  { label: "Ungroup", key: "g", modifiers: ["meta", "shift"] },
  { label: "Bring Forward", key: "ArrowUp", modifiers: ["ctrl"] },
  { label: "Send Backward", key: "ArrowDown", modifiers: ["ctrl"] },
  { label: "Bring to Front", key: "ArrowUp", modifiers: ["ctrl", "shift"] },
  { label: "Send to Back", key: "ArrowDown", modifiers: ["ctrl", "shift"] },
  { label: "Align Left", key: "[", modifiers: ["meta"] },
  { label: "Align Right", key: "]", modifiers: ["meta"] },
  { label: "Align Top", key: "[", modifiers: ["meta", "alt"] },
  { label: "Align Bottom", key: "]", modifiers: ["meta", "alt"] },
  { label: "Align Center", key: "/", modifiers: ["meta"] },
  { label: "Align Middle", key: "/", modifiers: ["meta", "alt"] },
  { label: "Zoom In", key: "+", modifiers: ["meta"] },
  { label: "Zoom Out", key: "-", modifiers: ["meta"] },
  { label: "Zoom to 100%", key: "0", modifiers: ["meta"] },
  { label: "Zoom to Fit", key: "1", modifiers: ["meta"] },
  { label: "Focus Inspector", key: "i", modifiers: ["meta"] },
  { label: "Focus Layers", key: "l", modifiers: ["meta"] },
  { label: "Toggle Grid", key: "'", modifiers: ["meta"] },
  { label: "Toggle Guides", key: ";", modifiers: ["meta"] },
  { label: "Export PDF", key: "e", modifiers: ["meta"] },
  { label: "Save Design", key: "s", modifiers: ["meta"] },
];

export function createKeyboardShortcuts(definitions: ShortcutDefinition[]): KeyboardShortcut[] {
  return definitions.map((def) => ({
    key: def.key,
    ctrl: def.modifiers.includes("ctrl"),
    alt: def.modifiers.includes("alt"),
    shift: def.modifiers.includes("shift"),
    meta: def.modifiers.includes("meta"),
    callback: def.callback,
  }));
}

export function getModifierKeys(event: KeyboardEvent): string {
  const modifiers: string[] = [];
  if (event.metaKey) modifiers.push("Cmd");
  if (event.ctrlKey) modifiers.push("Ctrl");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");
  return modifiers.join("+");
}

export function getShortcutString(modifiers: ("ctrl" | "meta" | "alt" | "shift")[], key: string): string {
  const parts: string[] = [];
  if (modifiers.includes("meta")) parts.push("Cmd");
  if (modifiers.includes("ctrl")) parts.push("Ctrl");
  if (modifiers.includes("alt")) parts.push("Alt");
  if (modifiers.includes("shift")) parts.push("Shift");
  parts.push(key.length > 1 ? key : key.toUpperCase());
  return parts.join("+");
}
