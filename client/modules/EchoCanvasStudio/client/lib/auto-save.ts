/**
 * Auto-save utility — handles periodic saving of designs with debouncing.
 */
export interface DesignState {
  designId?: string;
  title: string;
  description?: string;
  layers: any[];
  canvas: { width: number; height: number };
  adjustments?: any;
  zoom: number;
  selectedLayer?: string;
  selectedTool?: string;
  foregroundColor?: string;
  backgroundColor?: string;
  timestamp?: number;
}

export interface SaveDesignResponse {
  success: boolean;
  designId: string;
  versionNumber: number;
  message: string;
}

class AutoSaveManager {
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private saveInProgress = false;
  private lastSavedState: string = "";
  private unsavedChanges = false;
  private lastSaveTime = 0;
  private saveInterval = 5000;           // 5s debounce
  private minTimeBetweenSaves = 2000;    // 2s minimum gap

  private hasChanged(state: DesignState): boolean {
    const currentState = JSON.stringify({
      title: state.title,
      description: state.description,
      layers: state.layers,
      canvas: state.canvas,
      adjustments: state.adjustments,
      zoom: state.zoom,
      selectedLayer: state.selectedLayer,
      foregroundColor: state.foregroundColor,
      backgroundColor: state.backgroundColor,
    });
    return currentState !== this.lastSavedState;
  }

  async saveDesign(
    state: DesignState,
    userId: string,
  ): Promise<SaveDesignResponse | null> {
    if (!userId) {
      console.warn("Cannot save: userId is missing");
      return null;
    }
    if (this.saveInProgress) return null;
    const timeSinceLastSave = Date.now() - this.lastSaveTime;
    if (timeSinceLastSave < this.minTimeBetweenSaves && state.designId) return null;

    this.saveInProgress = true;
    try {
      const savePayload = {
        designId: state.designId || undefined,
        title: state.title || "Untitled Design",
        description: state.description || "",
        data: {
          layers: state.layers,
          canvas: state.canvas,
          adjustments: state.adjustments,
          zoom: state.zoom,
          selectedLayer: state.selectedLayer,
          selectedTool: state.selectedTool,
          foregroundColor: state.foregroundColor,
          backgroundColor: state.backgroundColor,
        },
        userId,
      };
      const response = await fetch("/api/save-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savePayload),
      });
      if (!response.ok) {
        console.warn(`Save design returned ${response.status}, skipping`);
        return null;
      }
      let result: SaveDesignResponse;
      try {
        result = (await response.json()) as SaveDesignResponse;
      } catch (parseError) {
        console.error("Failed to parse save-design response:", parseError);
        return null;
      }
      if (!result.success) {
        console.error("Save design returned error:", result.message);
        return null;
      }
      this.lastSavedState = JSON.stringify(state);
      this.lastSaveTime = Date.now();
      this.unsavedChanges = false;
      return result;
    } catch (error) {
      console.error("Failed to save design:", error);
      return null;
    } finally {
      this.saveInProgress = false;
    }
  }

  async enableAutoSave(
    state: DesignState,
    userId: string,
  ): Promise<SaveDesignResponse | null> {
    this.unsavedChanges = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    return new Promise((resolve) => {
      this.saveTimer = setTimeout(async () => {
        if (this.hasChanged(state)) {
          const result = await this.saveDesign(state, userId);
          resolve(result);
        } else {
          resolve(null);
        }
      }, this.saveInterval);
    });
  }

  disableAutoSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  hasUnsavedChanges(): boolean {
    return this.unsavedChanges;
  }

  async forceSave(state: DesignState, userId: string): Promise<void> {
    this.disableAutoSave();
    await this.saveDesign(state, userId);
  }

  getUnsavedIndicator(): string {
    if (this.saveInProgress) return "Saving...";
    if (this.unsavedChanges) return "Unsaved changes";
    return "All changes saved";
  }
}

export const autoSaveManager = new AutoSaveManager();
