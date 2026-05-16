// Figma Workspace Service - Manages user's Figma workspace files and assets

interface WorkspaceFile {
  id: string;
  figmaFileKey: string;
  name: string;
  thumbnail: string;
  lastModified: number;
  status: "synced" | "syncing" | "error";
  data?: any;
  components: string[];
  assets: string[];
}

interface WorkspaceAsset {
  id: string;
  name: string;
  type: "COMPONENT" | "COMPONENT_SET" | "IMAGE" | "STYLE";
  thumbnail?: string;
  fileId: string;
  figmaKey: string;
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

const FILES_STORAGE_KEY = "figma.workspace.files.v1";
const ASSETS_STORAGE_KEY = "figma.workspace.assets.v1";

class FigmaWorkspaceService {
  /**
   * Add file to workspace
   */
  addFile(file: Omit<WorkspaceFile, "id">): WorkspaceFile {
    const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const workspaceFile: WorkspaceFile = {
      ...file,
      id,
      components: [],
      assets: [],
    };

    const files = this.getFiles();
    files.push(workspaceFile);
    this.saveFiles(files);

    return workspaceFile;
  }

  /**
   * Get all workspace files
   */
  getFiles(): WorkspaceFile[] {
    const stored = localStorage.getItem(FILES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Get specific file
   */
  getFile(id: string): WorkspaceFile | null {
    const files = this.getFiles();
    return files.find((f) => f.id === id) || null;
  }

  /**
   * Update file
   */
  updateFile(id: string, updates: Partial<WorkspaceFile>) {
    const files = this.getFiles();
    const index = files.findIndex((f) => f.id === id);
    if (index >= 0) {
      files[index] = { ...files[index], ...updates };
      this.saveFiles(files);
      return files[index];
    }
    return null;
  }

  /**
   * Delete file from workspace
   */
  deleteFile(id: string) {
    const files = this.getFiles().filter((f) => f.id !== id);
    this.saveFiles(files);

    // Also delete associated assets
    const assets = this.getAssets().filter((a) => a.fileId !== id);
    this.saveAssets(assets);
  }

  /**
   * Add asset to workspace
   */
  addAsset(
    asset: Omit<WorkspaceAsset, "id" | "createdAt" | "updatedAt">,
  ): WorkspaceAsset {
    const id = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const workspaceAsset: WorkspaceAsset = {
      ...asset,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const assets = this.getAssets();
    assets.push(workspaceAsset);
    this.saveAssets(assets);

    // Update file's asset references
    const file = this.getFile(asset.fileId);
    if (file && !file.assets.includes(id)) {
      this.updateFile(asset.fileId, {
        assets: [...file.assets, id],
      });
    }

    return workspaceAsset;
  }

  /**
   * Get all workspace assets
   */
  getAssets(): WorkspaceAsset[] {
    const stored = localStorage.getItem(ASSETS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Get assets by file
   */
  getAssetsByFile(fileId: string): WorkspaceAsset[] {
    return this.getAssets().filter((a) => a.fileId === fileId);
  }

  /**
   * Get assets by type
   */
  getAssetsByType(type: WorkspaceAsset["type"]): WorkspaceAsset[] {
    return this.getAssets().filter((a) => a.type === type);
  }

  /**
   * Get specific asset
   */
  getAsset(id: string): WorkspaceAsset | null {
    return this.getAssets().find((a) => a.id === id) || null;
  }

  /**
   * Update asset
   */
  updateAsset(id: string, updates: Partial<WorkspaceAsset>) {
    const assets = this.getAssets();
    const index = assets.findIndex((a) => a.id === id);
    if (index >= 0) {
      assets[index] = { ...assets[index], ...updates, updatedAt: Date.now() };
      this.saveAssets(assets);
      return assets[index];
    }
    return null;
  }

  /**
   * Delete asset
   */
  deleteAsset(id: string) {
    const assets = this.getAssets().filter((a) => a.id !== id);
    this.saveAssets(assets);
  }

  /**
   * Search assets
   */
  searchAssets(query: string): WorkspaceAsset[] {
    const q = query.toLowerCase();
    return this.getAssets().filter((a) => a.name.toLowerCase().includes(q));
  }

  /**
   * Export workspace as JSON
   */
  exportWorkspace(): { files: WorkspaceFile[]; assets: WorkspaceAsset[] } {
    return {
      files: this.getFiles(),
      assets: this.getAssets(),
    };
  }

  /**
   * Import workspace from JSON
   */
  importWorkspace(data: { files: WorkspaceFile[]; assets: WorkspaceAsset[] }) {
    this.saveFiles(data.files || []);
    this.saveAssets(data.assets || []);
  }

  /**
   * Clear entire workspace
   */
  clearWorkspace() {
    localStorage.removeItem(FILES_STORAGE_KEY);
    localStorage.removeItem(ASSETS_STORAGE_KEY);
  }

  /**
   * Get workspace statistics
   */
  getStats() {
    const files = this.getFiles();
    const assets = this.getAssets();

    return {
      totalFiles: files.length,
      totalAssets: assets.length,
      componentCount: assets.filter((a) => a.type === "COMPONENT").length,
      componentSetCount: assets.filter((a) => a.type === "COMPONENT_SET")
        .length,
      imageCount: assets.filter((a) => a.type === "IMAGE").length,
      styleCount: assets.filter((a) => a.type === "STYLE").length,
      lastModified: Math.max(
        ...files.map((f) => f.lastModified),
        ...assets.map((a) => a.updatedAt),
        0,
      ),
    };
  }

  /**
   * Save files to localStorage
   */
  private saveFiles(files: WorkspaceFile[]) {
    localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(files));
  }

  /**
   * Save assets to localStorage
   */
  private saveAssets(assets: WorkspaceAsset[]) {
    localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(assets));
  }
}

export const figmaWorkspaceService = new FigmaWorkspaceService();
export type { WorkspaceFile, WorkspaceAsset };
