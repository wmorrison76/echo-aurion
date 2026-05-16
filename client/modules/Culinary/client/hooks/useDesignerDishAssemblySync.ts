import { useCallback, useEffect, useState } from "react";

/**
 * Hook to synchronize Dish Assembly data with Menu Designer
 * Allows two-way communication between the workspaces
 */

export interface CompletedDish {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image?: string;
  components: string[];
  allergens: string[];
  popularity: number;
  foodCost: number;
  engineeringClass: string;
  lastModified: Date;
  tags: string[];
}

const STORAGE_KEY = "designStudio:completedDishes";
const SESSION_KEY = "designStudio:selectedDishes";

export function useDesignerDishAssemblySync() {
  const [completedDishes, setCompletedDishes] = useState<CompletedDish[]>([]);
  const [selectedDishIds, setSelectedDishIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load completed dishes from storage
  const loadCompletedDishes = useCallback(() => {
    setIsLoading(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const dishes = JSON.parse(stored) as CompletedDish[];
        setCompletedDishes(dishes);
      }
    } catch (error) {
      console.error("Failed to load completed dishes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save completed dishes to storage
  const saveCompletedDishes = useCallback((dishes: CompletedDish[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dishes));
      setCompletedDishes(dishes);
    } catch (error) {
      console.error("Failed to save completed dishes:", error);
    }
  }, []);

  // Add a new completed dish
  const addCompletedDish = useCallback((dish: CompletedDish) => {
    setCompletedDishes((prev) => {
      const updated = [dish, ...prev];
      saveCompletedDishes(updated);
      return updated;
    });
  }, [saveCompletedDishes]);

  // Remove a completed dish
  const removeCompletedDish = useCallback((dishId: string) => {
    setCompletedDishes((prev) => {
      const updated = prev.filter((d) => d.id !== dishId);
      saveCompletedDishes(updated);
      return updated;
    });
  }, [saveCompletedDishes]);

  // Update a completed dish
  const updateCompletedDish = useCallback(
    (dishId: string, updates: Partial<CompletedDish>) => {
      setCompletedDishes((prev) => {
        const updated = prev.map((d) =>
          d.id === dishId ? { ...d, ...updates } : d
        );
        saveCompletedDishes(updated);
        return updated;
      });
    },
    [saveCompletedDishes]
  );

  // Store selected dishes for the designer
  const setSelectedDishes = useCallback((dishIds: string[]) => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(dishIds));
      setSelectedDishIds(dishIds);
    } catch {
      console.warn("Could not save selected dishes to session");
    }
  }, []);

  // Load selected dishes from session
  const loadSelectedDishes = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const dishIds = JSON.parse(stored) as string[];
        setSelectedDishIds(dishIds);
      }
    } catch {
      console.warn("Could not load selected dishes from session");
    }
  }, []);

  // Get selected dishes as full objects
  const getSelectedDishes = useCallback(() => {
    return completedDishes.filter((d) => selectedDishIds.includes(d.id));
  }, [completedDishes, selectedDishIds]);

  // Broadcast a completed dish for the Designer to pick up
  const broadcastDish = useCallback((dish: CompletedDish) => {
    try {
      // Send to localStorage for cross-tab communication
      const event = new CustomEvent("dishAssemblyDesignerBridge", {
        detail: { action: "dish-completed", dish },
      });
      window.dispatchEvent(event);

      // Also add to completed dishes
      addCompletedDish(dish);
    } catch (error) {
      console.error("Failed to broadcast dish:", error);
    }
  }, [addCompletedDish]);

  // Listen for dish broadcast events
  useEffect(() => {
    const handleDishEvent = (event: any) => {
      if (event.detail?.action === "dish-completed" && event.detail?.dish) {
        addCompletedDish(event.detail.dish);
      }
    };

    window.addEventListener("dishAssemblyDesignerBridge", handleDishEvent);
    return () =>
      window.removeEventListener("dishAssemblyDesignerBridge", handleDishEvent);
  }, [addCompletedDish]);

  // Load initial data
  useEffect(() => {
    loadCompletedDishes();
    loadSelectedDishes();
  }, [loadCompletedDishes, loadSelectedDishes]);

  return {
    completedDishes,
    selectedDishIds,
    isLoading,
    loadCompletedDishes,
    saveCompletedDishes,
    addCompletedDish,
    removeCompletedDish,
    updateCompletedDish,
    setSelectedDishes,
    getSelectedDishes,
    broadcastDish,
  };
}

export default useDesignerDishAssemblySync;
