export { useDesignerState } from "./useDesignerState";
export type {
  DesignerState,
  DesignerElement,
  DesignerAction,
  CanvasSettings,
  PageSize,
  ComponentDefinition,
} from "./useDesignerState";

export { useCanvasOperations } from "./useCanvasOperations";

export { useHistory } from "./useHistory";

export {
  useKeyboardShortcuts,
  createKeyboardShortcuts,
  getModifierKeys,
  getShortcutString,
  DEFAULT_SHORTCUTS,
} from "./useKeyboardShortcuts";
export type { KeyboardShortcut, ShortcutDefinition } from "./useKeyboardShortcuts";

export {
  useAutoSave,
  getSavedDesigns,
  getSavedDesign,
  deleteSavedDesign,
  renameSavedDesign,
  clearAllSavedDesigns,
} from "./useAutoSave";
export type { SavedDesign } from "./useAutoSave";
