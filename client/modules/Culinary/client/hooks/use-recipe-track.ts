import { useState, useEffect, useCallback } from "react";

export type RecipeTrack = "fine-dining" | "manufacturing";

interface ChefTrackPreference {
  chefId: string;
  track: RecipeTrack;
  showAdvanced: boolean;
  collaborators: string[];
  updatedAt: number;
}

const STORAGE_KEY = "echo_recipe_track_preference";

/**
 * Hook for managing chef's track preference
 * Fine dining is default, manufacturing is in advanced options
 */
export function useRecipeTrack(chefId: string) {
  const [track, setTrack] = useState<RecipeTrack>("fine-dining");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const preference = JSON.parse(stored) as ChefTrackPreference;
        if (preference.chefId === chefId) {
          setTrack(preference.track);
          setShowAdvanced(preference.showAdvanced);
          setCollaborators(preference.collaborators || []);
        }
      } catch (error) {
        console.error("Error loading track preference:", error);
      }
    }
    setIsLoading(false);
  }, [chefId]);

  // Save preference to localStorage
  const savePreference = useCallback(
    (newTrack: RecipeTrack) => {
      const preference: ChefTrackPreference = {
        chefId,
        track: newTrack,
        showAdvanced,
        collaborators,
        updatedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
      setTrack(newTrack);
    },
    [chefId, showAdvanced, collaborators],
  );

  // Switch track
  const switchTrack = useCallback(
    (newTrack: RecipeTrack) => {
      savePreference(newTrack);
    },
    [savePreference],
  );

  // Toggle advanced options
  const toggleAdvanced = useCallback(() => {
    const newAdvanced = !showAdvanced;
    setShowAdvanced(newAdvanced);
    const preference: ChefTrackPreference = {
      chefId,
      track,
      showAdvanced: newAdvanced,
      collaborators,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  }, [chefId, track, showAdvanced, collaborators]);

  // Add collaborator
  const addCollaborator = useCallback(
    (collaboratorId: string) => {
      setCollaborators((prev) => {
        if (prev.includes(collaboratorId)) return prev;
        const newCollaborators = [...prev, collaboratorId];
        const preference: ChefTrackPreference = {
          chefId,
          track,
          showAdvanced,
          collaborators: newCollaborators,
          updatedAt: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
        return newCollaborators;
      });
    },
    [chefId, track, showAdvanced],
  );

  // Remove collaborator
  const removeCollaborator = useCallback(
    (collaboratorId: string) => {
      setCollaborators((prev) => {
        const newCollaborators = prev.filter((id) => id !== collaboratorId);
        const preference: ChefTrackPreference = {
          chefId,
          track,
          showAdvanced,
          collaborators: newCollaborators,
          updatedAt: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
        return newCollaborators;
      });
    },
    [chefId, track, showAdvanced],
  );

  return {
    track,
    showAdvanced,
    collaborators,
    isLoading,
    switchTrack,
    toggleAdvanced,
    addCollaborator,
    removeCollaborator,
  };
}

/**
 * Get track display name
 */
export function getTrackDisplayName(track: RecipeTrack): string {
  return track === "fine-dining"
    ? "Fine Dining Innovation"
    : "Manufacturing Excellence";
}

/**
 * Get track description
 */
export function getTrackDescription(track: RecipeTrack): string {
  return track === "fine-dining"
    ? "Develop ultra-premium culinary creations with molecular gastronomy techniques"
    : "Optimize recipes for consistency, scalability, and shelf-life at scale";
}
