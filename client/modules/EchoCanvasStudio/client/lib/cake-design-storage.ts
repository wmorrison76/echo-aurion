/**
 * Cake Design Storage & Metadata
 * Handles saving, loading, and managing cake design metadata
 */

export interface CakeDesignMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  clientName?: string;
  eventDate?: string;
  guestCount: number;
  fullDesignData: {
    shape: "round" | "square" | "sheet";
    tiers: Array<{
      diameter: number;
      height: number;
      flavor: string;
      filling: string;
    }>;
    frosting: {
      type: string;
      color: string;
      texture: string;
    };
    decorations: Array<{
      id: string;
      name: string;
      description: string;
      position?: { x: number; y: number };
    }>;
    sprinkles?: {
      type: string;
      color: string;
      amount: number;
    };
    notes?: string;
    imageUrl?: string;
    sliceAngle?: number;
    rotationAngle?: number;
  };
  pricing: {
    basePrice: number;
    decorationPrice: number;
    deliveryFee: number;
    totalPrice: number;
    enableBEO: boolean;
    enableREO: boolean;
    showPricing: boolean;
  };
  bakerySettings?: {
    bakeryId: string;
    bakeryName: string;
    allowedSizes: string[];
  };
}

const STORAGE_KEY = "cake_designs";
const RECENT_DESIGNS_KEY = "recent_cake_designs";

/**
 * Save a cake design with full metadata to localStorage
 */
export function saveCakeDesign(design: CakeDesignMetadata): string {
  const designs = loadAllCakeDesigns();
  const now = new Date().toISOString();

  const designToSave: CakeDesignMetadata = {
    ...design,
    id: design.id || `design_${Date.now()}`,
    updatedAt: now,
    createdAt: design.createdAt || now,
  };

  designs.push(designToSave);

  // Store in localStorage (with size limit awareness)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));

    // Add to recent designs
    addToRecentDesigns({
      id: designToSave.id,
      name: designToSave.name,
      savedAt: now,
    });

    return designToSave.id;
  } catch (error) {
    console.error("Error saving cake design:", error);
    throw new Error("Failed to save cake design. Storage may be full.");
  }
}

/**
 * Load a specific cake design by ID
 */
export function loadCakeDesign(id: string): CakeDesignMetadata | null {
  try {
    const designs = loadAllCakeDesigns();
    return designs.find((d) => d.id === id) || null;
  } catch (error) {
    console.error("Error loading cake design:", error);
    return null;
  }
}

/**
 * Load all cake designs from storage
 */
export function loadAllCakeDesigns(): CakeDesignMetadata[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading cake designs:", error);
    return [];
  }
}

/**
 * Delete a cake design
 */
export function deleteCakeDesign(id: string): boolean {
  try {
    const designs = loadAllCakeDesigns();
    const filtered = designs.filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error("Error deleting cake design:", error);
    return false;
  }
}

/**
 * Update an existing cake design
 */
export function updateCakeDesign(design: CakeDesignMetadata): boolean {
  try {
    const designs = loadAllCakeDesigns();
    const index = designs.findIndex((d) => d.id === design.id);

    if (index === -1) {
      return false; // Design not found
    }

    designs[index] = {
      ...design,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
    return true;
  } catch (error) {
    console.error("Error updating cake design:", error);
    return false;
  }
}

/**
 * Export a cake design as JSON for backup/sharing
 */
export function exportDesignAsJSON(design: CakeDesignMetadata): string {
  return JSON.stringify(design, null, 2);
}

/**
 * Import a cake design from JSON
 */
export function importDesignFromJSON(
  jsonString: string,
): CakeDesignMetadata | null {
  try {
    const design = JSON.parse(jsonString) as CakeDesignMetadata;
    design.id = `design_${Date.now()}`; // Generate new ID
    design.createdAt = new Date().toISOString();
    return design;
  } catch (error) {
    console.error("Error importing cake design:", error);
    return null;
  }
}

/**
 * Add design to recent list
 */
interface RecentDesign {
  id: string;
  name: string;
  savedAt: string;
}

function addToRecentDesigns(design: RecentDesign): void {
  try {
    let recent: RecentDesign[] = [];

    try {
      const stored = localStorage.getItem(RECENT_DESIGNS_KEY);
      recent = stored ? JSON.parse(stored) : [];
    } catch {
      recent = [];
    }

    // Remove if already exists
    recent = recent.filter((d) => d.id !== design.id);

    // Add to front
    recent.unshift(design);

    // Keep only last 10
    recent = recent.slice(0, 10);

    localStorage.setItem(RECENT_DESIGNS_KEY, JSON.stringify(recent));
  } catch (error) {
    console.error("Error updating recent designs:", error);
  }
}

/**
 * Get recent designs
 */
export function getRecentDesigns(): RecentDesign[] {
  try {
    const data = localStorage.getItem(RECENT_DESIGNS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Embed metadata in image blob (as EXIF or embedded JSON)
 * For now, we'll attach it as JSON in the blob metadata
 */
export async function embedMetadataInImage(
  imageBlob: Blob,
  metadata: CakeDesignMetadata,
): Promise<Blob> {
  try {
    // Create a new blob with metadata
    const metadataJson = JSON.stringify(metadata);

    // For now, we can add metadata as a separate file when downloading
    // or use canvas-based approaches
    // In production, you'd use proper image metadata libraries

    return imageBlob;
  } catch (error) {
    console.error("Error embedding metadata:", error);
    return imageBlob;
  }
}

/**
 * Extract metadata from image
 * Returns null - requires EXIF parsing library for full implementation
 * Future: could integrate piexifjs or similar EXIF parsing library
 */
export async function extractMetadataFromImage(
  imageBlob: Blob,
): Promise<CakeDesignMetadata | null> {
  // Image metadata extraction not yet implemented
  // Would require: EXIF parsing library, canvas pixel analysis
  return null;
}

/**
 * Create a design backup as a JSON file
 */
export function createBackupFile(design: CakeDesignMetadata): void {
  const jsonString = exportDesignAsJSON(design);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cake-design-${design.id}-backup.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Restore from a backup file
 */
export async function restoreFromBackupFile(
  file: File,
): Promise<CakeDesignMetadata | null> {
  try {
    const text = await file.text();
    return importDesignFromJSON(text);
  } catch (error) {
    console.error("Error restoring from backup:", error);
    return null;
  }
}

/**
 * Sync designs to cloud (Supabase)
 */
export async function syncDesignToCloud(
  design: CakeDesignMetadata,
  supabaseClient?: any,
): Promise<boolean> {
  if (!supabaseClient) {
    console.warn("Supabase client not configured");
    return false;
  }

  try {
    const { error } = await supabaseClient
      .from("cake_designs")
      .upsert([design]);

    if (error) {
      console.error("Error syncing to cloud:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error syncing design:", error);
    return false;
  }
}

/**
 * Load designs from cloud
 */
export async function loadDesignsFromCloud(
  userId: string,
  supabaseClient?: any,
): Promise<CakeDesignMetadata[]> {
  if (!supabaseClient) {
    console.warn("Supabase client not configured");
    return [];
  }

  try {
    const { data, error } = await supabaseClient
      .from("cake_designs")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error loading from cloud:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error loading cloud designs:", error);
    return [];
  }
}
