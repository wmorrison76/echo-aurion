import { CanvasState } from "./types";
import { v4 as uuidv4 } from "uuid";

export interface CanvasVersion {
  id: string;
  timestamp: number;
  label: string;
  canvasState: CanvasState;
  changesSummary: string;
  author?: string;
  isAutoSave: boolean;
}

/**
 * Summarize changes between two canvas states
 */
export const summarizeChanges = (
  prevState: CanvasState | null,
  nextState: CanvasState,
): string => {
  if (!prevState) {
    return "Initial state";
  }

  const changes: string[] = [];
  const maxChanges = 3;

  // Count additions
  const shapesAdded = nextState.shapes.length - prevState.shapes.length;
  if (shapesAdded > 0) {
    changes.push(`Added ${shapesAdded} shape${shapesAdded > 1 ? "s" : ""}`);
  }

  const textsAdded = nextState.texts.length - prevState.texts.length;
  if (textsAdded > 0) {
    changes.push(`Added ${textsAdded} text${textsAdded > 1 ? "s" : ""}`);
  }

  const stickiesAdded =
    nextState.stickyNotes.length - prevState.stickyNotes.length;
  if (stickiesAdded > 0) {
    changes.push(`Added ${stickiesAdded} note${stickiesAdded > 1 ? "s" : ""}`);
  }

  // Count deletions
  const shapesRemoved = prevState.shapes.length - nextState.shapes.length;
  if (shapesRemoved > 0) {
    changes.push(
      `Removed ${shapesRemoved} shape${shapesRemoved > 1 ? "s" : ""}`,
    );
  }

  const textsRemoved = prevState.texts.length - nextState.texts.length;
  if (textsRemoved > 0) {
    changes.push(`Removed ${textsRemoved} text${textsRemoved > 1 ? "s" : ""}`);
  }

  // Check for document changes
  const docsAdded =
    (nextState.documents?.length || 0) - (prevState.documents?.length || 0);
  if (docsAdded > 0) {
    changes.push(`Added ${docsAdded} document${docsAdded > 1 ? "s" : ""}`);
  }

  const imagesAdded =
    (nextState.images?.length || 0) - (prevState.images?.length || 0);
  if (imagesAdded > 0) {
    changes.push(`Added ${imagesAdded} image${imagesAdded > 1 ? "s" : ""}`);
  }

  // Viewport changes
  if (prevState.zoomLevel !== nextState.zoomLevel) {
    changes.push("Zoomed");
  }

  if (changes.length === 0) {
    return "No significant changes";
  }

  if (changes.length <= maxChanges) {
    return changes.join(", ");
  }

  return `${changes.slice(0, maxChanges).join(", ")} and more`;
};

/**
 * Create a new version from canvas state
 */
export const createVersion = (
  canvasState: CanvasState,
  prevState: CanvasState | null,
  author?: string,
  isAutoSave = false,
  label?: string,
): CanvasVersion => {
  const changesSummary = summarizeChanges(prevState, canvasState);

  return {
    id: uuidv4(),
    timestamp: Date.now(),
    label:
      label ||
      (isAutoSave
        ? `Auto-save at ${new Date().toLocaleTimeString()}`
        : `Manual save at ${new Date().toLocaleTimeString()}`),
    canvasState: {
      ...canvasState,
    },
    changesSummary,
    author,
    isAutoSave,
  };
};

/**
 * Manage version history with size limits
 */
export class VersionHistoryManager {
  private versions: CanvasVersion[] = [];
  private maxVersions: number = 100;
  private maxAutoSaveVersions: number = 20;

  constructor(maxVersions = 100, maxAutoSaveVersions = 20) {
    this.maxVersions = maxVersions;
    this.maxAutoSaveVersions = maxAutoSaveVersions;
  }

  /**
   * Add a new version to history
   */
  addVersion(version: CanvasVersion): void {
    this.versions.unshift(version);

    // Trim auto-save versions
    const autoSaves = this.versions.filter((v) => v.isAutoSave);
    if (autoSaves.length > this.maxAutoSaveVersions) {
      const excessAutoSaves = autoSaves.slice(this.maxAutoSaveVersions);
      excessAutoSaves.forEach((v) => {
        const index = this.versions.indexOf(v);
        if (index > -1) {
          this.versions.splice(index, 1);
        }
      });
    }

    // Trim total versions
    if (this.versions.length > this.maxVersions) {
      this.versions = this.versions.slice(0, this.maxVersions);
    }
  }

  /**
   * Get all versions
   */
  getVersions(): CanvasVersion[] {
    return [...this.versions];
  }

  /**
   * Get version by ID
   */
  getVersion(id: string): CanvasVersion | undefined {
    return this.versions.find((v) => v.id === id);
  }

  /**
   * Get versions from a specific time range
   */
  getVersionsInRange(startTime: number, endTime: number): CanvasVersion[] {
    return this.versions.filter(
      (v) => v.timestamp >= startTime && v.timestamp <= endTime,
    );
  }

  /**
   * Delete a version by ID
   */
  deleteVersion(id: string): boolean {
    const index = this.versions.findIndex((v) => v.id === id);
    if (index > -1) {
      this.versions.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all versions
   */
  clearVersions(): void {
    this.versions = [];
  }

  /**
   * Get the number of versions
   */
  getVersionCount(): number {
    return this.versions.length;
  }

  /**
   * Get storage size estimate (approximate)
   */
  getStorageSizeEstimate(): number {
    return this.versions.reduce((size, version) => {
      return (
        size + JSON.stringify(version.canvasState).length + 100 // Overhead for metadata
      );
    }, 0);
  }

  /**
   * Export versions to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.versions, null, 2);
  }

  /**
   * Import versions from JSON
   */
  importFromJSON(json: string): boolean {
    try {
      const imported = JSON.parse(json) as CanvasVersion[];
      if (Array.isArray(imported)) {
        this.versions = imported;
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to import versions:", error);
      return false;
    }
  }

  /**
   * Create a diff between two versions
   */
  createDiff(versionId1: string, versionId2: string): VersionDiff | null {
    const v1 = this.getVersion(versionId1);
    const v2 = this.getVersion(versionId2);

    if (!v1 || !v2) return null;

    return {
      fromVersion: v1.id,
      toVersion: v2.id,
      timestamp: Date.now(),
      changes: {
        shapesAdded: v2.canvasState.shapes.filter(
          (s) => !v1.canvasState.shapes.find((s2) => s2.id === s.id),
        ),
        shapesRemoved: v1.canvasState.shapes.filter(
          (s) => !v2.canvasState.shapes.find((s2) => s2.id === s.id),
        ),
        shapesModified: v2.canvasState.shapes.filter((s) => {
          const original = v1.canvasState.shapes.find((s2) => s2.id === s.id);
          return original && JSON.stringify(original) !== JSON.stringify(s);
        }),
        textsAdded: v2.canvasState.texts.filter(
          (t) => !v1.canvasState.texts.find((t2) => t2.id === t.id),
        ),
        textsRemoved: v1.canvasState.texts.filter(
          (t) => !v2.canvasState.texts.find((t2) => t2.id === t.id),
        ),
        textsModified: v2.canvasState.texts.filter((t) => {
          const original = v1.canvasState.texts.find((t2) => t2.id === t.id);
          return original && JSON.stringify(original) !== JSON.stringify(t);
        }),
      },
    };
  }
}

export interface VersionDiff {
  fromVersion: string;
  toVersion: string;
  timestamp: number;
  changes: {
    shapesAdded: any[];
    shapesRemoved: any[];
    shapesModified: any[];
    textsAdded: any[];
    textsRemoved: any[];
    textsModified: any[];
  };
}

/**
 * Global version history manager instance
 */
let globalManager: VersionHistoryManager | null = null;

export const getGlobalVersionManager = (): VersionHistoryManager => {
  if (!globalManager) {
    globalManager = new VersionHistoryManager();
  }
  return globalManager;
};

export const resetGlobalVersionManager = (): void => {
  globalManager = null;
};
