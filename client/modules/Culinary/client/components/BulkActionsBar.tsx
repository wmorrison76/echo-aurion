import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Trash2, Download, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export type BulkActionItem = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  handler: () => void;
  dangerous?: boolean;
  disabled?: boolean;
};

interface BulkActionsBarProps {
  isOpen: boolean;
  selectedCount: number;
  actions: BulkActionItem[];
  onClose: () => void;
}

export function BulkActionsBar({
  isOpen,
  selectedCount,
  actions,
  onClose,
}: BulkActionsBarProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm shadow-lg"
        >
          <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {selectedCount}
              </div>
              <span className="text-sm font-medium">
                {selectedCount === 1
                  ? t("common.selected_one", "1 item selected")
                  : t("common.selected_multiple", `${selectedCount} items selected`)}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Button
                      size="sm"
                      variant={action.dangerous ? "destructive" : "outline"}
                      onClick={action.handler}
                      disabled={action.disabled}
                      className="gap-2"
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {action.label}
                    </Button>
                  </motion.div>
                );
              })}

              <div className="h-6 w-px bg-border" />

              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                {t("common.close", "Close")}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const DEFAULT_BULK_ACTIONS: BulkActionItem[] = [
  {
    id: "add-tag",
    label: "Add Tag",
    icon: Tag,
    handler: () => {}, // Will be implemented by parent
  },
  {
    id: "export",
    label: "Export",
    icon: Download,
    handler: () => {}, // Will be implemented by parent
  },
  {
    id: "delete",
    label: "Delete",
    icon: Trash2,
    handler: () => {}, // Will be implemented by parent
    dangerous: true,
  },
];
