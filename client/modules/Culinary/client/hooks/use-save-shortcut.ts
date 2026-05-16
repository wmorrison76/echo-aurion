import { useCallback, useEffect } from "react";
import { useRegisterShortcut } from "@/context/KeyboardShortcutsContext";
import { useToast } from "@/hooks/use-toast";

type SaveHandler = () => Promise<void> | void;

export function useSaveShortcut(
  onSave: SaveHandler,
  options?: {
    enabled?: boolean;
    showToast?: boolean;
  },
) {
  const { toast } = useToast();
  const { enabled = true, showToast = false } = options || {};

  const wrappedHandler = useCallback(async () => {
    if (!enabled) return;
    try {
      await onSave();
      if (showToast) {
        toast({
          title: "Saved",
          description: "Your changes have been saved.",
        });
      }
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Save failed",
        description: "Failed to save your changes.",
        variant: "destructive",
      });
    }
  }, [onSave, enabled, showToast, toast]);

  useRegisterShortcut("save-shortcut", {
    key: "s",
    meta: true,
    handler: () => wrappedHandler(),
    preventDefault: true,
  });
}
