import { nanoid } from "nanoid";

export interface AIAsset {
  id: string;
  name: string;
  type:
    | "icon"
    | "illustration"
    | "pattern"
    | "component"
    | "color-palette"
    | "typography";
  description: string;
  tags: string[];
  url?: string;
  svgData?: string;
  colorPalette?: string[];
  usage: number;
  created: Date;
  modified: Date;
  favorite: boolean;
  metadata?: Record<string, any>;
}

export interface GenerationRequest {
  prompt: string;
  type:
    | "icon"
    | "illustration"
    | "pattern"
    | "component"
    | "color-palette"
    | "typography";
  style?: "minimalist" | "flat" | "realistic" | "cartoon" | "sketch";
  size?: number;
  colorScheme?: string[];
}

export interface GenerationResult {
  asset: AIAsset;
  suggestions: AIAsset[];
  metadata: {
    model: string;
    generatedAt: Date;
    tokens: number;
  };
}

class AIAssetLabService {
  private assets: AIAsset[] = [];
  private favorites: string[] = [];
  private recentSearches: string[] = [];
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  // Asset Generation
  async generateAsset(request: GenerationRequest): Promise<GenerationResult> {
    try {
      const response = await fetch("/api/figma/ai-asset-lab/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) throw new Error("Generation failed");
      const result = await response.json();

      const asset: AIAsset = {
        id: nanoid(),
        name: request.prompt.slice(0, 50),
        type: request.type,
        description: request.prompt,
        tags: this.extractTags(request.prompt),
        svgData: result.svgData,
        url: result.url,
        colorPalette: result.colorPalette,
        usage: 0,
        created: new Date(),
        modified: new Date(),
        favorite: false,
        metadata: result.metadata,
      };

      this.assets.push(asset);
      this.recentSearches.unshift(request.prompt);
      this.saveToStorage();
      this.emit("assetGenerated", asset);

      return {
        asset,
        suggestions: this.generateSuggestions(asset),
        metadata: {
          model: "gpt-4-vision",
          generatedAt: new Date(),
          tokens: result.tokensUsed || 0,
        },
      };
    } catch (error) {
      console.error("Asset generation error:", error);
      throw error;
    }
  }

  // Asset Management
  getAssets(filters?: {
    type?: string;
    tags?: string[];
    search?: string;
  }): AIAsset[] {
    let results = [...this.assets];

    if (filters?.type) {
      results = results.filter((a) => a.type === filters.type);
    }

    if (filters?.tags && filters.tags.length > 0) {
      results = results.filter((a) =>
        filters.tags!.some((t) => a.tags.includes(t)),
      );
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      results = results.filter(
        (a) =>
          a.name.toLowerCase().includes(search) ||
          a.description.toLowerCase().includes(search) ||
          a.tags.some((t) => t.toLowerCase().includes(search)),
      );
    }

    return results;
  }

  getAssetById(id: string): AIAsset | undefined {
    return this.assets.find((a) => a.id === id);
  }

  updateAsset(id: string, updates: Partial<AIAsset>): void {
    const asset = this.getAssetById(id);
    if (asset) {
      Object.assign(asset, updates, { modified: new Date() });
      this.saveToStorage();
      this.emit("assetUpdated", asset);
    }
  }

  deleteAsset(id: string): void {
    this.assets = this.assets.filter((a) => a.id !== id);
    this.favorites = this.favorites.filter((f) => f !== id);
    this.saveToStorage();
    this.emit("assetDeleted", id);
  }

  // Favorites
  toggleFavorite(id: string): void {
    const asset = this.getAssetById(id);
    if (asset) {
      asset.favorite = !asset.favorite;
      if (asset.favorite) {
        this.favorites.push(id);
      } else {
        this.favorites = this.favorites.filter((f) => f !== id);
      }
      this.saveToStorage();
      this.emit("favoriteToggled", { id, favorite: asset.favorite });
    }
  }

  getFavorites(): AIAsset[] {
    return this.assets.filter((a) => a.favorite);
  }

  // Search & Discovery
  search(query: string): AIAsset[] {
    return this.getAssets({ search: query });
  }

  searchByTags(tags: string[]): AIAsset[] {
    return this.getAssets({ tags });
  }

  getRecentSearches(): string[] {
    return this.recentSearches.slice(0, 10);
  }

  clearRecentSearches(): void {
    this.recentSearches = [];
    this.saveToStorage();
  }

  // Color Palette Management
  extractColorPalette(asset: AIAsset): string[] {
    return asset.colorPalette || [];
  }

  suggestColorVariants(colors: string[], count: number = 5): string[] {
    // This would use color theory to suggest variants
    return colors.slice(0, count);
  }

  // Suggestions & Discovery
  private generateSuggestions(asset: AIAsset): AIAsset[] {
    // Find similar assets based on tags and type
    const related = this.assets
      .filter((a) => a.id !== asset.id && a.type === asset.type)
      .filter((a) => a.tags.some((t) => asset.tags.includes(t)))
      .slice(0, 3);

    return related;
  }

  getSuggestedAssets(type?: string): AIAsset[] {
    const filtered = type
      ? this.assets.filter((a) => a.type === type)
      : this.assets;
    return filtered
      .sort((a, b) => {
        // Sort by: favorite, then usage, then recent
        if (a.favorite !== b.favorite) return b.favorite ? 1 : -1;
        if (a.usage !== b.usage) return b.usage - a.usage;
        return b.modified.getTime() - a.modified.getTime();
      })
      .slice(0, 10);
  }

  // Statistics
  getStats() {
    const types = new Map<string, number>();
    const tags = new Map<string, number>();
    let totalUsage = 0;

    this.assets.forEach((asset) => {
      types.set(asset.type, (types.get(asset.type) || 0) + 1);
      asset.tags.forEach((tag) => {
        tags.set(tag, (tags.get(tag) || 0) + 1);
      });
      totalUsage += asset.usage;
    });

    return {
      total: this.assets.length,
      byType: Object.fromEntries(types),
      byTag: Object.fromEntries(tags),
      totalUsage,
      favorites: this.favorites.length,
    };
  }

  // Batch Operations
  async generateVariants(
    assetId: string,
    count: number = 3,
  ): Promise<AIAsset[]> {
    const asset = this.getAssetById(assetId);
    if (!asset) return [];

    const variants: AIAsset[] = [];
    for (let i = 0; i < count; i++) {
      try {
        const result = await this.generateAsset({
          prompt: `${asset.description} - variant ${i + 1}`,
          type: asset.type,
          style: undefined,
          colorScheme: asset.colorPalette,
        });
        variants.push(result.asset);
      } catch (error) {
        console.error(`Failed to generate variant ${i}:`, error);
      }
    }

    return variants;
  }

  // Import/Export
  exportAssets(): string {
    return JSON.stringify(
      {
        assets: this.assets,
        favorites: this.favorites,
        exported: new Date(),
      },
      null,
      2,
    );
  }

  importAssets(json: string): number {
    try {
      const data = JSON.parse(json);
      const newAssets = data.assets || [];
      this.assets.push(...newAssets);
      if (data.favorites) {
        this.favorites = data.favorites;
      }
      this.saveToStorage();
      this.emit("assetsImported", newAssets.length);
      return newAssets.length;
    } catch (error) {
      throw new Error("Invalid import format");
    }
  }

  // Tagging
  private extractTags(text: string): string[] {
    // Simple tag extraction - could be improved with NLP
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
    ]);
    return words.filter((w) => w.length > 3 && !stopWords.has(w)).slice(0, 5);
  }

  getAllTags(): string[] {
    const tags = new Set<string>();
    this.assets.forEach((asset) => {
      asset.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  // Storage
  private saveToStorage(): void {
    localStorage.setItem("ai-assets", JSON.stringify(this.assets));
    localStorage.setItem("ai-favorites", JSON.stringify(this.favorites));
    localStorage.setItem(
      "ai-recent-searches",
      JSON.stringify(this.recentSearches),
    );
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem("ai-assets");
      if (stored) {
        this.assets = JSON.parse(stored).map((a: any) => ({
          ...a,
          created: new Date(a.created),
          modified: new Date(a.modified),
        }));
      }

      const favorites = localStorage.getItem("ai-favorites");
      if (favorites) {
        this.favorites = JSON.parse(favorites);
      }

      const searches = localStorage.getItem("ai-recent-searches");
      if (searches) {
        this.recentSearches = JSON.parse(searches);
      }
    } catch (error) {
      console.error("Failed to load assets from storage:", error);
    }
  }

  // Event Listeners
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }
}

export const aiAssetLab = new AIAssetLabService();
