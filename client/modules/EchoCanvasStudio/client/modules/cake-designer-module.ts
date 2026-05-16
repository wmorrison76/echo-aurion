/**
 * Cake Designer Module for EchoRecipePro
 * 
 * This module provides integration between Cake Designer and EchoRecipePro
 * It handles recipe storage, cake design persistence, and gallery management
 */

export interface CakeDesignExport {
  id: string;
  beoNumber?: string;
  occasion: string;
  eventDate?: string;
  guestCount: number;
  tiers: Array<{ diameter?: number; height: number }>;
  shape: "round" | "square" | "sheet";
  flavors: string[];
  frostings: string[];
  fillings: string[];
  decorations: string[];
  designComplexity: "simple" | "moderate" | "intricate";
  themeNotes: string;
  generatedPrompt?: string;
  generatedImageUrl?: string;
  pedestal?: string;
  basePrice?: number;
  decorationPrice?: number;
  pedestalPrice?: number;
  deliveryPrice?: number;
  totalPrice?: number;
  contactPhone?: string;
  contactEmail?: string;
  deliveryAddress?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface CakeGalleryItem {
  id: string;
  designId: string;
  imageUrl: string;
  imageType: "ai-generated" | "actual-photo";
  uploadedAt: string;
  notes?: string;
}

/**
 * Cake Designer Module - Main export for EchoRecipePro
 */
export class CakeDesignerModule {
  private designs: Map<string, CakeDesignExport> = new Map();
  private gallery: Map<string, CakeGalleryItem[]> = new Map();

  constructor(private storageKey: string = "cake-designs") {
    this.loadFromStorage();
  }

  /**
   * Save a cake design
   */
  saveDesign(design: CakeDesignExport): void {
    const id = design.id || `design-${Date.now()}`;
    const designWithId = { ...design, id };
    this.designs.set(id, designWithId);
    this.saveToStorage();
  }

  /**
   * Load a cake design by ID
   */
  getDesign(id: string): CakeDesignExport | null {
    return this.designs.get(id) || null;
  }

  /**
   * Get all saved designs
   */
  getAllDesigns(): CakeDesignExport[] {
    return Array.from(this.designs.values());
  }

  /**
   * Delete a design
   */
  deleteDesign(id: string): void {
    this.designs.delete(id);
    this.gallery.delete(id);
    this.saveToStorage();
  }

  /**
   * Add image to gallery
   */
  addToGallery(
    designId: string,
    imageUrl: string,
    imageType: "ai-generated" | "actual-photo",
    notes?: string
  ): void {
    const galleryItem: CakeGalleryItem = {
      id: `gallery-${Date.now()}`,
      designId,
      imageUrl,
      imageType,
      uploadedAt: new Date().toISOString(),
      notes,
    };

    if (!this.gallery.has(designId)) {
      this.gallery.set(designId, []);
    }

    this.gallery.get(designId)!.push(galleryItem);
    this.saveToStorage();
  }

  /**
   * Get gallery for a design
   */
  getGallery(designId: string): CakeGalleryItem[] {
    return this.gallery.get(designId) || [];
  }

  /**
   * Get all gallery images
   */
  getAllGallery(): CakeGalleryItem[] {
    const allItems: CakeGalleryItem[] = [];
    this.gallery.forEach((items) => allItems.push(...items));
    return allItems;
  }

  /**
   * Export design as JSON for PDF generation
   */
  exportForPDF(designId: string): CakeDesignExport | null {
    return this.getDesign(designId);
  }

  /**
   * Link with EchoRecipePro recipe
   */
  linkRecipe(designId: string, recipeId: string, metadata?: Record<string, any>): void {
    const design = this.designs.get(designId);
    if (design) {
      design.metadata = { ...design.metadata, recipeId, linkedAt: new Date().toISOString() };
      if (metadata) {
        design.metadata = { ...design.metadata, ...metadata };
      }
      this.saveToStorage();
    }
  }

  /**
   * Get recipes linked to design
   */
  getLinkedRecipes(designId: string): Record<string, any> | null {
    const design = this.designs.get(designId);
    return design?.metadata?.recipeId ? design.metadata : null;
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    const data = {
      designs: Array.from(this.designs.entries()),
      gallery: Array.from(this.gallery.entries()),
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.designs = new Map(parsed.designs || []);
        this.gallery = new Map(parsed.gallery || []);
      }
    } catch (error) {
      console.error("Failed to load designs from storage:", error);
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.designs.clear();
    this.gallery.clear();
    localStorage.removeItem(this.storageKey);
  }
}

/**
 * Singleton instance for global access
 */
let moduleInstance: CakeDesignerModule | null = null;

export function getCakeDesignerModule(): CakeDesignerModule {
  if (!moduleInstance) {
    moduleInstance = new CakeDesignerModule("echo-cake-designer");
  }
  return moduleInstance;
}

/**
 * Reset module (for testing)
 */
export function resetCakeDesignerModule(): void {
  moduleInstance = null;
}
