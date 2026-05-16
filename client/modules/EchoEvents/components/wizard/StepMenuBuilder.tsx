// =============================================================================
// STEP 2: MENU BUILDER | LEFT LIBRARY -> RIGHT EVENT MENU
// =============================================================================
import React, { useCallback, useState } from "react";
import { MenuLibrary } from "../menu/MenuLibrary";
import { EventMenuPanel } from "../menu/EventMenuPanel";
import type { Menu } from "@shared/menu-types";
import { useTraceEmitter } from "@/lib/trace-emitter";

interface StepProps {
  onNext: () => void;
  onBack: () => void;
}

export const StepMenuBuilder: React.FC<StepProps> = ({ onNext, onBack }) => {
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const { emit } = useTraceEmitter();

  const handleSelectMenu = useCallback(
    (menu: Menu, items?: string[]) => {
      setSelectedMenu(menu);
      const newItems = items ?? [];
      setSelectedItems(newItems);

      // Emit trace for menu selection
      emit(
        "menu",
        menu.id || "unknown",
        "menu-builder",
        "menu",
        {
          menuId: menu.id,
          menuName: menu.name,
          action: "select_menu",
          itemIds: newItems,
        },
        {
          selectedMenu: menu.id,
          selectedItems: newItems,
          itemCount: newItems.length,
        },
        {
          downstreamImplications: [
            {
              type: "inventory_requirement",
              entityType: "inventory-implication",
              entityId: `impl-menu-${menu.id}`,
              impact: "Menu selection may require inventory adjustments",
            },
          ],
        },
      ).catch(() => {
        // Ignore trace errors - graceful degradation
      });
    },
    [emit],
  );

  const handleToggleItem = useCallback(
    (itemId: string) => {
      setSelectedItems((prev) => {
        const isAdding = !prev.includes(itemId);
        const newItems = isAdding
          ? [...prev, itemId]
          : prev.filter((id) => id !== itemId);

        // Emit trace for item toggle
        emit(
          "menu-item",
          itemId,
          "menu-builder",
          "menu",
          {
            itemId,
            action: isAdding ? "add_item" : "remove_item",
            previousItems: prev,
          },
          {
            selectedItems: newItems,
            itemCount: newItems.length,
          },
          {
            downstreamImplications: isAdding
              ? [
                  {
                    type: "inventory_requirement",
                    entityType: "inventory-implication",
                    entityId: `impl-item-${itemId}`,
                    impact: "Item addition may require inventory adjustments",
                  },
                ]
              : [],
          },
        ).catch(() => {
          // Ignore trace errors - graceful degradation
        });

        return newItems;
      });
    },
    [emit],
  );

  const handleClearMenu = useCallback(() => {
    const previousMenu = selectedMenu?.id;
    const previousItems = [...selectedItems];
    setSelectedMenu(null);
    setSelectedItems([]);

    // Emit trace for menu clear
    emit(
      "menu",
      previousMenu || "unknown",
      "menu-builder",
      "menu",
      {
        action: "clear_menu",
        previousMenu,
        previousItems,
      },
      {
        selectedMenu: null,
        selectedItems: [],
        itemCount: 0,
      },
    ).catch(() => {
      // Ignore trace errors - graceful degradation
    });
  }, [selectedMenu, selectedItems, emit]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Build Event Menu</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[540px]">
        <MenuLibrary
          selectedMenu={selectedMenu}
          selectedItems={selectedItems}
          onSelectMenu={handleSelectMenu}
          onToggleItem={handleToggleItem}
        />
        <EventMenuPanel
          selectedMenu={selectedMenu}
          selectedItems={selectedItems}
          onToggleItem={handleToggleItem}
          onClearMenu={handleClearMenu}
        />
      </div>
      <div className="mt-6 flex justify-between">
        <button className="btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <button className="btn-primary" onClick={onNext}>
          Continue →
        </button>
      </div>
    </div>
  );
};
