import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check, Link2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  searchInventoryItems,
  mapIngredientToInventory,
} from "@/data/ingredientMappings";
import {
  getInventoryItem,
  getCurrentCostPerUnit,
  InventoryItem,
} from "@/data/inventoryItems";
import { useTranslation } from "@/context/LanguageContext";

interface IngredientSelectorProps {
  value?: string; // ingredientId if linked, or display name
  onSelect: (
    inventoryId: string,
    inventoryItem: InventoryItem,
  ) => void;
  onClear?: () => void;
  suggestedText?: string; // recipe ingredient text for auto-suggestion
  showPrice?: boolean;
  className?: string;
}

export function IngredientSelector({
  value,
  onSelect,
  onClear,
  suggestedText,
  showPrice = true,
  className,
}: IngredientSelectorProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Try to auto-map suggested text
  const autoMappingSuggestion = useMemo(() => {
    if (!suggestedText) return null;
    return mapIngredientToInventory(suggestedText);
  }, [suggestedText]);

  // Get currently selected inventory item
  const selectedItem = useMemo(() => {
    const id = selectedId || (value && value.startsWith("ing-") ? value : null);
    return id ? getInventoryItem(id) : null;
  }, [selectedId, value]);

  // Search results
  const results = useMemo(() => {
    if (!search.trim()) {
      // Show auto-mapping suggestion if available
      if (autoMappingSuggestion && autoMappingSuggestion.confidence >= 0.6) {
        const item = getInventoryItem(autoMappingSuggestion.inventoryId);
        return item ? [item] : [];
      }
      // Show recently used or all items
      return [];
    }

    const searchResults = searchInventoryItems(search, 0.5);
    return searchResults
      .map((result) => getInventoryItem(result.inventoryId))
      .filter((item): item is InventoryItem => item !== undefined);
  }, [search, autoMappingSuggestion]);

  const handleSelect = useCallback(
    (item: InventoryItem) => {
      setSelectedId(item.id);
      onSelect(item.id, item);
      setIsOpen(false);
      setSearch("");
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    setSelectedId(null);
    setSearch("");
    onClear?.();
  }, [onClear]);

  // Get primary supplier info for selected item
  const primarySupplier = useMemo(() => {
    if (!selectedItem || selectedItem.supplierLinks.length === 0) return null;
    return selectedItem.supplierLinks[0];
  }, [selectedItem]);

  const costPerUnit = useMemo(() => {
    return selectedItem ? getCurrentCostPerUnit(selectedItem) : null;
  }, [selectedItem]);

  // Show auto-mapping confidence indicator
  const confidenceIndicator =
    autoMappingSuggestion && !selectedId ? autoMappingSuggestion.confidence : null;

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            {selectedItem ? (
              <Button
                variant="outline"
                className="w-full justify-between gap-2 pr-2"
                onClick={() => setIsOpen(!isOpen)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Link2 className="h-4 w-4 flex-shrink-0 text-[#c8a97e]" />
                  <span className="text-sm font-medium truncate">
                    {selectedItem.canonicalName}
                  </span>
                </div>
                <X
                  className="h-4 w-4 flex-shrink-0 text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                />
              </Button>
            ) : autoMappingSuggestion && confidenceIndicator ? (
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between gap-2",
                  confidenceIndicator >= 0.8 ? "border border-[#c8a97e]/80" : "border border-yellow-200",
                )}
                onClick={() => setIsOpen(!isOpen)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {confidenceIndicator >= 0.8 ? (
                    <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-yellow-600" />
                  )}
                  <span className="text-sm truncate">
                    {autoMappingSuggestion.recipeText}
                  </span>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {Math.round(confidenceIndicator * 100)}%
                  </Badge>
                </div>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={() => setIsOpen(!isOpen)}
              >
                <Search className="h-4 w-4" />
                <span>{t("common.search", "Search")}</span>
              </Button>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-0" align="start">
          <div className="space-y-2 p-3">
            <Input
              autoFocus
              placeholder={t("common.search", "Search ingredients...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />

            {autoMappingSuggestion && !search && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-2 rounded text-sm border-l-2 flex items-start gap-2",
                  confidenceIndicator! >= 0.8
                    ? "bg-green-50 border-green-500 dark:bg-green-950"
                    : "bg-yellow-50 border-yellow-500 dark:bg-yellow-950",
                )}
              >
                <div className="flex-1">
                  <p className="font-medium">
                    {confidenceIndicator! >= 0.8 ? "Auto-matched" : "Suggested"}
                  </p>
                  <p className="text-xs opacity-75">
                    {autoMappingSuggestion.notes &&
                      `${autoMappingSuggestion.notes} • `}
                    {Math.round(confidenceIndicator! * 100)}% confidence
                  </p>
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {results.length > 0 ? (
                <div className="max-h-64 overflow-auto space-y-1">
                  {results.map((item) => {
                    const itemCost = getCurrentCostPerUnit(item);
                    const isAutoSuggestion =
                      autoMappingSuggestion?.inventoryId === item.id &&
                      !search;

                    return (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -2 }}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          "w-full text-left p-2 rounded transition-colors text-sm",
                          isAutoSuggestion
                            ? "bg-white/80 hover:bg-[#c8a97e]/80 dark:bg-[#c8a97e]/30 dark:hover:bg-[#c8a97e]-800"
                            : "hover:bg-muted",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {item.canonicalName}
                            </p>
                            {item.description && (
                              <p className="text-xs opacity-60 truncate">
                                {item.description}
                              </p>
                            )}
                          </div>
                          {showPrice && itemCost !== null && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              ${itemCost.toFixed(2)}/
                              {item.primaryUnit}
                            </Badge>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ) : search.trim() && results.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground text-center">
                  {t("common.no_results", "No ingredients found")}
                </p>
              ) : null}
            </AnimatePresence>
          </div>
        </PopoverContent>
      </Popover>

      {selectedItem && showPrice && (
        <div className="text-xs space-y-1 pl-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cost per unit:</span>
            <span className="font-semibold">
              ${costPerUnit?.toFixed(2) ?? "N/A"} / {selectedItem.primaryUnit}
            </span>
          </div>
          {primarySupplier && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Supplier:</span>
              <span className="font-medium">{primarySupplier.supplierName}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Simple button variant for quick linking
interface IngredientLinkButtonProps {
  inventoryId?: string | null;
  suggestedText?: string;
  onLink: (inventoryId: string, item: InventoryItem) => void;
  compact?: boolean;
}

export function IngredientLinkButton({
  inventoryId,
  suggestedText,
  onLink,
  compact = false,
}: IngredientLinkButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const suggestion = useMemo(
    () => (suggestedText ? mapIngredientToInventory(suggestedText) : null),
    [suggestedText],
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          size={compact ? "sm" : "default"}
          variant={inventoryId ? "default" : suggestion ? "outline" : "secondary"}
          className="gap-1"
        >
          <Link2 className="h-3 w-3" />
          {!compact && (inventoryId ? "Linked" : "Link")}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0">
        <IngredientSelector
          value={inventoryId ?? undefined}
          onSelect={(id, item) => {
            onLink(id, item);
            setIsOpen(false);
          }}
          suggestedText={suggestedText}
          showPrice
        />
      </PopoverContent>
    </Popover>
  );
}
