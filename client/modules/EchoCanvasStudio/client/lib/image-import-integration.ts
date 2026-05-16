/**
 * Image Import Integration
 * Enables seamless image transfer from EchoCanva to Cake Builder
 */

export interface ImportedImage {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  fileName: string;
  importedAt: string;
  source: "echocanva" | "upload" | "url";
  metadata?: {
    designName?: string;
    layers?: any[];
  };
}

const IMPORTED_IMAGES_KEY = "echocanva_imported_images";

/**
 * Store an image imported from EchoCanva
 */
export function storeEchoCanvaImage(
  dataUrl: string,
  width: number,
  height: number,
  metadata?: any,
): ImportedImage {
  const image: ImportedImage = {
    id: `img_${Date.now()}`,
    dataUrl,
    width,
    height,
    fileName: `echocanva-image-${Date.now()}.png`,
    importedAt: new Date().toISOString(),
    source: "echocanva",
    metadata,
  };

  const images = getStoredImages();
  images.push(image);

  try {
    localStorage.setItem(IMPORTED_IMAGES_KEY, JSON.stringify(images));
  } catch (error) {
    console.error("Error storing image:", error);
  }

  return image;
}

/**
 * Get all stored imported images
 */
export function getStoredImages(): ImportedImage[] {
  try {
    const data = localStorage.getItem(IMPORTED_IMAGES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error retrieving images:", error);
    return [];
  }
}

/**
 * Get a specific imported image
 */
export function getStoredImage(id: string): ImportedImage | null {
  const images = getStoredImages();
  return images.find((img) => img.id === id) || null;
}

/**
 * Delete a stored image
 */
export function deleteStoredImage(id: string): boolean {
  try {
    const images = getStoredImages();
    const filtered = images.filter((img) => img.id !== id);
    localStorage.setItem(IMPORTED_IMAGES_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error("Error deleting image:", error);
    return false;
  }
}

/**
 * Convert canvas to data URL for import
 */
export function canvasToDataUrl(canvas: HTMLCanvasElement | null): string {
  if (!canvas) return "";
  return canvas.toDataURL("image/png");
}

/**
 * Create a layer from an imported image
 */
export function createLayerFromImage(image: ImportedImage): any {
  return {
    id: `layer_${Date.now()}`,
    name: `Imported: ${image.fileName}`,
    type: "image",
    imageUrl: image.dataUrl,
    width: image.width,
    height: image.height,
    opacity: 1,
    visible: true,
    blendMode: "normal",
    x: 0,
    y: 0,
    sourceImageId: image.id,
  };
}

/**
 * Export image for Cake Builder
 */
export interface ExportedImage {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  size: number; // File size in bytes
  format: "png" | "jpg" | "webp";
  exportedAt: string;
  quality?: number;
}

export async function exportImageForCakeBuilder(
  dataUrl: string,
  fileName: string = "cake-design.png",
): Promise<ExportedImage> {
  const image = new Image();
  image.src = dataUrl;

  return new Promise((resolve, reject) => {
    image.onload = () => {
      const width = image.width;
      const height = image.height;
      const aspectRatio = width / height;

      // Calculate approximate size
      const sizeApprox = Math.round((dataUrl.length * 3) / 4 / 1024); // KB

      resolve({
        id: `export_${Date.now()}`,
        dataUrl,
        width,
        height,
        aspectRatio,
        size: sizeApprox,
        format: fileName.endsWith(".jpg")
          ? "jpg"
          : fileName.endsWith(".webp")
            ? "webp"
            : "png",
        exportedAt: new Date().toISOString(),
      });
    };

    image.onerror = () => {
      reject(new Error("Failed to load image"));
    };
  });
}

/**
 * Get export history for images sent to Cake Builder
 */
interface ExportHistory {
  imageId: string;
  exportedAt: string;
  destination: "cake-builder";
  status: "success" | "failed";
}

const EXPORT_HISTORY_KEY = "echocanva_export_history";

export function addToExportHistory(
  imageId: string,
  status: "success" | "failed",
): void {
  const history: ExportHistory[] = getExportHistory();

  history.push({
    imageId,
    exportedAt: new Date().toISOString(),
    destination: "cake-builder",
    status,
  });

  // Keep only last 50 exports
  if (history.length > 50) {
    history.splice(0, history.length - 50);
  }

  try {
    localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Error saving export history:", error);
  }
}

export function getExportHistory(): ExportHistory[] {
  try {
    const data = localStorage.getItem(EXPORT_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error retrieving export history:", error);
    return [];
  }
}

/**
 * Create a bridge message for cross-window communication
 */
export interface BridgeMessage {
  type: "import-image" | "export-image" | "share-design";
  payload: any;
  timestamp: number;
  source: string;
}

export function createBridgeMessage(
  type: BridgeMessage["type"],
  payload: any,
): BridgeMessage {
  return {
    type,
    payload,
    timestamp: Date.now(),
    source: "echocanva",
  };
}

/**
 * Send image to Cake Builder window
 */
export function sendImageToCakeBuilder(
  image: ExportedImage,
  cakeBuilderWindow?: Window,
): boolean {
  if (!cakeBuilderWindow || cakeBuilderWindow.closed) {
    console.warn("Cake Builder window not available");
    return false;
  }

  const message = createBridgeMessage("import-image", {
    image,
    timestamp: Date.now(),
  });

  try {
    cakeBuilderWindow.postMessage(message, "*");
    addToExportHistory(image.id, "success");
    return true;
  } catch (error) {
    console.error("Error sending image:", error);
    addToExportHistory(image.id, "failed");
    return false;
  }
}

/**
 * Listen for incoming bridge messages
 */
export function listenForBridgeMessages(
  callback: (message: BridgeMessage) => void,
): () => void {
  const handler = (event: MessageEvent) => {
    const message = event.data as BridgeMessage;

    if (
      message.type === "import-image" ||
      message.type === "export-image" ||
      message.type === "share-design"
    ) {
      callback(message);
    }
  };

  window.addEventListener("message", handler);

  return () => {
    window.removeEventListener("message", handler);
  };
}

/**
 * Open Cake Builder with image parameter
 */
export function openCakeBuilderWithImage(
  image: ExportedImage,
  cakeBuilderUrl: string = "/cake-builder",
): Window | null {
  try {
    // Create URL with image parameter
    const url = new URL(cakeBuilderUrl, window.location.origin);
    url.searchParams.set("import-image-id", image.id);
    url.searchParams.set("source", "echocanva");

    // Open in new window
    const newWindow = window.open(
      url.toString(),
      "cake-builder",
      "width=1200,height=800",
    );

    if (newWindow) {
      addToExportHistory(image.id, "success");
    }

    return newWindow;
  } catch (error) {
    console.error("Error opening Cake Builder:", error);
    addToExportHistory(image.id, "failed");
    return null;
  }
}

/**
 * Import image from URL
 */
export async function importImageFromUrl(
  url: string,
  fileName?: string,
): Promise<ImportedImage | null> {
  try {
    const response = await fetch(url, {
      mode: "cors",
      headers: {
        "Content-Type": "image/*",
      },
    });

    const blob = await response.blob();
    const dataUrl = URL.createObjectURL(blob);

    const image = new Image();
    image.src = dataUrl;

    return new Promise((resolve) => {
      image.onload = () => {
        const imported = storeEchoCanvaImage(
          dataUrl,
          image.width,
          image.height,
          { source: url, fileName },
        );

        resolve(imported);
      };

      image.onerror = () => {
        resolve(null);
      };
    });
  } catch (error) {
    console.error("Error importing from URL:", error);
    return null;
  }
}
