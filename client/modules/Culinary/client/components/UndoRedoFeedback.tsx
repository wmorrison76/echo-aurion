import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, RotateCw } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

type FeedbackType = "undo" | "redo";

type FeedbackState = {
  type: FeedbackType;
  timestamp: number;
};

export function useUndoRedoFeedback() {
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const showFeedback = (type: FeedbackType) => {
    setFeedback({
      type,
      timestamp: Date.now(),
    });
  };

  return {
    feedback,
    showFeedback,
    UndoRedoFeedbackComponent: () => <UndoRedoFeedbackComponent feedback={feedback} />,
  };
}

interface UndoRedoFeedbackComponentProps {
  feedback: FeedbackState | null;
}

function UndoRedoFeedbackComponent({ feedback }: UndoRedoFeedbackComponentProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {feedback && (
        <motion.div
          key={`feedback-${feedback.timestamp}`}
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
        >
          <div className="flex items-center gap-2 rounded-lg bg-foreground/80 px-4 py-2 text-background shadow-lg backdrop-blur-sm">
            {feedback.type === "undo" ? (
              <>
                <RotateCcw className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t("common.undo", "Undo")}
                </span>
              </>
            ) : (
              <>
                <RotateCw className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t("common.redo", "Redo")}
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useUndoRedoShortcuts(
  onUndo: () => void,
  onRedo: () => void,
  options?: {
    enabled?: boolean;
  },
) {
  const { showFeedback } = useUndoRedoFeedback();
  const { enabled = true } = options || {};

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Z for undo
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        onUndo();
        showFeedback("undo");
      }
      // Cmd+Shift+Z or Cmd+Y for redo
      if (
        ((e.metaKey || e.ctrlKey) &&
          e.shiftKey &&
          e.key.toLowerCase() === "z") ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        onRedo();
        showFeedback("redo");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onUndo, onRedo, enabled, showFeedback]);

  return { showFeedback };
}
