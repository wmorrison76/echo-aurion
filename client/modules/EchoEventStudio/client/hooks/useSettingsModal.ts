import { useCallback, useState } from "react";

export function useSettingsModal() {
  const [open, setOpen] = useState(false);

  const openSettings = useCallback(() => {
    setOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setOpen(false);
  }, []);

  const toggleSettings = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  return { open, setOpen, openSettings, closeSettings, toggleSettings };
}

/**
 * Global settings modal store (for cross-component access)
 * Usage:
 * import { settingsStore } from '@/hooks/useSettingsModal'
 * settingsStore.open = true
 */
export const settingsStore = {
  open: false,
  setOpen: (value: boolean) => {
    settingsStore.open = value;
  },
};
