import { useCallback, useRef, useState } from "react";

export type DragItem<T> = T & { id: string };

type DragState<T> = {
  draggedId: string | null;
  draggedIndex: number | null;
  overIndex: number | null;
  items: DragItem<T>[];
};

export function useDragAndDrop<T extends { id: string }>(
  initialItems: T[],
  onReorder?: (items: T[]) => void,
) {
  const [items, setItems] = useState<T[]>(initialItems);
  const dragStateRef = useRef<DragState<T>>({
    draggedId: null,
    draggedIndex: null,
    overIndex: null,
    items: initialItems,
  });

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLElement>, index: number, id: string) => {
      dragStateRef.current = {
        draggedId: id,
        draggedIndex: index,
        overIndex: null,
        items: items,
      };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    },
    [items],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLElement>, dropIndex: number) => {
      e.preventDefault();
      const state = dragStateRef.current;
      if (state.draggedIndex === null || state.draggedIndex === dropIndex) {
        return;
      }

      const newItems = [...items];
      const [draggedItem] = newItems.splice(state.draggedIndex, 1);
      newItems.splice(dropIndex, 0, draggedItem);

      setItems(newItems);
      onReorder?.(newItems);
    },
    [items, onReorder],
  );

  const handleDragEnd = useCallback(() => {
    dragStateRef.current = {
      draggedId: null,
      draggedIndex: null,
      overIndex: null,
      items: [],
    };
  }, []);

  return {
    items,
    setItems,
    draggedId: dragStateRef.current.draggedId,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  };
}
