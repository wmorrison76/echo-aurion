/** * Simplified PSD File Utilities * Handles basic PSD file structure for saving and loading projects */ export interface SimplePSDLayer {
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: string;
  imageData?: ImageData;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface SimplePSDFile {
  width: number;
  height: number;
  channels: number;
  depth: number;
  colorMode: number;
  layers: SimplePSDLayer[];
  imageData?: ImageData;
} // PSD File Signature
const PSD_SIGNATURE = 0x38425053; //"8BPS" // Export to simplified PSD format
export function createSimplePSD(
  canvas: HTMLCanvasElement,
  layers: any[],
  filename: string = "project.psd",
): Blob {
  const data = new ArrayBuffer(1024 * 1024); // 1MB buffer (simplified) const view = new DataView(data); let offset = 0; // Write signature view.setUint32(offset, PSD_SIGNATURE); offset += 4; // Write version (1) view.setUint16(offset, 1); offset += 2; // Write reserved bytes (6) for (let i = 0; i < 6; i++) { view.setUint8(offset++, 0); } // Write channels view.setUint16(offset, 3); // RGB offset += 2; // Write height view.setUint16(offset, canvas.height); offset += 2; // Write width view.setUint16(offset, canvas.width); offset += 2; // Write depth (8-bit) view.setUint16(offset, 8); offset += 2; // Write color mode (RGB = 3) view.setUint16(offset, 3); offset += 2; // Color mode data section length view.setUint32(offset, 0); offset += 4; // Image resources section length view.setUint32(offset, 0); offset += 4; // Layer and mask info const layersData = new Uint8Array(data, offset); let layersOffset = 0; // Number of layers view.setInt16(offset + layersOffset, layers.length); layersOffset += 2; // Write layer records (simplified) for (const layer of layers) { // Top view.setInt32(offset + layersOffset, 0); layersOffset += 4; // Left view.setInt32(offset + layersOffset, 0); layersOffset += 4; // Bottom view.setInt32(offset + layersOffset, canvas.height); layersOffset += 4; // Right view.setInt32(offset + layersOffset, canvas.width); layersOffset += 4; // Channels count view.setUint16(offset + layersOffset, 3); layersOffset += 2; // Channel data (simplified) layersOffset += 2; // skip channel info } // Image data section (simplified) const imageData = canvas .getContext("2d") ?.getImageData(0, 0, canvas.width, canvas.height); if (imageData) { const data = imageData.data; for ( let i = 0; i < Math.min(data.length, layersData.length - layersOffset); i++ ) { layersData[layersOffset + i] = data[i]; } } // Return only the used portion return new Blob( [data.slice(0, offset + layersOffset + (imageData?.data.length || 0))], { type:"image/psd", }, );
} // Export project state to JSON-based format (simpler alternative)
export function exportProjectAsJSON(
  canvas: HTMLCanvasElement,
  layers: any[],
  metadata: any = {},
): Blob {
  const projectData = {
    version: "1.0",
    format: "echocanva-project",
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    metadata,
    layers: layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      opacity: layer.opacity,
      locked: layer.locked,
      imageUrl: layer.imageUrl,
      mask: layer.mask ? { enabled: true } : undefined,
    })),
    imageDataURL: canvas.toDataURL("image/png"),
  };
  return new Blob([JSON.stringify(projectData, null, 2)], {
    type: "application/json",
  });
} // Import project from JSON
export async function importProjectFromJSON(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.format !== "echocanva-project") {
          throw new Error("Invalid project format");
        }
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
} // Export to PSD via download link
export function downloadAsPSD(
  canvas: HTMLCanvasElement,
  layers: any[],
  filename: string = "project.psd",
) {
  const psd = createSimplePSD(canvas, layers, filename);
  const url = URL.createObjectURL(psd);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
} // Export to EchoCanva project format (JSON-based)
export function downloadAsEchoCanvaProject(
  canvas: HTMLCanvasElement,
  layers: any[],
  filename: string = "project.echocanva",
) {
  const json = exportProjectAsJSON(canvas, layers, {
    createdAt: new Date().toISOString(),
    appVersion: "1.0",
  });
  const url = URL.createObjectURL(json);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
} // Detect if file is PSD
export function isPSDFile(file: File): boolean {
  return file.type === "image/psd" || file.name.endsWith(".psd");
} // Detect if file is EchoCanva project
export function isEchoCanvaProject(file: File): boolean {
  return file.name.endsWith(".echocanva") || file.type === "application/json";
}
