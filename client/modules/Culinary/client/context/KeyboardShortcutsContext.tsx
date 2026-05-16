import React, { createContext, useContext, useCallback, useMemo } from "react";
import { useKeyboardShortcuts, type KeyboardShortcutConfig } from "@/hooks/use-keyboard-shortcuts";

type ShortcutRegistry = Map<string, KeyboardShortcutConfig>;

type KeyboardShortcutsContextValue = {
  registerShortcut: (id: string, config: KeyboardShortcutConfig) => void;
  unregisterShortcut: (id: string) => void;
  shortcuts: ShortcutRegistry;
};

const KeyboardShortcutsContext = createContext<
  KeyboardShortcutsContextValue | undefined
>(undefined);

export const KeyboardShortcutsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [shortcuts, setShortcuts] = React.useState<ShortcutRegistry>(new Map());

  const registerShortcut = useCallback(
    (id: string, config: KeyboardShortcutConfig) => {
      setShortcuts((prev) => new Map(prev).set(id, config));
    },
    [],
  );

  const unregisterShortcut = useCallback((id: string) => {
    setShortcuts((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const shortcutsArray = useMemo(() => Array.from(shortcuts.values()), [shortcuts]);

  useKeyboardShortcuts(shortcutsArray);

  const value = useMemo(
    () => ({
      registerShortcut,
      unregisterShortcut,
      shortcuts,
    }),
    [registerShortcut, unregisterShortcut, shortcuts],
  );

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
};

export const useKeyboardShortcutsContext = () => {
  const ctx = useContext(KeyboardShortcutsContext);
  if (!ctx) {
    throw new Error(
      "useKeyboardShortcutsContext must be used within KeyboardShortcutsProvider",
    );
  }
  return ctx;
};

export const useRegisterShortcut = (id: string, config: KeyboardShortcutConfig) => {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcutsContext();

  React.useEffect(() => {
    registerShortcut(id, config);
    return () => unregisterShortcut(id);
  }, [id, config, registerShortcut, unregisterShortcut]);
};
