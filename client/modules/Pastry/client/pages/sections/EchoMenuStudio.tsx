/**
 * Pastry — EchoMenuStudio
 * ----------------------------------------------------------------------------
 * Pastry shares the canonical menu-design studio with Culinary. The original
 * Pastry-tree implementation was a divergent copy that referenced helpers
 * (use-history, use-save-shortcut, UndoRedoFeedback,
 *  components/menu-studio/*) which only exist in Culinary's tree, so it
 * never built in production.
 *
 * This module re-exports Culinary's implementation. If a pastry-specific
 * variant is needed later, fork the Culinary file into this path, copy the
 * supporting helpers into Pastry's client tree, and restore the divergence.
 * ----------------------------------------------------------------------------
 */

export {
  default,
  type DesignerElement,
  type DesignerElementType,
} from '@/modules/Culinary/client/pages/sections/EchoMenuStudio';
